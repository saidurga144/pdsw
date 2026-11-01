"""Persistent data services for the Admin, Officer, and Beneficiary portals."""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from backend.auth.user_store import (
    find_beneficiary_ids_assigned_to_officer,
    find_user_by_id,
    update_user,
)
from backend.auth.security import get_password_hash, verify_password
from backend.database import get_db
from backend.database.mongodb import get_mongo_db
from backend.logger.audit import log_action
from backend.models import (
    ChangeRequestRecord,
    CommodityStockRecord,
    DocumentAudit,
    DistributionRecord,
    EntitlementRuleRecord,
    FamilyMemberRecord,
    GrievanceRecord,
    PortalNotificationRecord,
    RiskAlertRecord,
    SystemSettingRecord,
    User,
    VerificationRecord,
)
from backend.rbac.dependencies import get_current_user_from_mongo, require_roles
from backend.rbac.roles import (
    ADMIN_PROVISIONED_ROLES,
    PUBLIC_SIGNUP_ROLES,
    ROLE_DASHBOARD_MAP,
    canonicalize_role,
)

logger = logging.getLogger("pdsw.portal")
router = APIRouter(prefix="/portal", tags=["Portal Workflows"])


def _identity(user: dict) -> str:
    return str(user.get("_id") or user.get("id") or "")


def _iso(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value and value.tzinfo is None else value.isoformat() if value else None


def _member_out(member: FamilyMemberRecord) -> dict:
    return {
        "id": member.id,
        "beneficiaryId": member.beneficiary_id,
        "fullName": member.full_name,
        "relationship": member.relationship,
        "dateOfBirth": member.date_of_birth,
        "gender": member.gender,
        "identityLastFour": member.identity_last_four,
        "verificationStatus": member.status,
        "addedAt": _iso(member.added_at),
    }


async def _family(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(FamilyMemberRecord)
        .where(FamilyMemberRecord.beneficiary_id == user_id)
        .order_by(FamilyMemberRecord.added_at.asc())
    )
    return [_member_out(row) for row in result.scalars().all()]


async def _rules(db: AsyncSession, category: str | None) -> list[dict]:
    if not category:
        return []
    result = await db.execute(
        select(EntitlementRuleRecord)
        .where(EntitlementRuleRecord.category == category)
        .order_by(EntitlementRuleRecord.commodity.asc())
    )
    return [
        {
            "commodity": row.commodity,
            "quantity": row.quantity,
            "unit": row.unit,
            "subsidizedPricePerUnit": row.price_per_unit,
        }
        for row in result.scalars().all()
    ]


async def add_notification(
    db: AsyncSession,
    recipient_id: str,
    title: str,
    message: str,
    notification_type: str = "INFO",
    resource_type: str | None = None,
    resource_id: str | None = None,
) -> None:
    db.add(
        PortalNotificationRecord(
            id=f"ntf-{uuid4().hex}",
            recipient_user_id=recipient_id,
            title=title,
            message=message,
            notification_type=notification_type,
            resource_type=resource_type,
            resource_id=resource_id,
        )
    )


async def add_risk_alert(
    db: AsyncSession,
    *,
    severity: str,
    title: str,
    description: str,
    source_type: str,
    source_id: str,
    beneficiary_id: str | None = None,
) -> None:
    existing = await db.execute(select(RiskAlertRecord.id).where(
        RiskAlertRecord.source_type == source_type,
        RiskAlertRecord.source_id == source_id,
        RiskAlertRecord.status == "OPEN",
    ))
    if existing.scalar_one_or_none() is not None:
        return
    db.add(RiskAlertRecord(
        id=f"alert-{uuid4().hex}", severity=severity, title=title,
        description=description, beneficiary_id=beneficiary_id,
        source_type=source_type, source_id=source_id, status="OPEN",
    ))


@router.get(
    "/beneficiary/profile",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def beneficiary_profile(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    user_id = _identity(user)
    members = await _family(db, user_id)
    category = user.get("card_category")
    rules = await _rules(db, category)
    address = user.get("address_data") if isinstance(user.get("address_data"), dict) else {}
    verification = str(user.get("verification_status") or "PENDING").upper()
    eligibility_status = (
        "ELIGIBLE" if verification == "VERIFIED" and rules else
        "UNDER_REVIEW" if verification == "PENDING" else
        "INELIGIBLE" if verification == "REJECTED" else "NOT_CONFIGURED"
    )
    profile = {
        "id": user_id,
        "rationCardId": user.get("ration_card_number"),
        "fullName": user.get("full_name") or user.get("name") or "",
        "phone": user.get("phone") or "",
        "address": {
            "doorNo": address.get("door_no", ""),
            "street": address.get("street", ""),
            "district": address.get("district") or user.get("jurisdiction", ""),
            "state": address.get("state", ""),
            "pincode": address.get("pincode", ""),
            "pdsCenterId": address.get("pds_center_id", ""),
            "pdsCenterName": address.get("pds_center_name", ""),
        },
        "rationCategory": category,
        "familyCount": len(members),
        "familyMembers": members,
        "eligibility": {
            "beneficiaryId": user_id,
            "category": category,
            "monthlyEntitlements": rules,
            "monthlyIncome": user.get("monthly_income"),
            "isBPL": None,
            "lastReviewedAt": None,
            "nextReviewDue": None,
            "status": eligibility_status,
        },
        "verificationStatus": verification,
        "riskScore": None,
        "riskLevel": None,
        "currentHash": None,
        "latestIPFSCid": None,
        "createdAt": user.get("created_at"),
        "updatedAt": user.get("updated_at"),
    }
    return {"success": True, "profile": profile}


@router.get(
    "/beneficiary/family",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def beneficiary_family(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    return {"success": True, "familyMembers": await _family(db, _identity(user))}


@router.get(
    "/beneficiary/eligibility",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def beneficiary_eligibility(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    category = user.get("card_category")
    rules = await _rules(db, category)
    verification = str(user.get("verification_status") or "PENDING").upper()
    eligibility_status = (
        "ELIGIBLE" if verification == "VERIFIED" and rules else
        "UNDER_REVIEW" if verification == "PENDING" else
        "INELIGIBLE" if verification == "REJECTED" else "NOT_CONFIGURED"
    )
    return {
        "success": True,
        "eligibility": {
            "beneficiaryId": _identity(user),
            "rationCardId": user.get("ration_card_number"),
            "category": category,
            "monthlyEntitlements": rules,
            "monthlyIncome": user.get("monthly_income"),
            "status": eligibility_status,
            "verificationStatus": verification,
        },
    }


@router.get(
    "/beneficiary/integrity",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def beneficiary_integrity(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    user_id = _identity(user)
    canonical_profile = {
        "id": user_id,
        "full_name": user.get("full_name"),
        "phone": user.get("phone"),
        "jurisdiction": user.get("jurisdiction"),
        "ration_card_number": user.get("ration_card_number"),
        "card_category": user.get("card_category"),
        "address_data": user.get("address_data") or {},
    }
    current_hash = hashlib.sha256(
        json.dumps(canonical_profile, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    ).hexdigest()
    rows = await db.execute(
        select(DocumentAudit)
        .where(DocumentAudit.user_id == user_id)
        .order_by(DocumentAudit.created_at.desc())
        .limit(100)
    )
    documents = [
        {"documentId": row.document_id, "ipfsCid": row.ipfs_cid, "fileHash": row.file_hash, "transactionHash": row.tx_hash, "recordedAt": _iso(row.created_at), "status": row.status}
        for row in rows.scalars().all()
    ]
    return {
        "success": True,
        "verification": {
            "status": "UNVERIFIED",
            "currentRecordHash": current_hash,
            "lastVerifiedAt": None,
            "explanation": "The current profile hash was calculated from the live record. No trusted profile snapshot is anchored for comparison, so tamper-free status cannot be confirmed.",
            "documents": documents,
        },
    }


@router.get("/admin/integrity", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_integrity(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(DocumentAudit).order_by(DocumentAudit.created_at.desc()).limit(500))
    records = [
        {"id": row.id, "userId": row.user_id, "documentId": row.document_id, "cid": row.ipfs_cid, "fileHash": row.file_hash, "transactionHash": row.tx_hash, "role": row.role, "status": row.status, "createdAt": _iso(row.created_at)}
        for row in rows.scalars().all()
    ]
    return {"success": True, "records": records}


@router.get(
    "/beneficiary/transactions",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def beneficiary_transactions(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DistributionRecord)
        .where(
            DistributionRecord.beneficiary_id == _identity(user),
            DistributionRecord.status == "COMPLETED",
        )
        .order_by(DistributionRecord.distributed_at.desc())
        .limit(200)
    )
    records = [
        {
            "id": row.id,
            "transactionId": row.transaction_code,
            "beneficiaryId": row.beneficiary_id,
            "beneficiaryName": user.get("full_name") or "",
            "rationCardId": row.ration_card_number,
            "pdsCenterId": row.fps_shop_id,
            "officerId": row.officer_id,
            "commodities": [
                {
                    "name": line.get("commodity", ""),
                    "commodity": line.get("commodity", ""),
                    "quantity": line.get("quantity", 0),
                    "unit": line.get("unit", ""),
                    "pricePerUnit": line.get("pricePerUnit", 0),
                    "totalPrice": float(line.get("quantity", 0)) * float(line.get("pricePerUnit", 0)),
                }
                for line in (row.commodities or [])
            ],
            "totalAmount": row.total_cost,
            "timestamp": _iso(row.distributed_at),
            "status": row.status,
            "verificationMethod": row.auth_mode,
            "receiptHash": row.state_hash,
            "ipfsCid": None,
        }
        for row in result.scalars().all()
    ]
    return {"success": True, "transactions": records}


@router.get(
    "/grievances",
    dependencies=[Depends(require_roles(["BENEFICIARY", "PDS_OFFICER", "ADMIN"]))],
)
async def list_grievances(
    beneficiary_id: str | None = Query(default=None, max_length=64),
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    role = canonicalize_role(user.get("role"))
    if role == "BENEFICIARY":
        scoped_ids = [_identity(user)]
    elif role == "PDS_OFFICER":
        scoped_ids = await find_beneficiary_ids_assigned_to_officer(db, _identity(user))
        if beneficiary_id:
            if beneficiary_id not in scoped_ids:
                raise HTTPException(status_code=403, detail="Beneficiary is outside this officer's assignment.")
            scoped_ids = [beneficiary_id]
    else:
        scoped_ids = [beneficiary_id] if beneficiary_id else None

    if scoped_ids == []:
        return {"success": True, "grievances": []}
    query = select(GrievanceRecord)
    if scoped_ids is not None:
        query = query.where(GrievanceRecord.beneficiary_id.in_(scoped_ids))
    result = await db.execute(query.order_by(GrievanceRecord.created_at.desc()).limit(500))
    return {
        "success": True,
        "grievances": [
            {
                "id": row.id,
                "beneficiaryId": row.beneficiary_id,
                "submittedBy": row.submitted_by,
                "category": row.category,
                "subject": row.subject,
                "description": row.description,
                "priority": row.priority,
                "status": row.status,
                "createdAt": _iso(row.created_at),
            }
            for row in result.scalars().all()
        ],
    }


class GrievanceInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    beneficiary_id: str | None = Field(default=None, alias="beneficiaryId", max_length=64)
    category: str = Field(min_length=2, max_length=80)
    subject: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    priority: Literal["LOW", "NORMAL", "HIGH"] = "NORMAL"

    @field_validator("category", "subject", "description")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value


@router.post(
    "/grievances",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["BENEFICIARY", "PDS_OFFICER", "ADMIN"]))],
)
async def submit_grievance(
    payload: GrievanceInput,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    submitter_id = _identity(user)
    role = canonicalize_role(user.get("role"))
    if role == "BENEFICIARY":
        beneficiary_id = submitter_id
    else:
        beneficiary_id = str(payload.beneficiary_id or "").strip()
        if not beneficiary_id:
            raise HTTPException(status_code=422, detail="Select the beneficiary account for this grievance.")
        if role == "PDS_OFFICER":
            assigned_ids = await find_beneficiary_ids_assigned_to_officer(db, submitter_id)
            if beneficiary_id not in assigned_ids:
                raise HTTPException(status_code=403, detail="Beneficiary is outside this officer's assignment.")

    beneficiary = await find_user_by_id(db, beneficiary_id)
    if not beneficiary or canonicalize_role(beneficiary.get("role")) != "BENEFICIARY":
        raise HTTPException(status_code=404, detail="Beneficiary account was not found.")

    grievance_id = f"GRV-{datetime.now(timezone.utc).year}-{uuid4().hex[:12].upper()}"
    record = GrievanceRecord(
        id=grievance_id,
        beneficiary_id=beneficiary_id,
        submitted_by=submitter_id,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority,
        status="OPEN",
    )
    db.add(record)
    await add_notification(
        db,
        beneficiary_id,
        "Grievance received",
        f"Grievance {grievance_id} was recorded and is awaiting review.",
        "INFO",
        "GRIEVANCE",
        grievance_id,
    )
    await db.commit()
    log_action(submitter_id, role or "BENEFICIARY", "GRIEVANCE_SUBMITTED", {"grievance_id": grievance_id, "beneficiary_id": beneficiary_id})
    return {"success": True, "id": grievance_id, "status": record.status, "createdAt": _iso(record.created_at)}


@router.get(
    "/officer/beneficiaries",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_beneficiaries(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    officer_id = _identity(user)
    ids = await find_beneficiary_ids_assigned_to_officer(db, officer_id)
    rules_by_category: dict[str, list[dict]] = {}
    beneficiaries = []
    for beneficiary_id in ids:
        record = await find_user_by_id(db, beneficiary_id)
        if not record or canonicalize_role(record.get("role")) != "BENEFICIARY":
            continue
        category = record.get("card_category")
        if category and category not in rules_by_category:
            rules_by_category[category] = await _rules(db, category)
        family = await _family(db, beneficiary_id)
        address = record.get("address_data") if isinstance(record.get("address_data"), dict) else {}
        verification = str(record.get("verification_status") or "PENDING").upper()
        entitlement_rules = rules_by_category.get(category or "", [])
        beneficiaries.append({
            "id": beneficiary_id,
            "email": record.get("email", ""),
            "fullName": record.get("full_name") or "",
            "phone": record.get("phone") or "",
            "rationCardId": record.get("ration_card_number"),
            "rationCategory": category,
            "status": str(record.get("status") or "ACTIVE").upper(),
            "verificationStatus": verification,
            "address": {
                "doorNo": address.get("door_no", ""),
                "street": address.get("street", ""),
                "district": address.get("district") or record.get("jurisdiction", ""),
                "state": address.get("state", ""),
                "pincode": address.get("pincode", ""),
                "pdsCenterId": address.get("pds_center_id", ""),
                "pdsCenterName": address.get("pds_center_name", ""),
            },
            "familyCount": len(family),
            "familyMembers": family,
            "eligibility": {
                "beneficiaryId": beneficiary_id,
                "category": category,
                "monthlyEntitlements": entitlement_rules,
                "monthlyIncome": record.get("monthly_income"),
                "isBPL": None,
                "lastReviewedAt": None,
                "nextReviewDue": None,
                "status": "ELIGIBLE" if verification == "VERIFIED" and entitlement_rules else "UNDER_REVIEW" if verification == "PENDING" else "NOT_CONFIGURED",
            },
            "createdAt": record.get("created_at"),
            "updatedAt": record.get("updated_at"),
        })
    return {"success": True, "beneficiaries": beneficiaries}


@router.get("/officer/summary", dependencies=[Depends(require_roles(["PDS_OFFICER"]))])
async def officer_summary(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """Return dashboard counts limited to this officer's assigned beneficiaries."""
    officer_id = _identity(user)
    beneficiary_ids = await find_beneficiary_ids_assigned_to_officer(db, officer_id)
    beneficiary_id_set = set(beneficiary_ids)

    beneficiary_records = []
    for beneficiary_id in beneficiary_ids:
        record = await find_user_by_id(db, beneficiary_id)
        if record and canonicalize_role(record.get("role")) == "BENEFICIARY":
            beneficiary_records.append(record)

    sql_requests = []
    if beneficiary_ids:
        result = await db.execute(
            select(ChangeRequestRecord)
            .where(ChangeRequestRecord.beneficiary_id.in_(beneficiary_ids))
            .order_by(ChangeRequestRecord.submitted_at.desc())
            .limit(500)
        )
        sql_requests = [
            {
                "id": row.id,
                "beneficiary_id": row.beneficiary_id,
                "beneficiary_name": row.beneficiary_name,
                "request_type": row.request_type,
                "status": row.status,
                "submitted_at": _iso(row.submitted_at),
                "reason": row.reason,
            }
            for row in result.scalars().all()
        ]

    mongo_requests = []
    if beneficiary_ids:
        try:
            mongo_requests = await run_in_threadpool(
                lambda: list(
                    get_mongo_db()["change_requests"].find(
                        {"beneficiary_id": {"$in": beneficiary_ids}}, {"_id": 0}
                    ).sort("submitted_at", -1).limit(500)
                )
            )
        except Exception as exc:
            logger.info("Officer dashboard Mongo request query unavailable: %s", exc)

    merged_requests = {row["id"]: row for row in sql_requests}
    for row in mongo_requests:
        request_id = str(row.get("id") or "")
        if request_id and str(row.get("beneficiary_id") or "") in beneficiary_id_set:
            merged_requests[request_id] = {
                "id": request_id,
                "beneficiary_id": str(row.get("beneficiary_id") or ""),
                "beneficiary_name": row.get("beneficiary_name") or "",
                "request_type": row.get("request_type") or "",
                "status": str(row.get("status") or "SUBMITTED").upper(),
                "submitted_at": _iso(row.get("submitted_at")) if isinstance(row.get("submitted_at"), datetime) else row.get("submitted_at"),
                "reason": row.get("reason") or "",
            }
    requests = sorted(
        merged_requests.values(),
        key=lambda row: str(row.get("submitted_at") or ""),
        reverse=True,
    )
    pending_statuses = {"SUBMITTED", "PENDING", "UNDER_REVIEW", "OFFICER_VERIFICATION"}
    pending_requests = sum(row.get("status") in pending_statuses for row in requests)
    pending_verifications = sum(
        str(record.get("verification_status") or "PENDING").upper() == "PENDING"
        for record in beneficiary_records
    )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    distribution_result = await db.execute(
        select(func.count(DistributionRecord.id), func.coalesce(func.sum(DistributionRecord.total_cost), 0.0))
        .where(
            DistributionRecord.officer_id == officer_id,
            DistributionRecord.status == "COMPLETED",
            DistributionRecord.distributed_at >= today_start,
        )
    )
    distributions_today, distribution_value_today = distribution_result.one()
    recent_distribution_rows = await db.execute(
        select(DistributionRecord)
        .where(DistributionRecord.officer_id == officer_id, DistributionRecord.status == "COMPLETED")
        .order_by(DistributionRecord.distributed_at.desc())
        .limit(6)
    )
    recent_distributions = [
        {
            "id": row.id,
            "transactionCode": row.transaction_code,
            "beneficiaryId": row.beneficiary_id,
            "distributedAt": _iso(row.distributed_at),
            "totalCost": row.total_cost,
        }
        for row in recent_distribution_rows.scalars().all()
    ]

    alert_scope = (
        (RiskAlertRecord.beneficiary_id.in_(beneficiary_ids))
        | RiskAlertRecord.beneficiary_id.is_(None)
        if beneficiary_ids
        else RiskAlertRecord.beneficiary_id.is_(None)
    )
    alerts_query = select(func.count(RiskAlertRecord.id)).where(
        RiskAlertRecord.status == "OPEN", alert_scope
    )
    open_alert_count = int((await db.execute(alerts_query)).scalar_one())

    return {
        "success": True,
        "stats": {
            "assignedBeneficiaries": len(beneficiary_records),
            "pendingVerifications": pending_verifications,
            "pendingRequests": pending_requests,
            "approvedRequests": sum(row.get("status") == "APPROVED" for row in requests),
            "rejectedRequests": sum(row.get("status") == "REJECTED" for row in requests),
            "distributionsToday": int(distributions_today or 0),
            "distributionValueToday": float(distribution_value_today or 0),
            "openAlerts": open_alert_count,
        },
        "recentRequests": requests[:8],
        "recentDistributions": recent_distributions,
    }


@router.get(
    "/beneficiary/notifications",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def beneficiary_notifications(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PortalNotificationRecord)
        .where(PortalNotificationRecord.recipient_user_id == _identity(user))
        .order_by(PortalNotificationRecord.created_at.desc())
        .limit(200)
    )
    items = [
        {
            "id": row.id,
            "title": row.title,
            "message": row.message,
            "type": row.notification_type,
            "resourceType": row.resource_type,
            "resourceId": row.resource_id,
            "read": row.is_read,
            "timestamp": _iso(row.created_at),
        }
        for row in result.scalars().all()
    ]
    return {"success": True, "notifications": items, "unreadCount": sum(not item["read"] for item in items)}


@router.patch(
    "/beneficiary/notifications/{notification_id}/read",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PortalNotificationRecord).where(
            PortalNotificationRecord.id == notification_id,
            PortalNotificationRecord.recipient_user_id == _identity(user),
        )
    )
    item = result.scalars().first()
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    item.is_read = True
    await db.commit()
    return {"success": True, "id": item.id, "read": True}


@router.patch(
    "/beneficiary/notifications/read-all",
    dependencies=[Depends(require_roles(["BENEFICIARY"]))],
)
async def mark_all_notifications_read(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(PortalNotificationRecord)
        .where(PortalNotificationRecord.recipient_user_id == _identity(user))
        .values(is_read=True)
    )
    await db.commit()
    return {"success": True}


@router.get(
    "/officer/verification",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_verification_queue(
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    officer_id = _identity(user)
    beneficiary_ids = await find_beneficiary_ids_assigned_to_officer(db, officer_id)
    pending = []
    for beneficiary_id in beneficiary_ids:
        beneficiary = await find_user_by_id(db, beneficiary_id)
        if not beneficiary or canonicalize_role(beneficiary.get("role")) != "BENEFICIARY":
            continue
        if str(beneficiary.get("verification_status") or "PENDING").upper() != "PENDING":
            continue
        pending.append({
            "id": beneficiary_id,
            "fullName": beneficiary.get("full_name") or "",
            "email": beneficiary.get("email") or "",
            "phone": beneficiary.get("phone") or "",
            "rationCardNumber": beneficiary.get("ration_card_number"),
            "category": beneficiary.get("card_category"),
            "address": beneficiary.get("address_data") or {},
            "submittedAt": beneficiary.get("created_at"),
        })
    history = []
    if beneficiary_ids:
        history_rows = await db.execute(
            select(VerificationRecord)
            .where(VerificationRecord.beneficiary_id.in_(beneficiary_ids))
            .order_by(VerificationRecord.reviewed_at.desc())
            .limit(100)
        )
        history = [
            {
                "id": row.id,
                "beneficiaryId": row.beneficiary_id,
                "status": row.status,
                "comments": row.comments,
                "reviewedAt": _iso(row.reviewed_at),
            }
            for row in history_rows.scalars().all()
        ]
    return {"success": True, "records": pending, "history": history}


class VerificationDecision(BaseModel):
    status: Literal["VERIFIED", "REJECTED"]
    comments: str = Field(min_length=1, max_length=2000)


@router.patch(
    "/officer/verification/{beneficiary_id}",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def review_verification(
    beneficiary_id: str,
    payload: VerificationDecision,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    officer_id = _identity(user)
    beneficiary = await find_user_by_id(db, beneficiary_id)
    if not beneficiary or canonicalize_role(beneficiary.get("role")) != "BENEFICIARY":
        raise HTTPException(status_code=404, detail="Beneficiary not found.")
    if str(beneficiary.get("assigned_pds_officer_id") or "") != officer_id:
        raise HTTPException(status_code=403, detail="Beneficiary is not assigned to this officer.")
    if str(beneficiary.get("verification_status") or "PENDING").upper() != "PENDING":
        raise HTTPException(status_code=409, detail="This beneficiary verification has already been reviewed.")
    comments = payload.comments.strip()
    if not comments:
        raise HTTPException(status_code=422, detail="Review comments are required.")

    await update_user(db, beneficiary_id, {"verification_status": payload.status})
    db.add(VerificationRecord(
        id=f"ver-{uuid4().hex}", beneficiary_id=beneficiary_id,
        officer_id=officer_id, status=payload.status, comments=comments,
    ))
    await add_notification(
        db, beneficiary_id, "Account verification updated",
        f"Your beneficiary account verification was {payload.status.lower()}. {comments}",
        "SUCCESS" if payload.status == "VERIFIED" else "WARNING",
        "VERIFICATION", beneficiary_id,
    )
    if payload.status == "REJECTED":
        await add_risk_alert(
            db, severity="MEDIUM", title="Beneficiary verification rejected",
            description=comments, source_type="VERIFICATION",
            source_id=beneficiary_id, beneficiary_id=beneficiary_id,
        )
    await db.commit()
    log_action(officer_id, "PDS_OFFICER", f"BENEFICIARY_{payload.status}", {"beneficiary_id": beneficiary_id})
    return {"success": True, "beneficiaryId": beneficiary_id, "status": payload.status}


class StockInput(BaseModel):
    fps_shop_id: str = Field(min_length=1, max_length=100)
    commodity: str = Field(min_length=1, max_length=120)
    quantity: float = Field(ge=0, le=100_000_000)
    unit: str = Field(min_length=1, max_length=20)


class EntitlementInput(BaseModel):
    category: Literal["AAY", "PHH", "NPHH", "SPECIAL"]
    commodity: str = Field(min_length=1, max_length=120)
    quantity: float = Field(gt=0, le=100_000)
    unit: str = Field(min_length=1, max_length=20)
    price_per_unit: float = Field(ge=0, le=1_000_000)


@router.get("/admin/stock", dependencies=[Depends(require_roles(["ADMIN"]))])
async def list_stock(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CommodityStockRecord).order_by(CommodityStockRecord.fps_shop_id, CommodityStockRecord.commodity))
    return {"success": True, "stock": [{"id": r.id, "fpsShopId": r.fps_shop_id, "commodity": r.commodity, "quantity": r.quantity, "unit": r.unit} for r in result.scalars().all()]}


@router.put("/admin/stock", dependencies=[Depends(require_roles(["ADMIN"]))])
async def upsert_stock(
    payload: StockInput,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CommodityStockRecord).where(
        CommodityStockRecord.fps_shop_id == payload.fps_shop_id.strip(),
        CommodityStockRecord.commodity == payload.commodity.strip(),
    ))
    row = result.scalars().first()
    if row:
        row.quantity = payload.quantity
        row.unit = payload.unit.strip()
    else:
        row = CommodityStockRecord(id=f"stock-{uuid4().hex}", fps_shop_id=payload.fps_shop_id.strip(), commodity=payload.commodity.strip(), quantity=payload.quantity, unit=payload.unit.strip())
        db.add(row)
    await db.commit()
    log_action(_identity(user), "ADMIN", "COMMODITY_STOCK_UPDATED", {"fps_shop_id": row.fps_shop_id, "commodity": row.commodity})
    return {"success": True, "stock": {"id": row.id, "fpsShopId": row.fps_shop_id, "commodity": row.commodity, "quantity": row.quantity, "unit": row.unit}}


@router.get("/admin/entitlements", dependencies=[Depends(require_roles(["ADMIN"]))])
async def list_entitlements(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EntitlementRuleRecord).order_by(EntitlementRuleRecord.category, EntitlementRuleRecord.commodity))
    return {"success": True, "entitlements": [{"id": r.id, "category": r.category, "commodity": r.commodity, "quantity": r.quantity, "unit": r.unit, "pricePerUnit": r.price_per_unit} for r in result.scalars().all()]}


@router.put("/admin/entitlements", dependencies=[Depends(require_roles(["ADMIN"]))])
async def upsert_entitlement(
    payload: EntitlementInput,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EntitlementRuleRecord).where(
        EntitlementRuleRecord.category == payload.category,
        EntitlementRuleRecord.commodity == payload.commodity.strip(),
    ))
    row = result.scalars().first()
    if row:
        row.quantity, row.unit, row.price_per_unit = payload.quantity, payload.unit.strip(), payload.price_per_unit
    else:
        row = EntitlementRuleRecord(id=f"ent-{uuid4().hex}", category=payload.category, commodity=payload.commodity.strip(), quantity=payload.quantity, unit=payload.unit.strip(), price_per_unit=payload.price_per_unit)
        db.add(row)
    await db.commit()
    log_action(_identity(user), "ADMIN", "ENTITLEMENT_RULE_UPDATED", {"category": row.category, "commodity": row.commodity})
    return {"success": True}


class DistributionLine(BaseModel):
    commodity: str = Field(min_length=1, max_length=120)
    quantity: float = Field(gt=0, le=100_000)


class DistributionInput(BaseModel):
    beneficiary_id: str = Field(min_length=1, max_length=64)
    fps_shop_id: str = Field(min_length=1, max_length=100)
    idempotency_key: str = Field(min_length=16, max_length=100)
    auth_mode: Literal["BIOMETRIC_SIMULATED", "OTP_SIMULATED", "OFFICER_VERIFIED"]
    commodities: list[DistributionLine] = Field(min_length=1, max_length=20)


@router.post("/officer/distributions", status_code=201, dependencies=[Depends(require_roles(["PDS_OFFICER", "ADMIN"]))])
async def create_distribution(
    payload: DistributionInput,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    officer_id = _identity(user)
    beneficiary = await find_user_by_id(db, payload.beneficiary_id)
    if not beneficiary or canonicalize_role(beneficiary.get("role")) != "BENEFICIARY":
        raise HTTPException(status_code=404, detail="Beneficiary not found.")
    if canonicalize_role(user.get("role")) == "PDS_OFFICER" and str(beneficiary.get("assigned_pds_officer_id") or "") != officer_id:
        raise HTTPException(status_code=403, detail="Beneficiary is not assigned to this officer.")
    existing_result = await db.execute(select(DistributionRecord).where(DistributionRecord.idempotency_key == payload.idempotency_key))
    existing = existing_result.scalars().first()
    if existing:
        if existing.beneficiary_id != payload.beneficiary_id or existing.officer_id != officer_id:
            raise HTTPException(status_code=409, detail="Idempotency key was already used for a different distribution.")
        return {"success": True, "id": existing.id, "transactionCode": existing.transaction_code, "stateHash": existing.state_hash, "status": existing.status, "commodities": existing.commodities, "totalCost": existing.total_cost, "distributedAt": _iso(existing.distributed_at)}

    if str(beneficiary.get("status", "ACTIVE")).upper() != "ACTIVE":
        raise HTTPException(status_code=409, detail="Beneficiary account is inactive.")
    if str(beneficiary.get("verification_status") or "PENDING").upper() != "VERIFIED":
        raise HTTPException(status_code=409, detail="Beneficiary verification must be completed before distribution.")
    beneficiary_address = beneficiary.get("address_data")
    assigned_shop_id = beneficiary_address.get("pds_center_id") if isinstance(beneficiary_address, dict) else None
    if not assigned_shop_id or str(assigned_shop_id).strip() != payload.fps_shop_id.strip():
        raise HTTPException(status_code=409, detail="The selected Fair Price Shop does not match the beneficiary's recorded shop assignment.")
    card_category = beneficiary.get("card_category")
    if not card_category:
        raise HTTPException(status_code=409, detail="Beneficiary ration category has not been configured.")

    rules = await _rules(db, card_category)
    rule_by_name = {item["commodity"]: item for item in rules}
    if not rules:
        raise HTTPException(status_code=409, detail="No monthly entitlements are configured for this ration category.")
    seen: set[str] = set()
    lines = []
    total_cost = 0.0
    for requested_line in payload.commodities:
        name = requested_line.commodity.strip()
        if name in seen:
            raise HTTPException(status_code=422, detail=f"Commodity '{name}' is listed more than once.")
        seen.add(name)
        rule = rule_by_name.get(name)
        if not rule:
            raise HTTPException(status_code=422, detail=f"{name} is not part of the configured entitlement.")
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
        # Sum this item from completed JSON lines without relying on database-specific JSON operators.
        prior_result = await db.execute(select(DistributionRecord).where(
            DistributionRecord.beneficiary_id == payload.beneficiary_id,
            DistributionRecord.status == "COMPLETED",
            DistributionRecord.distributed_at >= month_start,
        ))
        used = sum(
            float(line.get("quantity", 0))
            for dist in prior_result.scalars().all()
            for line in (dist.commodities or [])
            if line.get("commodity") == name
        )
        if requested_line.quantity + used > float(rule["quantity"]) + 1e-9:
            raise HTTPException(status_code=409, detail=f"Requested {name} exceeds the remaining monthly entitlement ({max(0, float(rule['quantity']) - used):g} {rule['unit']}).")
        lines.append({"commodity": name, "quantity": requested_line.quantity, "unit": rule["unit"], "pricePerUnit": rule["subsidizedPricePerUnit"]})
        total_cost += requested_line.quantity * float(rule["subsidizedPricePerUnit"])

    dist_id = f"dist-{uuid4().hex}"
    transaction_code = f"TXN-{datetime.now(timezone.utc).year}-{uuid4().hex[:12].upper()}"
    created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    hash_payload = json.dumps({"id": dist_id, "beneficiary": payload.beneficiary_id, "officer": officer_id, "shop": payload.fps_shop_id, "commodities": lines, "created_at": created_at.isoformat()}, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()
    try:
        for line in lines:
            deduction = await db.execute(
                update(CommodityStockRecord)
                .where(
                    CommodityStockRecord.fps_shop_id == payload.fps_shop_id,
                    CommodityStockRecord.commodity == line["commodity"],
                    CommodityStockRecord.unit == line["unit"],
                    CommodityStockRecord.quantity >= line["quantity"],
                )
                .values(quantity=CommodityStockRecord.quantity - line["quantity"])
            )
            if deduction.rowcount != 1:
                stock_result = await db.execute(select(CommodityStockRecord).where(
                    CommodityStockRecord.fps_shop_id == payload.fps_shop_id,
                    CommodityStockRecord.commodity == line["commodity"],
                ))
                stock = stock_result.scalars().first()
                if stock is None or stock.unit != line["unit"]:
                    raise HTTPException(status_code=409, detail=f"No matching configured stock exists for {line['commodity']} at this Fair Price Shop.")
                raise HTTPException(status_code=409, detail=f"Insufficient configured stock for {line['commodity']} at this Fair Price Shop.")
        record = DistributionRecord(
            id=dist_id, idempotency_key=payload.idempotency_key,
            transaction_code=transaction_code, beneficiary_id=payload.beneficiary_id,
            officer_id=officer_id,
            ration_card_number=beneficiary.get("ration_card_number") or "",
            fps_shop_id=payload.fps_shop_id, commodities=lines,
            total_cost=round(total_cost, 2), auth_mode=payload.auth_mode,
            state_hash=digest, status="COMPLETED", distributed_at=created_at,
        )
        db.add(record)
        await add_notification(db, payload.beneficiary_id, "Ration distribution completed", f"Distribution receipt {transaction_code} is available.", "SUCCESS", "DISTRIBUTION", dist_id)
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except (IntegrityError, SQLAlchemyError) as exc:
        await db.rollback()
        logger.exception("Failed to persist commodity distribution")
        raise HTTPException(status_code=503, detail="Distribution could not be saved. No stock was deducted; retry safely.") from exc
    log_action(officer_id, canonicalize_role(user.get("role")) or "PDS_OFFICER", "DISTRIBUTION_COMPLETED", {"distribution_id": dist_id, "beneficiary_id": payload.beneficiary_id})
    return {"success": True, "id": dist_id, "transactionCode": transaction_code, "stateHash": digest, "ipfsCid": None, "status": "COMPLETED", "commodities": lines, "totalCost": round(total_cost, 2), "distributedAt": _iso(created_at)}


@router.get("/officer/alerts", dependencies=[Depends(require_roles(["PDS_OFFICER"]))])
async def officer_alerts(
    user: dict = Depends(get_current_user_from_mongo), db: AsyncSession = Depends(get_db)
):
    officer_id = _identity(user)
    ids = await find_beneficiary_ids_assigned_to_officer(db, officer_id)
    query = select(RiskAlertRecord).where(
        (RiskAlertRecord.beneficiary_id.in_(ids)) | (RiskAlertRecord.beneficiary_id.is_(None))
    ).order_by(RiskAlertRecord.created_at.desc()).limit(200)
    result = await db.execute(query)
    alerts = [{"id": a.id, "severity": a.severity, "title": a.title, "description": a.description, "beneficiaryId": a.beneficiary_id, "sourceType": a.source_type, "sourceId": a.source_id, "status": a.status, "createdAt": _iso(a.created_at)} for a in result.scalars().all()]
    return {"success": True, "alerts": alerts}


@router.patch("/officer/alerts/{alert_id}/acknowledge", dependencies=[Depends(require_roles(["PDS_OFFICER"]))])
async def acknowledge_alert(alert_id: str, user: dict = Depends(get_current_user_from_mongo), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiskAlertRecord).where(RiskAlertRecord.id == alert_id))
    alert = result.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found.")
    officer_id = _identity(user)
    if alert.beneficiary_id:
        assigned = await find_beneficiary_ids_assigned_to_officer(db, officer_id)
        if alert.beneficiary_id not in assigned:
            raise HTTPException(status_code=403, detail="Alert is outside this officer's jurisdiction.")
    if alert.status == "OPEN":
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_by = officer_id
        alert.acknowledged_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
    return {"success": True, "id": alert.id, "status": alert.status}


@router.get("/admin/alerts", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_alerts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiskAlertRecord).order_by(RiskAlertRecord.created_at.desc()).limit(500))
    alerts = [{"id": row.id, "severity": row.severity, "title": row.title, "description": row.description, "beneficiaryId": row.beneficiary_id, "sourceType": row.source_type, "sourceId": row.source_id, "status": row.status, "createdAt": _iso(row.created_at)} for row in result.scalars().all()]
    return {"success": True, "alerts": alerts}


@router.get("/admin/roles", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_role_policies():
    role_titles = {
        "ADMIN": "Administrator",
        "PDS_OFFICER": "PDS Officer",
        "SOC_ANALYST": "SOC Analyst",
        "BENEFICIARY": "Beneficiary",
    }
    roles = [
        {
            "role": role,
            "title": role_titles[role],
            "dashboard": ROLE_DASHBOARD_MAP[role],
            "provisioning": "PUBLIC_SIGNUP" if role in PUBLIC_SIGNUP_ROLES else "ADMIN_PROVISIONED" if role in ADMIN_PROVISIONED_ROLES else "ENVIRONMENT_BOOTSTRAP",
        }
        for role in sorted(ROLE_DASHBOARD_MAP)
    ]
    return {"success": True, "roles": roles}


@router.get("/admin/summary", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_summary(db: AsyncSession = Depends(get_db)):
    counts = {"BENEFICIARY": 0, "PDS_OFFICER": 0, "ADMIN": 0, "SOC_ANALYST": 0}
    total_users = active_users = inactive_users = 0
    try:
        from backend.database.mongodb import get_users_collection
        collection = get_users_collection()
        for row in collection.aggregate([{"$group": {"_id": {"role": "$role", "status": "$status"}, "count": {"$sum": 1}}}]):
            role = canonicalize_role(row.get("_id", {}).get("role", ""))
            amount = int(row.get("count", 0))
            state = str(row.get("_id", {}).get("status", "ACTIVE")).upper()
            if role in counts:
                counts[role] += amount
            total_users += amount
            if state == "ACTIVE":
                active_users += amount
            else:
                inactive_users += amount
    except Exception:
        for role in counts:
            result = await db.execute(select(func.count()).select_from(User).where(User.role == role))
            counts[role] = int(result.scalar_one())
        total_users = sum(counts.values())
        active_users = int((await db.execute(select(func.count()).select_from(User).where(User.status == "ACTIVE"))).scalar_one())
        inactive_users = total_users - active_users

    request_counts: dict[str, int] = {}
    request_records: dict[str, dict] = {}
    request_rows = (await db.execute(select(ChangeRequestRecord.status, func.count()).group_by(ChangeRequestRecord.status))).all()
    for key, count in request_rows:
        request_counts[str(key)] = int(count)
    for row in (await db.execute(select(ChangeRequestRecord).order_by(ChangeRequestRecord.submitted_at.desc()).limit(10))).scalars().all():
        request_records[row.id] = {"id": row.id, "beneficiaryName": row.beneficiary_name, "type": row.request_type, "status": row.status, "submittedAt": _iso(row.submitted_at)}
    mongo_request_count = 0
    try:
        from backend.database.mongodb import get_mongo_db
        collection = get_mongo_db()["change_requests"]
        mongo_request_count = collection.count_documents({})
        if mongo_request_count:
            request_counts = {}
            for row in collection.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
                request_counts[str(row.get("_id", "UNKNOWN"))] = int(row.get("count", 0))
            for row in collection.find({}, {"_id": 0}).sort("submitted_at", -1).limit(10):
                request_records[str(row.get("id"))] = {"id": row.get("id"), "beneficiaryName": row.get("beneficiary_name", ""), "type": row.get("request_type", ""), "status": row.get("status", ""), "submittedAt": row.get("submitted_at")}
    except Exception:
        pass
    distribution_count = (await db.execute(select(func.count()).select_from(DistributionRecord).where(DistributionRecord.status == "COMPLETED"))).scalar_one()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    distributions_today = (await db.execute(select(func.count()).select_from(DistributionRecord).where(DistributionRecord.status == "COMPLETED", DistributionRecord.distributed_at >= today_start))).scalar_one()
    open_alerts = (await db.execute(select(func.count()).select_from(RiskAlertRecord).where(RiskAlertRecord.status == "OPEN"))).scalar_one()
    try:
        from backend.database.mongodb import get_mongo_db
        audit_collection = get_mongo_db()["audit_logs"]
        audit_count = audit_collection.count_documents({})
        recent_activity = [
            {
                "actorId": row.get("user_id", ""),
                "role": row.get("role", ""),
                "action": row.get("action", ""),
                "timestamp": _iso(row.get("timestamp")) if isinstance(row.get("timestamp"), datetime) else row.get("timestamp"),
            }
            for row in audit_collection.find({}, {"_id": 0, "user_id": 1, "role": 1, "action": 1, "timestamp": 1}).sort("timestamp", -1).limit(10)
        ]
        users_collection = get_mongo_db()["users"]
        recent_registrations = [
            {
                "id": str(row.get("id") or row.get("_id") or ""),
                "name": row.get("full_name") or row.get("name") or "",
                "role": canonicalize_role(row.get("role", "")),
                "createdAt": _iso(row.get("created_at")) if isinstance(row.get("created_at"), datetime) else row.get("created_at"),
            }
            for row in users_collection.find({}, {"_id": 1, "id": 1, "full_name": 1, "name": 1, "role": 1, "created_at": 1}).sort("created_at", -1).limit(10)
        ]
    except Exception:
        audit_count = 0
        recent_activity = []
        recent_users_result = await db.execute(select(User).order_by(User.created_at.desc()).limit(10))
        recent_registrations = [
            {"id": row.id, "name": row.full_name, "role": canonicalize_role(row.role.value if hasattr(row.role, "value") else row.role), "createdAt": _iso(row.created_at)}
            for row in recent_users_result.scalars().all()
        ]
    stats = {
        "users": counts,
        "totalUsers": total_users,
        "activeUsers": active_users,
        "inactiveUsers": inactive_users,
        "beneficiaries": counts["BENEFICIARY"],
        "pdsOfficers": counts["PDS_OFFICER"],
        "admins": counts["ADMIN"],
        "socAnalysts": counts["SOC_ANALYST"],
        "requestsByStatus": request_counts,
        "pendingRequests": sum(n for k, n in request_counts.items() if k in {"SUBMITTED", "UNDER_REVIEW", "OFFICER_VERIFICATION"}),
        "approvedRequests": request_counts.get("APPROVED", 0),
        "rejectedRequests": request_counts.get("REJECTED", 0),
        "completedDistributions": int(distribution_count),
        "totalDistributions": int(distribution_count),
        "distributionsToday": int(distributions_today),
        "openAlerts": int(open_alerts),
        "totalAuditEvents": int(audit_count),
        "recentRegistrations": recent_registrations,
        "recentActivity": recent_activity,
        "recentRequests": sorted(request_records.values(), key=lambda row: row.get("submittedAt") or "", reverse=True)[:10],
    }
    return {"success": True, "stats": stats}


@router.get("/admin/settings", dependencies=[Depends(require_roles(["ADMIN"]))])
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettingRecord).order_by(SystemSettingRecord.key))
    settings = [
        {"key": row.key, "value": row.value, "updatedAt": _iso(row.updated_at)}
        for row in result.scalars().all()
        if not row.key.lower().endswith(("secret", "password", "token", "private_key", "api_key"))
    ]
    return {"success": True, "settings": settings}


class SettingInput(BaseModel):
    key: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    value: dict | list | str | int | float | bool | None


class BeneficiaryPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/beneficiary/password", dependencies=[Depends(require_roles(["BENEFICIARY"]))])
async def change_beneficiary_password(
    payload: BeneficiaryPasswordChange,
    user: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    current_hash = str(user.get("password_hash") or "")
    if not current_hash or not verify_password(payload.current_password, current_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if verify_password(payload.new_password, current_hash):
        raise HTTPException(status_code=400, detail="Choose a new password different from your current password.")
    user_id = _identity(user)
    await update_user(db, user_id, {"password_hash": get_password_hash(payload.new_password)})
    log_action(user_id, "BENEFICIARY", "PASSWORD_CHANGED", {})
    return {"success": True, "message": "Password updated successfully."}


@router.put("/admin/settings", dependencies=[Depends(require_roles(["ADMIN"]))])
async def update_setting(payload: SettingInput, user: dict = Depends(get_current_user_from_mongo), db: AsyncSession = Depends(get_db)):
    if payload.key.lower().endswith(("secret", "password", "token", "private_key", "api_key")):
        raise HTTPException(status_code=400, detail="Secret material must be configured through deployment environment variables.")
    result = await db.execute(select(SystemSettingRecord).where(SystemSettingRecord.key == payload.key))
    row = result.scalars().first()
    if row:
        row.value = payload.value
        row.updated_by = _identity(user)
    else:
        row = SystemSettingRecord(key=payload.key, value=payload.value, updated_by=_identity(user))
        db.add(row)
    await db.commit()
    log_action(_identity(user), "ADMIN", "SYSTEM_SETTING_UPDATED", {"key": payload.key})
    return {"success": True, "key": row.key, "value": row.value}
