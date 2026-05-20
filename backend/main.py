from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import aiohttp

from database import get_db, init_db, Holding, PriceHistory, Template, SessionLocal
from prices import fetch_prices, store_prices, get_latest_prices, get_price_history, calculate_value, fetch_historical_prices, store_historical_prices

app = FastAPI(title="Gold Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()


class HoldingCreate(BaseModel):
    name: str
    metal: str
    carat: Optional[str] = None
    weight_grams: float
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None


class HoldingUpdate(BaseModel):
    name: Optional[str] = None
    metal: Optional[str] = None
    carat: Optional[str] = None
    weight_grams: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None


async def refresh_prices():
    prices = await fetch_prices()
    if prices:
        store_prices(prices)


@app.on_event("startup")
async def startup():
    init_db()
    db = SessionLocal()
    try:
        gold_count = db.query(PriceHistory).filter(PriceHistory.metal == "gold").count()
    finally:
        db.close()
    if gold_count < 30:
        historical = await fetch_historical_prices(years=2)
        store_historical_prices(historical)
    await refresh_prices()
    scheduler.add_job(refresh_prices, "interval", hours=1)
    scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()


@app.get("/api/exchange-rates")
async def exchange_rates():
    symbols = "EUR,GBP,CHF,JPY,TRY,CAD,AED,AUD,CNY,SEK"
    url = f"https://api.frankfurter.dev/v1/latest?base=USD&symbols={symbols}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return {"USD": 1.0, **data.get("rates", {})}
    except Exception:
        pass
    return {"USD": 1.0}


@app.get("/api/prices")
async def current_prices(db: Session = Depends(get_db)):
    return get_latest_prices(db)


@app.get("/api/prices/history/{metal}")
async def price_history(metal: str, limit: int = 168, db: Session = Depends(get_db)):
    return get_price_history(db, metal, limit)


@app.post("/api/prices/refresh")
async def manual_refresh():
    prices = await fetch_prices()
    if prices:
        store_prices(prices)
        return {"status": "ok", "metals": list(prices.keys())}
    return {"status": "error", "detail": "Could not fetch prices"}


@app.get("/api/holdings")
def list_holdings(db: Session = Depends(get_db)):
    holdings = db.query(Holding).all()
    prices = get_latest_prices(db)

    result = []
    for h in holdings:
        price_data = prices.get(h.metal)
        current_value = None
        if price_data:
            current_value = calculate_value(h.weight_grams, h.metal, h.carat, price_data["price_usd_per_oz"])
        result.append({
            "id": h.id,
            "name": h.name,
            "metal": h.metal,
            "carat": h.carat,
            "weight_grams": h.weight_grams,
            "purchase_price": h.purchase_price,
            "purchase_date": h.purchase_date,
            "notes": h.notes,
            "created_at": h.created_at,
            "current_value_usd": current_value,
            "price_per_oz": price_data["price_usd_per_oz"] if price_data else None,
        })
    return result


@app.post("/api/holdings")
def create_holding(body: HoldingCreate, db: Session = Depends(get_db)):
    holding = Holding(**body.model_dump())
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@app.put("/api/holdings/{holding_id}")
def update_holding(holding_id: int, body: HoldingUpdate, db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(holding, field, value)
    db.commit()
    db.refresh(holding)
    return holding


@app.get("/api/templates")
def list_templates(db: Session = Depends(get_db)):
    return db.query(Template).order_by(Template.created_at.desc()).all()


@app.post("/api/templates")
def create_template(body: HoldingCreate, db: Session = Depends(get_db)):
    t = Template(name=body.name, metal=body.metal, carat=body.carat, weight_grams=body.weight_grams, notes=body.notes)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@app.delete("/api/templates/{tid}")
def delete_template(tid: int, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"status": "deleted"}


@app.delete("/api/holdings/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(holding)
    db.commit()
    return {"status": "deleted"}


@app.get("/api/portfolio/history")
def portfolio_history(db: Session = Depends(get_db)):
    from collections import defaultdict

    holdings = db.query(Holding).all()
    if not holdings:
        return []

    all_prices = db.query(PriceHistory).order_by(PriceHistory.timestamp).all()
    if not all_prices:
        return []

    # Group by date — keep last price per metal per day
    daily_prices: dict = defaultdict(dict)
    for row in all_prices:
        date_str = row.timestamp.strftime("%Y-%m-%d")
        daily_prices[date_str][row.metal] = row.price_usd_per_oz

    result = []
    last_prices: dict = {}
    started = False

    for date_str in sorted(daily_prices.keys()):
        last_prices.update(daily_prices[date_str])

        total = 0.0
        cost = 0.0
        for h in holdings:
            start = h.purchase_date or h.created_at.strftime("%Y-%m-%d")
            if date_str >= start:
                started = True
                if h.metal in last_prices:
                    total += calculate_value(h.weight_grams, h.metal, h.carat, last_prices[h.metal])
                if h.purchase_price:
                    cost += h.purchase_price

        if started:
            result.append({"timestamp": date_str, "value": round(total, 4), "cost_basis": round(cost, 4)})

    return result


@app.get("/api/portfolio/summary")
def portfolio_summary(db: Session = Depends(get_db)):
    holdings = db.query(Holding).all()
    prices = get_latest_prices(db)

    total_value = 0
    by_metal = {}
    total_purchase = 0

    for h in holdings:
        price_data = prices.get(h.metal)
        value = 0
        if price_data:
            value = calculate_value(h.weight_grams, h.metal, h.carat, price_data["price_usd_per_oz"])
            total_value += value

        if h.metal not in by_metal:
            by_metal[h.metal] = {"value": 0, "weight_grams": 0, "count": 0}
        by_metal[h.metal]["value"] += value
        by_metal[h.metal]["weight_grams"] += h.weight_grams
        by_metal[h.metal]["count"] += 1

        if h.purchase_price:
            total_purchase += h.purchase_price

    gain_loss = total_value - total_purchase if total_purchase else None

    return {
        "total_value_usd": total_value,
        "total_purchase_usd": total_purchase,
        "gain_loss_usd": gain_loss,
        "by_metal": by_metal,
        "prices": {k: v["price_usd_per_oz"] for k, v in prices.items()},
    }
