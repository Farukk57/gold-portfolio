from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./data/portfolio.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    metal = Column(String, nullable=False)
    carat = Column(String, nullable=True)
    weight_grams = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=True)
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
