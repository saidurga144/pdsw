import datetime
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("pdsw.audit")


def _get_audit_collection():
    try:
        from backend.database.mongodb import get_mongo_db

        return get_mongo_db()["audit_logs"]
    except Exception:
        return None


def log_action(
    user_id: str, role: str, action: str, details: Optional[Dict[str, Any]] = None
) -> None:
    """Record an audit event to the audit_logs collection."""
    event = {
        "user_id": user_id,
        "role": role,
        "action": action,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "details": details or {},
    }
    try:
        collection = _get_audit_collection()
        if collection is not None:
            collection.insert_one(event)
    except Exception as exc:
        logger.debug("Failed to record audit event: %s", exc)
