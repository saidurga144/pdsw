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
    Float,
    String,
    Text,
    UniqueConstraint,
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
    assigned_pds_officer_id = Column(String(64), nullable=True)
    ration_card_number = Column(String(100), nullable=True, unique=True, index=True)
    card_category = Column(String(20), nullable=True)
    address_data = Column(JSON, nullable=True)
    monthly_income = Column(Integer, nullable=True)
    verification_status = Column(String(30), nullable=True)
    wallet_address = Column(String(100), unique=True, index=True, nullable=True)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    permissions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)

    __table_args__ = (
        Index("idx_user_email_role", "email", "role"),
        Index("idx_users_assigned_pds_officer_id", "assigned_pds_officer_id"),
    )


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


class ChangeRequestRecord(Base):
    """Persisted beneficiary requests and their IPFS document references."""

    __tablename__ = "change_requests"

    id = Column(String(64), primary_key=True, index=True)
    beneficiary_id = Column(String(64), nullable=False, index=True)
    beneficiary_name = Column(String(255), nullable=False)
    beneficiary_email = Column(String(255), nullable=False, default="")
    ration_card_id = Column(String(100), nullable=False, default="")
    jurisdiction = Column(String(255), nullable=False, default="")
    request_type = Column(String(80), nullable=False)
    previous_data = Column(JSON, nullable=False, default=dict)
    requested_data = Column(JSON, nullable=False, default=dict)
    reason = Column(Text, nullable=False)
    supporting_documents = Column(JSON, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="SUBMITTED", index=True)
    submitted_at = Column(DateTime, nullable=False, default=_utc_now, index=True)
    review_notes = Column(Text, nullable=False, default="")
    reviewed_by = Column(String(64), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)


class FamilyMemberRecord(Base):
    """Verified family members; unapproved changes remain in change_requests."""

    __tablename__ = "family_members"

    id = Column(String(64), primary_key=True, index=True)
    beneficiary_id = Column(String(64), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    relationship = Column(String(40), nullable=False)
    date_of_birth = Column(String(10), nullable=True)
    gender = Column(String(20), nullable=True)
    identity_last_four = Column(String(4), nullable=True)
    status = Column(String(20), nullable=False, default="VERIFIED")
    added_at = Column(DateTime, nullable=False, default=_utc_now)


class EntitlementRuleRecord(Base):
    """Admin-configured monthly entitlement rules by ration category."""

    __tablename__ = "entitlement_rules"
    __table_args__ = (UniqueConstraint("category", "commodity", name="uq_entitlement_category_commodity"),)

    id = Column(String(64), primary_key=True)
    category = Column(String(20), nullable=False, index=True)
    commodity = Column(String(120), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    price_per_unit = Column(Float, nullable=False, default=0)


class CommodityStockRecord(Base):
    """Actual commodity stock managed by authorized administrators."""

    __tablename__ = "commodity_stock"
    __table_args__ = (UniqueConstraint("fps_shop_id", "commodity", name="uq_stock_shop_commodity"),)

    id = Column(String(64), primary_key=True)
    fps_shop_id = Column(String(100), nullable=False, index=True)
    commodity = Column(String(120), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    unit = Column(String(20), nullable=False)
    updated_at = Column(DateTime, nullable=False, default=_utc_now, onupdate=_utc_now)


class DistributionRecord(Base):
    """Persisted completed commodity releases; receipt metadata is derived from this row."""

    __tablename__ = "distributions"

    id = Column(String(64), primary_key=True, index=True)
    idempotency_key = Column(String(100), nullable=False, unique=True, index=True)
    transaction_code = Column(String(100), nullable=False, unique=True, index=True)
    beneficiary_id = Column(String(64), nullable=False, index=True)
    officer_id = Column(String(64), nullable=False, index=True)
    ration_card_number = Column(String(100), nullable=False, default="")
    fps_shop_id = Column(String(100), nullable=False)
    commodities = Column(JSON, nullable=False, default=list)
    total_cost = Column(Float, nullable=False, default=0)
    auth_mode = Column(String(50), nullable=False)
    state_hash = Column(String(64), nullable=False)
    status = Column(String(30), nullable=False, default="COMPLETED", index=True)
    distributed_at = Column(DateTime, nullable=False, default=_utc_now, index=True)


class PortalNotificationRecord(Base):
    """Persistent per-account notification inbox."""

    __tablename__ = "portal_notifications"

    id = Column(String(64), primary_key=True, index=True)
    recipient_user_id = Column(String(64), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, default="INFO")
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, nullable=False, default=_utc_now, index=True)


class SystemSettingRecord(Base):
    """Persisted non-secret platform settings managed by administrators."""

    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_by = Column(String(64), nullable=False)
    updated_at = Column(DateTime, nullable=False, default=_utc_now, onupdate=_utc_now)


class RiskAlertRecord(Base):
    """Persisted alerts created from actual application events or reviews."""

    __tablename__ = "risk_alerts"

    id = Column(String(64), primary_key=True, index=True)
    severity = Column(String(20), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    beneficiary_id = Column(String(64), nullable=True, index=True)
    source_type = Column(String(50), nullable=False)
    source_id = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="OPEN", index=True)
    acknowledged_by = Column(String(64), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_utc_now, index=True)


class VerificationRecord(Base):
    """Review history for beneficiary account verification decisions."""

    __tablename__ = "beneficiary_verifications"

    id = Column(String(64), primary_key=True, index=True)
    beneficiary_id = Column(String(64), nullable=False, index=True)
    officer_id = Column(String(64), nullable=False, index=True)
    status = Column(String(30), nullable=False)
    comments = Column(Text, nullable=False)
    reviewed_at = Column(DateTime, nullable=False, default=_utc_now, index=True)


class GrievanceRecord(Base):
    """Persisted citizen grievances with role-scoped access."""

    __tablename__ = "beneficiary_grievances"

    id = Column(String(64), primary_key=True, index=True)
    beneficiary_id = Column(String(64), nullable=False, index=True)
    submitted_by = Column(String(64), nullable=False, index=True)
    category = Column(String(80), nullable=False)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="NORMAL")
    status = Column(String(30), nullable=False, default="OPEN", index=True)
    created_at = Column(DateTime, nullable=False, default=_utc_now, index=True)
