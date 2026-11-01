"""Database package: exposes SQLite and MongoDB persistence helpers."""

import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import inspect
from sqlalchemy.orm import declarative_base

from backend.config import settings

logger = logging.getLogger("pdsw.database")

Base = declarative_base()


def _sanitize_db_url(url: str) -> str:
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", url)


def _create_engine_and_maker(url: str):
    engine_kwargs = {
        "echo": False,
        "future": True,
    }
    if "sqlite" in url:
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    engine = create_async_engine(url, **engine_kwargs)
    session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return engine, session_maker


engine, AsyncSessionLocal = _create_engine_and_maker(settings.DATABASE_URL)
active_db_type = "SQLite"


async def init_db():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_ensure_beneficiary_assignment_schema)
    logger.info(
        "Database schema initialized successfully on %s.",
        _sanitize_db_url(settings.DATABASE_URL),
    )


def _ensure_beneficiary_assignment_schema(connection):
    """Add the officer mapping to pre-existing user tables without data loss."""
    inspector = inspect(connection)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "assigned_pds_officer_id" not in columns:
        connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN assigned_pds_officer_id VARCHAR(64)"
        )
    connection.exec_driver_sql(
        "CREATE INDEX IF NOT EXISTS idx_users_assigned_pds_officer_id "
        "ON users (assigned_pds_officer_id)"
    )


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
