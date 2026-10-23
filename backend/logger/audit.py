import datetime
from pymongo import MongoClient
from backend.config import settings

# Simple audit logger that records user actions to a MongoDB collection 'audit_logs'.
# This logger is deliberately lightweight and does not depend on async SQLAlchemy.

client = MongoClient(settings.MONGODB_URI)
_audit_collection = client[settings.MONGODB_DB_NAME].audit_logs

def log_action(user_id: str, role: str, action: str, details: dict | None = None) -> None:
    """Record an audit event.

    Parameters
    ----------
    user_id: str
        The identifier of the user performing the action.
    role: str
        The user's role (ADMIN, PDS_OFFICER, SOC_ANALYST, BENEFICIARY).
    action: str
        A short string describing the action, e.g. "login", "create_user".
    details: dict | None
        Optional extra information about the action.
    """
    event = {
        "user_id": user_id,
        "role": role,
        "action": action,
        "timestamp": datetime.datetime.utcnow(),
        "details": details or {},
    }
    try:
        _audit_collection.insert_one(event)
    except Exception:
        # Silently ignore logging failures to avoid breaking main flow.
        pass
