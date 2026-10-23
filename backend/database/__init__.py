"""Database package: exposes SQLite and MongoDB persistence helpers."""

import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from backend.config import settings
from backend.database.mongodb import get_mongo_db, get_users_collection, init_mongodb

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
	logger.info(
		"Database schema initialized successfully on %s.",
		_sanitize_db_url(settings.DATABASE_URL),
	)


async def get_db():
	async with AsyncSessionLocal() as session:
		try:
			yield session
		finally:
			await session.close()
