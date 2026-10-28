"""Ensures initial Administrator account exists without overwriting existing records."""

import datetime
import logging
import uuid

from backend.auth.security import get_password_hash
from backend.config import settings

logger = logging.getLogger("pdsw.bootstrap")


async def ensure_admin_initialized(
    email: str, password: str, name: str = "System Administrator"
):
    """
    Checks if an Admin account exists in MongoDB (or SQLite fallback).
    If yes, preserves existing record.
    If no, creates the initial Admin account once.
    """
    clean_email = email.strip().lower()

    users_col = None
    try:
        from backend.database.mongodb import get_users_collection

        users_col = get_users_collection()
    except RuntimeError:
        pass

    if users_col is not None:
        try:
            existing_admin = users_col.find_one({"role": "ADMIN"})
            if not existing_admin:
                existing_admin = users_col.find_one({"email": clean_email})

            admin_wallet = (
                settings.ADMIN_WALLET_ADDRESS.strip().lower()
                if settings.ADMIN_WALLET_ADDRESS
                else None
            )

            if existing_admin:
                if admin_wallet and not existing_admin.get("wallet_address"):
                    users_col.update_one(
                        {"_id": existing_admin["_id"]},
                        {"$set": {"wallet_address": admin_wallet}},
                    )
                    existing_admin["wallet_address"] = admin_wallet
                    logger.info(
                        "Admin wallet address bound to %s in MongoDB.", admin_wallet
                    )
                logger.info(
                    "Admin account (%s) already exists in MongoDB. Preserving existing record.",
                    existing_admin.get("email"),
                )
                return existing_admin

            new_admin_id = f"usr-adm-{uuid.uuid4().hex[:8]}"
            created_at_utc = (
                datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
            )
            admin_doc = {
                "_id": new_admin_id,
                "email": clean_email,
                "password_hash": get_password_hash(password),
                "role": "ADMIN",
                "full_name": name,
                "phone": None,
                "jurisdiction": "National Headquarters, New Delhi",
                "wallet_address": admin_wallet,
                "status": "ACTIVE",
                "created_at": created_at_utc,
                "last_login_at": None,
            }
            users_col.insert_one(admin_doc)
            logger.info(
                "First Administrator account initialized in MongoDB: %s", clean_email
            )
            return admin_doc

        except Exception as exc:
            logger.warning(
                "MongoDB admin bootstrap error; falling back to SQLite: %s", exc
            )

    from sqlalchemy.future import select
    from backend.database import AsyncSessionLocal
    from backend.models import User
    from backend.auth.user_store import insert_user, update_user, DuplicateUserError

    admin_wallet = (
        settings.ADMIN_WALLET_ADDRESS.strip().lower()
        if settings.ADMIN_WALLET_ADDRESS
        else None
    )

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where((User.role == "ADMIN") | (User.email == clean_email))
        )
        existing_sqlite_admin = result.scalars().first()
        if existing_sqlite_admin:
            if admin_wallet and not existing_sqlite_admin.wallet_address:
                await update_user(
                    db, existing_sqlite_admin.id, {"wallet_address": admin_wallet}
                )
                logger.info("Admin wallet address bound to %s in SQLite.", admin_wallet)
            logger.info(
                "Admin account (%s) already exists in SQLite. Preserving record.",
                existing_sqlite_admin.email,
            )
            return existing_sqlite_admin

        new_admin_id = f"usr-adm-{uuid.uuid4().hex[:8]}"
        created_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        admin_doc = {
            "_id": new_admin_id,
            "email": clean_email,
            "password_hash": get_password_hash(password),
            "role": "ADMIN",
            "full_name": name,
            "phone": None,
            "jurisdiction": "National Headquarters, New Delhi",
            "wallet_address": admin_wallet,
            "status": "ACTIVE",
            "created_at": created_at_utc,
            "last_login_at": None,
        }
        try:
            await insert_user(db, admin_doc)
            logger.info(
                "First Administrator account initialized in SQLite: %s", clean_email
            )
        except DuplicateUserError:
            logger.info(
                "Admin account (%s) already exists in SQLite. Preserved.", clean_email
            )

    return admin_doc
