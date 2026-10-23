"""User account persistence helpers.

MongoDB is the primary account store. For local development, if MongoDB cannot
be initialised because Atlas/network access is unavailable, the backend falls
back to the existing SQLite users table so login/register flows remain usable.
"""

import datetime
import logging
from typing import Any, Optional

from pymongo.errors import DuplicateKeyError, PyMongoError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.mongodb import get_users_collection
from backend.models import User

logger = logging.getLogger("pdsw.user_store")


class DuplicateUserError(Exception):
    """Raised when a unique user constraint is violated."""


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def _mongo_collection_or_none():
    try:
        return get_users_collection()
    except RuntimeError:
        return None


def get_user_store_label() -> str:
    return "mongodb" if _mongo_collection_or_none() is not None else "sqlite"


def _sqlite_user_to_doc(user: Optional[User]) -> Optional[dict[str, Any]]:
    if user is None:
        return None

    role = user.role.value if hasattr(user.role, "value") else user.role
    status = user.status.value if hasattr(user.status, "value") else user.status

    return {
        "_id": user.id,
        "email": user.email,
        "password_hash": user.password_hash,
        "role": role,
        "full_name": user.full_name,
        "phone": user.phone,
        "jurisdiction": user.jurisdiction,
        "wallet_address": user.wallet_address,
        "status": status,
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
        "updated_at": user.updated_at.isoformat() + "Z" if user.updated_at else None,
    }


async def find_user_by_email(db: AsyncSession, email: str) -> Optional[dict[str, Any]]:
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            return users_col.find_one({"email": email})
        except PyMongoError as exc:
            logger.warning("MongoDB lookup by email failed; falling back to SQLite: %s", exc)

    result = await db.execute(select(User).where(User.email == email))
    return _sqlite_user_to_doc(result.scalars().first())


async def find_user_by_id(db: AsyncSession, user_id: str) -> Optional[dict[str, Any]]:
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            return users_col.find_one({"_id": user_id})
        except PyMongoError as exc:
            logger.warning("MongoDB lookup by id failed; falling back to SQLite: %s", exc)

    result = await db.execute(select(User).where(User.id == user_id))
    return _sqlite_user_to_doc(result.scalars().first())


async def find_user_by_wallet(
    db: AsyncSession,
    wallet_address: str,
    exclude_user_id: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            query: dict[str, Any] = {"wallet_address": wallet_address}
            if exclude_user_id:
                query["_id"] = {"$ne": exclude_user_id}
            return users_col.find_one(query, {"email": 1})
        except PyMongoError as exc:
            logger.warning("MongoDB lookup by wallet failed; falling back to SQLite: %s", exc)

    query = select(User).where(User.wallet_address == wallet_address)
    if exclude_user_id:
        query = query.where(User.id != exclude_user_id)
    result = await db.execute(query)
    return _sqlite_user_to_doc(result.scalars().first())


async def insert_user(db: AsyncSession, user_doc: dict[str, Any]) -> None:
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            users_col.insert_one(dict(user_doc))
            logger.info("User inserted into MongoDB auth store – email: %s", user_doc.get("email"))
            return
        except DuplicateKeyError as exc:
            raise DuplicateUserError("User already exists.") from exc
        except PyMongoError as exc:
            logger.error("MongoDB insert failed; refusing SQLite fallback to avoid split-brain: %s", exc)
            raise DuplicateUserError(
                f"Failed to persist user account in MongoDB: {exc}"
            ) from exc

    sqlite_user = User(
        id=user_doc["_id"],
        email=user_doc["email"],
        password_hash=user_doc["password_hash"],
        role=user_doc["role"],
        full_name=user_doc.get("full_name", ""),
        phone=user_doc.get("phone"),
        jurisdiction=user_doc.get("jurisdiction"),
        wallet_address=user_doc.get("wallet_address"),
        status=user_doc.get("status", "ACTIVE"),
        created_at=_utc_now(),
        updated_at=_utc_now(),
    )
    db.add(sqlite_user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise DuplicateUserError("User already exists.") from exc


async def update_user(db: AsyncSession, user_id: str, updates: dict[str, Any]) -> None:
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            users_col.update_one({"_id": user_id}, {"$set": updates})
            return
        except DuplicateKeyError as exc:
            raise DuplicateUserError("User update violates a unique constraint.") from exc
        except PyMongoError as exc:
            logger.warning("MongoDB update failed; falling back to SQLite: %s", exc)

    result = await db.execute(select(User).where(User.id == user_id))
    sqlite_user = result.scalars().first()
    if sqlite_user is None:
        return

    for key, value in updates.items():
        if key in {"email", "password_hash", "role", "full_name", "phone", "jurisdiction", "wallet_address", "status"}:
            setattr(sqlite_user, key, value)
    sqlite_user.updated_at = _utc_now()

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise DuplicateUserError("User update violates a unique constraint.") from exc


async def set_user_status(db: AsyncSession, user_id: str, account_status: str) -> bool:
    """Updates only the persistent account status while preserving all account data."""
    normalized_status = account_status.strip().upper()
    if normalized_status not in {"ACTIVE", "INACTIVE", "SUSPENDED"}:
        raise ValueError(f"Unsupported account status: {account_status}")

    users_col = _mongo_collection_or_none()
    updated = False
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    timestamp_key = "activated_at" if normalized_status == "ACTIVE" else "deactivated_at"
    if users_col is not None:
        try:
            res = users_col.update_one(
                {"_id": user_id},
                {"$set": {"status": normalized_status, timestamp_key: now_iso, "updated_at": now_iso}}
            )
            if res.matched_count > 0:
                updated = True
                logger.info("User %s status set to %s in MongoDB.", user_id, normalized_status)
        except PyMongoError as exc:
            logger.warning("MongoDB status update failed: %s", exc)

    result = await db.execute(select(User).where(User.id == user_id))
    sqlite_user = result.scalars().first()
    if sqlite_user:
        sqlite_user.status = normalized_status
        sqlite_user.updated_at = _utc_now()
        await db.commit()
        updated = True
        logger.info("User %s status set to %s in SQLite.", user_id, normalized_status)

    return updated


async def deactivate_user(db: AsyncSession, user_id: str) -> bool:
    """Deactivates a user account without deleting or modifying account data."""
    return await set_user_status(db, user_id, "INACTIVE")


async def activate_user(db: AsyncSession, user_id: str) -> bool:
    """Reactivates the same user account without recreating it."""
    return await set_user_status(db, user_id, "ACTIVE")


async def hard_delete_user(db: AsyncSession, user_id: str) -> bool:
    """Permanently deletes a user from MongoDB and SQLite."""
    users_col = _mongo_collection_or_none()
    deleted = False
    if users_col is not None:
        try:
            res = users_col.delete_one({"_id": user_id})
            if res.deleted_count > 0:
                deleted = True
                logger.info("User %s hard-deleted from MongoDB.", user_id)
        except PyMongoError as exc:
            logger.warning("MongoDB hard delete user failed: %s", exc)

    result = await db.execute(select(User).where(User.id == user_id))
    sqlite_user = result.scalars().first()
    if sqlite_user:
        await db.delete(sqlite_user)
        await db.commit()
        deleted = True
        logger.info("User %s hard-deleted from SQLite.", user_id)

    return deleted


_MEMORY_RESET_TOKENS: dict[str, dict[str, Any]] = {}


async def create_password_reset_token(db: AsyncSession, user_id: str, email: str) -> str:
    """Generates a secure single-use password reset token valid for 15 minutes."""
    import secrets
    token = secrets.token_urlsafe(32)
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(minutes=15)
    record = {
        "token": token,
        "user_id": user_id,
        "email": email.strip().lower(),
        "created_at": now.isoformat() + "Z",
        "expires_at": expires_at.isoformat() + "Z",
        "used": False,
    }
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            db_mongo = users_col.database
            db_mongo["password_resets"].insert_one(dict(record))
        except Exception as exc:
            logger.warning("Failed to persist reset token in MongoDB: %s", exc)

    _MEMORY_RESET_TOKENS[token] = record
    return token


async def verify_and_burn_password_reset_token(db: AsyncSession, token: str) -> Optional[dict[str, Any]]:
    """Validates and burns a one-time password reset token."""
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    users_col = _mongo_collection_or_none()
    if users_col is not None:
        try:
            db_mongo = users_col.database
            doc = db_mongo["password_resets"].find_one({"token": token, "used": False})
            if doc:
                exp_str = doc.get("expires_at", "")
                if exp_str:
                    exp = datetime.datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                    if exp > now_utc:
                        db_mongo["password_resets"].update_one({"_id": doc["_id"]}, {"$set": {"used": True}})
                        return doc
                return None
        except Exception as exc:
            logger.warning("Mongo reset token lookup failed: %s", exc)

    mem_doc = _MEMORY_RESET_TOKENS.get(token)
    if mem_doc and not mem_doc.get("used"):
        exp_str = mem_doc.get("expires_at", "")
        if exp_str:
            exp = datetime.datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
            if exp > now_utc:
                mem_doc["used"] = True
                return mem_doc

    return None
