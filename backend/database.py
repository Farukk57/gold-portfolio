from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, text, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./data/portfolio.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def set_sqlite_pragmas(dbapi_connection, _):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    metal = Column(String, nullable=False)
    carat = Column(String, nullable=True)
    weight_grams = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=True)        # always USD, used for P&L
    purchase_price_local = Column(Float, nullable=True)  # original entered amount
    purchase_currency = Column(String(3), nullable=True) # currency of purchase_price_local
    purchase_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    receipt_filename = Column(String, nullable=True)  # legacy single-receipt field
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, nullable=False, index=True)
    filename = Column(String, nullable=False)       # stored filename on disk
    original_name = Column(String, nullable=True)  # original upload filename
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    metal = Column(String, nullable=False)
    carat = Column(String, nullable=True)
    weight_grams = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    metal = Column(String, nullable=False)
    price_usd_per_oz = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        # Add legacy column if missing
        try:
            conn.execute(text("ALTER TABLE holdings ADD COLUMN receipt_filename VARCHAR"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE holdings ADD COLUMN purchase_price_local REAL"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE holdings ADD COLUMN purchase_currency VARCHAR(3)"))
            conn.commit()
        except Exception:
            pass
        # Clear any USD backfill so legacy rows fall back to display-currency conversion.
        # Legacy purchase_price is stored in USD; new entries with a real purchase_currency
        # will have a non-USD (or intentionally USD) value written by the frontend.
        try:
            conn.execute(text(
                "UPDATE holdings SET purchase_price_local = NULL, purchase_currency = NULL "
                "WHERE purchase_currency = 'USD'"
            ))
            conn.commit()
        except Exception:
            pass
        # Migrate old single receipt_filename entries into the receipts table
        try:
            rows = conn.execute(text(
                "SELECT h.id, h.receipt_filename FROM holdings h "
                "LEFT JOIN receipts r ON r.holding_id = h.id "
                "WHERE h.receipt_filename IS NOT NULL AND r.id IS NULL"
            )).fetchall()
            for row in rows:
                conn.execute(text(
                    "INSERT INTO receipts (holding_id, filename, original_name) VALUES (:hid, :fn, :fn)"
                ), {"hid": row[0], "fn": row[1]})
            if rows:
                conn.commit()
        except Exception:
            pass
