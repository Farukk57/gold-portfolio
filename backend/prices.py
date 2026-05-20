import aiohttp
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from database import PriceHistory, SessionLocal

YAHOO_SYMBOLS = {
    "GC=F": "gold",
    "SI=F": "silver",
    "PL=F": "platinum",
    "PA=F": "palladium",
}

CARAT_PURITY = {
    "24k": 1.0,
    "22k": 0.9167,
    "21k": 0.875,
    "18k": 0.75,
    "14k": 0.5833,
    "9k": 0.375,
}

TROY_OZ_TO_GRAM = 31.1035

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; GoldPortfolio/1.0)"}


async def _fetch_symbol(session: aiohttp.ClientSession, symbol: str) -> float | None:
    encoded = symbol.replace("=", "%3D")
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{encoded}?interval=1d&range=1d"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), headers=HEADERS) as resp:
            if resp.status == 200:
                data = await resp.json()
                return float(data["chart"]["result"][0]["meta"]["regularMarketPrice"])
    except Exception:
        pass
    return None


async def fetch_historical_prices(years: int = 2) -> dict[str, list]:
    range_str = f"{years}y"
    result = {}
    async with aiohttp.ClientSession() as session:
        for symbol, metal in YAHOO_SYMBOLS.items():
            encoded = symbol.replace("=", "%3D")
            url = f"https://query2.finance.yahoo.com/v8/finance/chart/{encoded}?interval=1d&range={range_str}"
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=20), headers=HEADERS) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        chart = data["chart"]["result"][0]
                        timestamps = chart["timestamp"]
                        closes = chart["indicators"]["quote"][0]["close"]
                        points = [(datetime.utcfromtimestamp(ts), float(price)) for ts, price in zip(timestamps, closes) if price is not None]
                        result[metal] = points
            except Exception:
                pass
    return result


def store_historical_prices(historical: dict):
    db: Session = SessionLocal()
    try:
        for metal, points in historical.items():
            existing_dates = {r.timestamp.date() for r in db.query(PriceHistory).filter(PriceHistory.metal == metal).all()}
            for dt, price in points:
                if dt.date() not in existing_dates:
                    db.add(PriceHistory(metal=metal, price_usd_per_oz=price, timestamp=dt))
        db.commit()
    finally:
        db.close()


async def fetch_prices() -> dict:
    prices = {}
    async with aiohttp.ClientSession() as session:
        tasks = {symbol: _fetch_symbol(session, symbol) for symbol in YAHOO_SYMBOLS}
        for symbol, coro in tasks.items():
            price = await coro
            if price is not None:
                prices[YAHOO_SYMBOLS[symbol]] = price
    return prices


def store_prices(prices: dict):
    db: Session = SessionLocal()
    try:
        for metal, price in prices.items():
            entry = PriceHistory(metal=metal, price_usd_per_oz=price)
            db.add(entry)
        db.commit()
    finally:
        db.close()


def get_latest_prices(db: Session) -> dict:
    result = {}
    for metal in ["gold", "silver", "platinum", "palladium"]:
        row = (
            db.query(PriceHistory)
            .filter(PriceHistory.metal == metal)
            .order_by(PriceHistory.timestamp.desc())
            .first()
        )
        if row:
            result[metal] = {"price_usd_per_oz": row.price_usd_per_oz, "timestamp": row.timestamp}
    return result


def get_price_history(db: Session, metal: str, limit: int = 168) -> list:
    rows = (
        db.query(PriceHistory)
        .filter(PriceHistory.metal == metal)
        .order_by(PriceHistory.timestamp.asc())
        .all()
    )
    # Downsample to at most `limit` points
    if len(rows) > limit:
        step = len(rows) // limit
        rows = rows[::step]
    return [{"timestamp": r.timestamp.isoformat(), "price": r.price_usd_per_oz} for r in rows]


def calculate_value(weight_grams: float, metal: str, carat: str | None, price_usd_per_oz: float) -> float:
    purity = CARAT_PURITY.get(carat, 1.0) if carat else 1.0
    price_per_gram = price_usd_per_oz / TROY_OZ_TO_GRAM
    return weight_grams * purity * price_per_gram
