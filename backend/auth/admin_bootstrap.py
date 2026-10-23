"""
backend/auth/admin_bootstrap.py
--------------------------------
Ensures that the initial Administrator account exists in the database.
If an Administrator already exists, this function does NOTHING.
It will NEVER overwrite, recreate, or reset an existing Admin account.
"""

import uuid
import datetime
import logging

from backend.config import settings
from backend.auth.security import get_password_hash

logger = logging.getLogger("pdsw.bootstrap")


async def ensure_admin_initialized(email: str, password: str, name: str = "System Administrator"):
    """
    Checks if an Admin account exists in MongoDB (or SQLite fallback).
    If yes -> does nothing.
    If no  -> creates the Admin account ONCE.
    Never overwrites an existing account.
    """
    clean_email = email.strip().lower()

    # ── 1. Try MongoDB first (primary store) ────────────────────────────────
    users_col = None
    try:
        from backend.database.mongodb import get_users_collection
        users_col = get_users_collection()
    except RuntimeError:
        pass

    if users_col is not None:
        try:
            # Check if ANY admin role exists
            existing_admin = users_col.find_one({"role": "ADMIN"})
            if not existing_admin:
                # Also check by email in case role was stored differently
                existing_admin = users_col.find_one({"email": clean_email})

            admin_wallet = settings.ADMIN_WALLET_ADDRESS.strip().lower() if settings.ADMIN_WALLET_ADDRESS else None

            if existing_admin:
                if admin_wallet and not existing_admin.get("wallet_address"):
                    users_col.update_one({"_id": existing_admin["_id"]}, {"$set": {"wallet_address": admin_wallet}})
                    existing_admin["wallet_address"] = admin_wallet
                    logger.info("Admin wallet address bound to %s in MongoDB.", admin_wallet)
                logger.info(
                    "Admin account (%s) already exists in MongoDB. Preserving existing record.",
                    existing_admin.get("email"),
                )
                return existing_admin

            # No admin found — create one directly in MongoDB via sync PyMongo call
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
            users_col.insert_one(admin_doc)
            logger.info("First Administrator account initialized in MongoDB: %s", clean_email)
            return admin_doc

        except Exception as exc:
            logger.warning(
                "MongoDB admin bootstrap error; falling back to SQLite: %s", exc
            )

    # ── 2. SQLite fallback (only if MongoDB unavailable) ────────────────────
    from sqlalchemy.future import select
    from backend.database import AsyncSessionLocal
    from backend.models import User
    from backend.auth.user_store import insert_user, update_user, DuplicateUserError

    admin_wallet = settings.ADMIN_WALLET_ADDRESS.strip().lower() if settings.ADMIN_WALLET_ADDRESS else None

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where((User.role == "ADMIN") | (User.email == clean_email))  # type: ignore[attr-defined]
        )
        existing_sqlite_admin = result.scalars().first()
        if existing_sqlite_admin:
            if admin_wallet and not existing_sqlite_admin.wallet_address:
                await update_user(db, existing_sqlite_admin.id, {"wallet_address": admin_wallet})
                logger.info("Admin wallet address bound to %s in SQLite.", admin_wallet)
            logger.info(
                "Admin account (%s) already exists in SQLite. Preserving record.",
                existing_sqlite_admin.email,
            )
            return existing_sqlite_admin

        # Create admin in SQLite
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
                "Admin account (%s) already exists in SQLite (duplicate catch). Preserved.",
                clean_email,
            )

    return admin_doc
