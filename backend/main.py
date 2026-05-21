from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import Literal, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import aiohttp
import os
import re
import uuid

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf'}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

from database import get_db, init_db, Holding, Receipt, PriceHistory, Template, SessionLocal
from prices import fetch_prices, store_prices, get_latest_prices, get_price_history, calculate_value, fetch_historical_prices, store_historical_prices

RECEIPTS_DIR = "/app/data/receipts"

scheduler = AsyncIOScheduler()


class HoldingCreate(BaseModel):
    name: str
    metal: Literal['gold', 'silver', 'platinum', 'palladium']
    carat: Optional[str] = None
    weight_grams: float
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('purchase_date')
    @classmethod
    def validate_date(cls, v):
        if v and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v):
            raise ValueError('purchase_date must be YYYY-MM-DD')
        return v


class HoldingUpdate(BaseModel):
    name: Optional[str] = None
    metal: Optional[Literal['gold', 'silver', 'platinum', 'palladium']] = None
    carat: Optional[str] = None
    weight_grams: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('purchase_date')
    @classmethod
    def validate_date(cls, v):
        if v and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v):
            raise ValueError('purchase_date must be YYYY-MM-DD')
        return v


async def refresh_prices():
    prices = await fetch_prices()
    if prices:
        store_prices(prices)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(RECEIPTS_DIR, exist_ok=True)
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
    yield
    scheduler.shutdown()


app = FastAPI(title="Gold Portfolio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    # Batch-load all receipts
    all_receipts = db.query(Receipt).all()
    receipts_by_holding: dict = {}
    for r in all_receipts:
        receipts_by_holding.setdefault(r.holding_id, []).append(r)

    result = []
    for h in holdings:
        price_data = prices.get(h.metal)
        current_value = None
        if price_data:
            current_value = calculate_value(h.weight_grams, h.metal, h.carat, price_data["price_usd_per_oz"])
        holding_receipts = receipts_by_holding.get(h.id, [])
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
            "receipts": [{"id": r.id, "filename": r.filename, "original_name": r.original_name} for r in holding_receipts],
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


@app.delete("/api/holdings/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Not found")
    # Delete all receipt files
    for r in db.query(Receipt).filter(Receipt.holding_id == holding_id).all():
        path = os.path.join(RECEIPTS_DIR, r.filename)
        if os.path.exists(path):
            os.remove(path)
        db.delete(r)
    # Delete legacy single receipt if any
    if holding.receipt_filename:
        path = os.path.join(RECEIPTS_DIR, holding.receipt_filename)
        if os.path.exists(path):
            os.remove(path)
    db.delete(holding)
    db.commit()
    return {"status": "deleted"}


# ── Receipt endpoints ────────────────────────────────────

@app.get("/api/holdings/{holding_id}/receipts")
def list_receipts(holding_id: int, db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Not found")
    receipts = db.query(Receipt).filter(Receipt.holding_id == holding_id).all()
    return [{"id": r.id, "filename": r.filename, "original_name": r.original_name} for r in receipts]


@app.post("/api/holdings/{holding_id}/receipts")
async def upload_receipt(holding_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Not found")
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed. Accepted: images and PDF.")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
    stored_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(RECEIPTS_DIR, stored_name)
    await asyncio.to_thread(_write_file, path, contents)
    receipt = Receipt(holding_id=holding_id, filename=stored_name, original_name=file.filename)
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return {"id": receipt.id, "filename": receipt.filename, "original_name": receipt.original_name}


def _write_file(path: str, contents: bytes) -> None:
    with open(path, "wb") as f:
        f.write(contents)


@app.get("/api/receipts/{receipt_id}/file")
def get_receipt_file(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Not found")
    path = os.path.join(RECEIPTS_DIR, receipt.filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=receipt.original_name)


@app.delete("/api/receipts/{receipt_id}")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Not found")
    path = os.path.join(RECEIPTS_DIR, receipt.filename)
    if os.path.exists(path):
        os.remove(path)
    db.delete(receipt)
    db.commit()
    return {"status": "deleted"}


# ── Templates ────────────────────────────────────────────

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


# ── Portfolio ─────────────────────────────────────────────

@app.get("/api/portfolio/history")
def portfolio_history(db: Session = Depends(get_db)):
    from collections import defaultdict

    holdings = db.query(Holding).all()
    if not holdings:
        return []

    from datetime import datetime, timedelta
    cutoff = datetime.now() - timedelta(days=730)
    all_prices = db.query(PriceHistory).filter(PriceHistory.timestamp >= cutoff).order_by(PriceHistory.timestamp).all()
    if not all_prices:
        return []

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


_CURRENCY_SYMBOLS = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "TRY": "₺",
    "CHF": "Fr.", "CAD": "C$", "AED": "AED ", "AUD": "A$", "CNY": "¥", "SEK": "kr ",
}


async def _get_rate(currency: str) -> float:
    if currency == "USD":
        return 1.0
    url = f"https://api.frankfurter.dev/v1/latest?base=USD&symbols={currency}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return float(data.get("rates", {}).get(currency, 1.0))
    except Exception:
        pass
    return 1.0


def _fmt_currency(value: float, symbol: str, decimals: int = 2) -> str:
    abs_val = abs(value)
    formatted = f"{abs_val:,.{decimals}f}"
    if value < 0:
        return f"-{symbol}{formatted}"
    return f"{symbol}{formatted}"


@app.get("/api/homepage")
async def homepage_widget(currency: str = "USD", db: Session = Depends(get_db)):
    holdings = db.query(Holding).all()
    prices = get_latest_prices(db)

    total_value = 0.0
    total_purchase = 0.0
    for h in holdings:
        price_data = prices.get(h.metal)
        if price_data:
            total_value += calculate_value(h.weight_grams, h.metal, h.carat, price_data["price_usd_per_oz"])
        if h.purchase_price:
            total_purchase += h.purchase_price

    gain_loss = total_value - total_purchase if total_purchase else 0.0
    gain_loss_pct = round(gain_loss / total_purchase * 100, 2) if total_purchase else 0.0
    gold_price = prices.get("gold", {}).get("price_usd_per_oz", 0.0)

    curr = currency.upper()
    rate = await _get_rate(curr)
    symbol = _CURRENCY_SYMBOLS.get(curr, curr + " ")
    decimals = 0 if curr == "JPY" else 2

    return {
        "value": _fmt_currency(total_value * rate, symbol, decimals),
        "gain_loss": ("+" if gain_loss >= 0 else "") + _fmt_currency(gain_loss * rate, symbol, decimals),
        "gain_loss_pct": f"{gain_loss_pct:+.2f}%",
        "gold_oz": _fmt_currency(gold_price * rate, symbol, decimals),
        "holdings": len(holdings),
    }


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
