import os
import re
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config import settings

logger = logging.getLogger("pdsw.database")

Base = declarative_base()

def _sanitize_db_url(url: str) -> str:
    """Masks database credentials for safe logging without exposing passwords."""
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', url)

def _create_engine_and_maker(url: str):
    engine_kwargs = {
        "echo": False,
        "future": True,
    }
    if "sqlite" in url:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
        
    eng = create_async_engine(url, **engine_kwargs)
    maker = async_sessionmaker(
        bind=eng,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return eng, maker

engine, AsyncSessionLocal = _create_engine_and_maker(settings.DATABASE_URL)
active_db_type = "SQLite"

async def init_db():
    """Initializes local SQLite database schema."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"Database schema initialized successfully on {_sanitize_db_url(settings.DATABASE_URL)}.")

async def get_db():
    import backend.database as current_db
    async with current_db.AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
