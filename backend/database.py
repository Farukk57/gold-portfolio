from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./data/portfolio.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    metal = Column(String, nullable=False)   # gold, silver, platinum, palladium
    carat = Column(String, nullable=True)    # 24k, 22k, 18k, 14k, 9k (gold only)
    weight_grams = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=True)
    purchase_date = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    metal = Column(String, nullable=False)
    carat = Column(String, nullable=True)
    weight_grams = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    metal = Column(String, nullable=False)
    price_usd_per_oz = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
