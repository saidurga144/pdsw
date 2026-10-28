import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from backend.database import Base


def _utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    PDS_OFFICER = "PDS_OFFICER"
    SOC_ANALYST = "SOC_ANALYST"
    BENEFICIARY = "BENEFICIARY"


class UserStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    jurisdiction = Column(String(255), nullable=True)
    wallet_address = Column(String(100), unique=True, index=True, nullable=True)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    permissions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)

    __table_args__ = (Index("idx_user_email_role", "email", "role"),)


class AuthNonce(Base):
    __tablename__ = "auth_nonces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=True, index=True)
    wallet_address = Column(String(100), nullable=False, index=True)
    nonce = Column(String(64), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_utc_now)


class DocumentAudit(Base):
    __tablename__ = "document_audits"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    wallet_address = Column(String(100), nullable=False, index=True)
    document_id = Column(String(100), nullable=False, index=True)
    ipfs_cid = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=False)
    tx_hash = Column(String(100), nullable=True)
    role = Column(String(50), nullable=False)
    status = Column(String(50), default="CONFIRMED_ON_CHAIN", nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utc_now)
