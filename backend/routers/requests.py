"""Persist beneficiary change requests and their supporting IPFS references."""

import logging
from datetime import date, datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.database.mongodb import get_mongo_db
from backend.models import ChangeRequestRecord
from backend.auth.user_store import (
    find_beneficiary_ids_assigned_to_officer,
    find_user_by_id,
)
from backend.logger.audit import log_action
from backend.rbac.dependencies import require_roles
from backend.rbac.roles import canonicalize_role

logger = logging.getLogger("pdsw.requests")
router = APIRouter(prefix="/requests", tags=["Beneficiary Change Requests"])


class SupportingDocument(BaseModel):
    document_id: str = Field(min_length=1, max_length=100)
    ipfs_cid: str = Field(min_length=10, max_length=100)
    file_hash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    tx_hash: str = Field(min_length=1, max_length=100)
    file_name: str = Field(min_length=1, max_length=255)
    file_size: int = Field(ge=1, le=15 * 1024 * 1024)
    mime_type: str = Field(min_length=1, max_length=100)
    gateway_url: str = Field(min_length=1, max_length=2048)


class ChangeRequestCreate(BaseModel):
    request_type: str = Field(min_length=1, max_length=80)
    reason: str = Field(min_length=1, max_length=2000)
    previous_data: dict[str, Any] = Field(default_factory=dict)
    requested_data: dict[str, Any] = Field(default_factory=dict)
    supporting_documents: list[SupportingDocument] = Field(
        default_factory=list, max_length=10
    )

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A reason is required for the selected request type.")
        return value

    @model_validator(mode="after")
    def validate_type_specific_data(self):
        requested = self.requested_data

        def require_text(data: dict[str, Any], key: str, label: str) -> str:
            value = data.get(key)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{label} is required.")
            return value.strip()

        def require_date(data: dict[str, Any], key: str, label: str) -> date:
            value = require_text(data, key, label)
            try:
                return date.fromisoformat(value)
            except ValueError as exc:
                raise ValueError(f"{label} must be a valid date.") from exc

        needs_document = False
        if self.request_type == "ADDRESS_CHANGE":
            for key, label in (
                ("house_number", "New house or door number"),
                ("street", "New street or village"),
                ("mandal", "New mandal or taluk"),
                ("district", "New district"),
                ("state", "New state"),
            ):
                require_text(requested, key, label)
            pin_code = require_text(requested, "pin_code", "New PIN code")
            if not pin_code.isdigit() or len(pin_code) != 6:
                raise ValueError("New PIN code must contain exactly 6 digits.")
            needs_document = True
        elif self.request_type == "FAMILY_ADDITION":
            members = requested.get("family_members")
            if not isinstance(members, list) or not 1 <= len(members) <= 10:
                raise ValueError("Add between 1 and 10 family members.")
            for index, member in enumerate(members, start=1):
                if not isinstance(member, dict):
                    raise ValueError(f"Family member {index} is invalid.")
                for key, label in (
                    ("full_name", "name"),
                    ("relationship", "relationship"),
                    ("date_of_birth", "date of birth"),
                    ("gender", "gender"),
                    ("aadhaar_number", "Aadhaar number"),
                ):
                    require_text(member, key, f"Family member {index} {label}")
                aadhaar = member["aadhaar_number"].strip()
                if not aadhaar.isdigit() or len(aadhaar) != 12:
                    raise ValueError(
                        f"Family member {index} Aadhaar number must contain 12 digits."
                    )
                birth_date = require_date(
                    member, "date_of_birth", f"Family member {index} date of birth"
                )
                if birth_date > date.today():
                    raise ValueError(f"Family member {index} date of birth cannot be in the future.")
            needs_document = True
        elif self.request_type == "FAMILY_REMOVAL":
            require_text(requested, "member_id", "Family member")
            removal_reason = require_text(requested, "removal_reason", "Removal reason")
            if removal_reason not in {"MIGRATION", "DECEASED", "OTHER"}:
                raise ValueError("Select a valid family member removal reason.")
            if removal_reason in {"MIGRATION", "DECEASED"}:
                removal_date = require_date(
                    requested, "removal_date", "Date of migration or death"
                )
                if removal_date > date.today():
                    raise ValueError("Date of migration or death cannot be in the future.")
                needs_document = True
            if removal_reason == "MIGRATION":
                location = requested.get("new_location")
                if not isinstance(location, dict):
                    raise ValueError("New location details are required for migration.")
                for key, label in (("district", "New district"), ("state", "New state")):
                    require_text(location, key, label)
        elif self.request_type == "CONTACT_UPDATE":
            old_phone = "".join(
                char for char in str(self.previous_data.get("phone", "")) if char.isdigit()
            )[-10:]
            if len(old_phone) != 10 or old_phone[0] not in "6789":
                raise ValueError(
                    "The current registered mobile number is missing or invalid. Update the beneficiary profile before requesting a change."
                )
            new_phone = require_text(requested, "phone", "New mobile number")
            if len(new_phone) != 10 or not new_phone.isdigit() or new_phone[0] not in "6789":
                raise ValueError("New mobile number must be a valid 10-digit Indian number.")
            if old_phone and new_phone == old_phone:
                raise ValueError("New mobile number must differ from the existing number.")
        elif self.request_type == "MIGRATION_TRANSFER":
            for key, label in (
                ("destination_state", "Destination state"),
                ("destination_district", "Destination district"),
                ("destination_mandal", "Destination mandal or taluk"),
                ("new_address", "New residential address"),
            ):
                require_text(requested, key, label)
            expected_date = require_date(
                requested, "expected_migration_date", "Expected migration date"
            )
            if expected_date < date.today():
                raise ValueError("Expected migration date cannot be in the past.")
            needs_document = True

        if needs_document and not self.supporting_documents:
            raise ValueError("Upload at least one supporting document for this request.")
        return self


class ChangeRequestReview(BaseModel):
    status: Literal["UNDER_REVIEW", "APPROVED", "REJECTED", "ESCALATED"]
    review_notes: str = Field(min_length=1, max_length=2000)

    @field_validator("review_notes")
    @classmethod
    def review_notes_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("An officer review comment is required.")
        return value


def _mongo_collection():
    try:
        return get_mongo_db()["change_requests"]
    except RuntimeError:
        return None


def _mask_sensitive_values(value: Any) -> Any:
    """Mask Aadhaar values before request data is persisted or returned."""
    if isinstance(value, list):
        return [_mask_sensitive_values(item) for item in value]
    if not isinstance(value, dict):
        return value

    masked: dict[str, Any] = {}
    for key, item in value.items():
        if "aadhaar" in str(key).lower() and isinstance(item, str):
            digits = "".join(character for character in item if character.isdigit())
            masked[key] = f"XXXX XXXX {digits[-4:]}" if len(digits) == 12 else "[REDACTED]"
        else:
            masked[key] = _mask_sensitive_values(item)
    return masked


def _serialize(record: ChangeRequestRecord) -> dict[str, Any]:
    submitted_at = record.submitted_at
    if submitted_at and submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)
    reviewed_at = record.reviewed_at
    if reviewed_at and reviewed_at.tzinfo is None:
        reviewed_at = reviewed_at.replace(tzinfo=timezone.utc)

    return {
        "id": record.id,
        "beneficiary_id": record.beneficiary_id,
        "beneficiary_name": record.beneficiary_name,
        "beneficiary_email": record.beneficiary_email,
        "ration_card_id": record.ration_card_id,
        "jurisdiction": record.jurisdiction,
        "request_type": record.request_type,
        "previous_data": record.previous_data or {},
        "requested_data": record.requested_data or {},
        "reason": record.reason,
        "supporting_documents": record.supporting_documents or [],
        "status": record.status,
        "submitted_at": submitted_at.isoformat() if submitted_at else None,
        "review_notes": record.review_notes or "",
        "reviewed_by": record.reviewed_by,
        "reviewed_at": reviewed_at.isoformat() if reviewed_at else None,
    }


async def _find_requests(
    db: AsyncSession,
    query,
    mongo_query: dict[str, Any],
    limit: int = 200,
) -> list[dict[str, Any]]:
    sql_records = []
    mongo_records = []
    sql_error = None
    try:
        result = await db.execute(
            query.order_by(ChangeRequestRecord.submitted_at.desc()).limit(limit)
        )
        sql_records = [_serialize(record) for record in result.scalars().all()]
    except SQLAlchemyError as exc:
        sql_error = exc

    collection = _mongo_collection()
    if collection is not None:
        try:
            mongo_records = await run_in_threadpool(
                lambda: list(
                    collection.find(mongo_query, {"_id": 0})
                    .sort("submitted_at", -1)
                    .limit(limit)
                )
            )
        except Exception as exc:
            logger.warning(
                "MongoDB request read failed; using SQL fallback: %s", exc
            )

    if sql_error and not mongo_records:
        logger.exception("Could not read persisted change requests", exc_info=sql_error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to read change requests from the configured database.",
        ) from sql_error

    # MongoDB is the production store. SQLite (or the configured SQL database)
    # also contains requests accepted while MongoDB was unavailable.
    merged = {record["id"]: record for record in sql_records}
    merged.update({record["id"]: record for record in mongo_records})
    records = list(merged.values())
    records.sort(key=lambda record: record.get("submitted_at") or "", reverse=True)
    return records[:limit]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_change_request(
    payload: ChangeRequestCreate,
    current_user: dict = Depends(
        require_roles(["BENEFICIARY", "PDS_OFFICER", "ADMIN"])
    ),
    db: AsyncSession = Depends(get_db),
):
    user_id = str(current_user.get("_id") or current_user.get("id") or "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user identity is missing.",
        )

    submitted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    request_id = f"CR-{datetime.now(timezone.utc).year}-{uuid4().hex[:10].upper()}"
    record_data = {
        "id": request_id,
        "beneficiary_id": user_id,
        "beneficiary_name": (
            current_user.get("full_name")
            or current_user.get("name")
            or current_user.get("email")
            or "Beneficiary"
        ),
        "beneficiary_email": current_user.get("email", ""),
        "ration_card_id": current_user.get("ration_card_id", ""),
        "jurisdiction": current_user.get("jurisdiction", ""),
        "request_type": payload.request_type,
        "previous_data": _mask_sensitive_values(payload.previous_data),
        "requested_data": _mask_sensitive_values(payload.requested_data),
        "reason": payload.reason,
        "supporting_documents": [
            document.model_dump() for document in payload.supporting_documents
        ],
        "status": "SUBMITTED",
        "submitted_at": submitted_at.isoformat() + "Z",
        "review_notes": "",
        "reviewed_by": None,
        "reviewed_at": None,
    }

    collection = _mongo_collection()
    if collection is not None:
        try:
            # PyMongo mutates the inserted mapping by adding an ObjectId under
            # ``_id``. Keep that database-only value out of FastAPI's response,
            # whose JSON encoder cannot serialize a BSON ObjectId.
            mongo_record = dict(record_data)
            await run_in_threadpool(lambda: collection.insert_one(mongo_record))
            return {"success": True, **record_data}
        except Exception as exc:
            logger.warning(
                "MongoDB request insert failed; saving to SQL fallback: %s", exc
            )

    record = ChangeRequestRecord(**{**record_data, "submitted_at": submitted_at})

    try:
        db.add(record)
        await db.commit()
        await db.refresh(record)
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception("Could not save beneficiary change request")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Could not save the request to the configured application database. "
                "Check the backend database and try again."
            ),
        ) from exc

    return {"success": True, **_serialize(record)}


@router.get("/mine")
async def list_my_change_requests(
    current_user: dict = Depends(require_roles(["BENEFICIARY"])),
    db: AsyncSession = Depends(get_db),
):
    user_id = str(current_user.get("_id") or current_user.get("id") or "")
    return {
        "success": True,
        "requests": await _find_requests(
            db,
            select(ChangeRequestRecord).where(
                ChangeRequestRecord.beneficiary_id == user_id
            ),
            {"beneficiary_id": user_id},
        ),
    }


@router.get("/officer")
async def list_officer_change_requests(
    current_user: dict = Depends(
        require_roles(["PDS_OFFICER", "ADMIN", "SOC_ANALYST"])
    ),
    db: AsyncSession = Depends(get_db),
):
    status_filter = ["SUBMITTED", "UNDER_REVIEW", "OFFICER_VERIFICATION"]
    query = select(ChangeRequestRecord).where(
        ChangeRequestRecord.status.in_(status_filter)
    )
    mongo_query: dict[str, Any] = {"status": {"$in": status_filter}}

    if canonicalize_role(current_user.get("role", "")) == "PDS_OFFICER":
        officer_id = str(current_user.get("_id") or current_user.get("id") or "")
        if not officer_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Officer identity is missing.",
            )
        beneficiary_ids = await find_beneficiary_ids_assigned_to_officer(
            db, officer_id
        )
        query = query.where(ChangeRequestRecord.beneficiary_id.in_(beneficiary_ids))
        mongo_query["beneficiary_id"] = {"$in": beneficiary_ids}

    return {
        "success": True,
        "requests": await _find_requests(
            db,
            query,
            mongo_query,
        ),
    }


@router.get("/officer/ipfs-documents")
async def list_officer_ipfs_documents(
    current_user: dict = Depends(
        require_roles(["PDS_OFFICER", "ADMIN", "SOC_ANALYST"])
    ),
    db: AsyncSession = Depends(get_db),
):
    query = select(ChangeRequestRecord).where(
        ChangeRequestRecord.supporting_documents.is_not(None)
    )
    mongo_query: dict[str, Any] = {"supporting_documents.0": {"$exists": True}}
    if canonicalize_role(current_user.get("role", "")) == "PDS_OFFICER":
        officer_id = str(current_user.get("_id") or current_user.get("id") or "")
        if not officer_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Officer identity is missing.",
            )
        beneficiary_ids = await find_beneficiary_ids_assigned_to_officer(
            db, officer_id
        )
        query = query.where(ChangeRequestRecord.beneficiary_id.in_(beneficiary_ids))
        mongo_query["beneficiary_id"] = {"$in": beneficiary_ids}

    requests = await _find_requests(db, query, mongo_query)
    documents = []
    for request in requests:
        for document in request.get("supporting_documents", []):
            if document.get("ipfs_cid"):
                documents.append(
                    {
                        **document,
                        "request_id": request.get("id"),
                        "beneficiary_id": request.get("beneficiary_id"),
                    }
                )
    return {"success": True, "documents": documents}


async def _ensure_officer_owns_request(
    request_record: dict[str, Any], current_user: dict, db: AsyncSession
) -> None:
    if canonicalize_role(current_user.get("role", "")) != "PDS_OFFICER":
        return
    officer_id = str(current_user.get("_id") or current_user.get("id") or "")
    beneficiary = await find_user_by_id(
        db, str(request_record.get("beneficiary_id") or "")
    )
    if not beneficiary or str(beneficiary.get("assigned_pds_officer_id") or "") != officer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This request belongs to a beneficiary assigned to another officer.",
        )


@router.get("/ipfs-documents")
async def list_ipfs_documents(
    _current_user: dict = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    requests = await _find_requests(
        db,
        select(ChangeRequestRecord).where(
            ChangeRequestRecord.supporting_documents.is_not(None)
        ),
        {"supporting_documents.0": {"$exists": True}},
    )
    documents = []
    for request in requests:
        for document in request.get("supporting_documents", []):
            cid = document.get("ipfs_cid")
            if not cid:
                continue
            documents.append(
                {
                    "cid": cid,
                    "eventId": document.get("tx_hash") or document.get("document_id"),
                    "recordId": request.get("id", ""),
                    "operation": request.get("request_type", "SUPPORTING_DOCUMENT"),
                    "actor": request.get("beneficiary_name", "Beneficiary"),
                    "payloadSize": document.get("file_size", 0),
                    "fileName": document.get("file_name", "Document"),
                    "fileHash": document.get("file_hash", ""),
                    "gatewayUrl": document.get("gateway_url", ""),
                    "submittedAt": request.get("submitted_at", ""),
                }
            )
    documents.sort(key=lambda item: item["submittedAt"] or "", reverse=True)
    return {"success": True, "documents": documents[:500]}


@router.get("/{request_id}")
async def get_change_request(
    request_id: str,
    current_user: dict = Depends(
        require_roles(["PDS_OFFICER", "ADMIN", "SOC_ANALYST"])
    ),
    db: AsyncSession = Depends(get_db),
):
    records = await _find_requests(
        db,
        select(ChangeRequestRecord).where(ChangeRequestRecord.id == request_id),
        {"id": request_id},
        limit=1,
    )
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change request not found.",
        )
    request_record = records[0]
    await _ensure_officer_owns_request(request_record, current_user, db)
    return {"success": True, "request": request_record}


@router.patch("/{request_id}/withdraw")
async def withdraw_change_request(
    request_id: str,
    current_user: dict = Depends(require_roles(["BENEFICIARY"])),
    db: AsyncSession = Depends(get_db),
):
    """Allow the owning beneficiary to withdraw a request before review begins."""
    user_id = str(current_user.get("_id") or current_user.get("id") or "")
    now = datetime.now(timezone.utc)
    withdrawn_at = now.isoformat()

    collection = _mongo_collection()
    if collection is not None:
        try:
            mongo_record = await run_in_threadpool(
                lambda: collection.find_one(
                    {"id": request_id},
                    {"_id": 0, "beneficiary_id": 1, "status": 1},
                )
            )
            if mongo_record:
                if str(mongo_record.get("beneficiary_id")) != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Change request not found.",
                    )
                if mongo_record.get("status") != "SUBMITTED":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Only submitted requests can be withdrawn.",
                    )

                updated = await run_in_threadpool(
                    lambda: collection.find_one_and_update(
                        {
                            "id": request_id,
                            "beneficiary_id": user_id,
                            "status": "SUBMITTED",
                        },
                        {
                            "$set": {
                                "status": "WITHDRAWN",
                                "review_notes": "Withdrawn by beneficiary.",
                                "reviewed_by": user_id,
                                "reviewed_at": withdrawn_at,
                            }
                        },
                        return_document=ReturnDocument.AFTER,
                        projection={"_id": 0},
                    )
                )
                if updated:
                    return {"success": True, "request": updated}
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The request changed before it could be withdrawn. Refresh and try again.",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning(
                "MongoDB request withdrawal failed; trying SQL fallback: %s", exc
            )

    try:
        result = await db.execute(
            select(ChangeRequestRecord).where(
                ChangeRequestRecord.id == request_id,
                ChangeRequestRecord.beneficiary_id == user_id,
            )
        )
        record = result.scalars().first()
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change request not found.",
            )
        if record.status != "SUBMITTED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only submitted requests can be withdrawn.",
            )

        record.status = "WITHDRAWN"
        record.review_notes = "Withdrawn by beneficiary."
        record.reviewed_by = user_id
        record.reviewed_at = now.replace(tzinfo=None)
        await db.commit()
        await db.refresh(record)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception("Could not withdraw beneficiary change request")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to withdraw the request from the configured database.",
        ) from exc

    return {"success": True, "request": _serialize(record)}


@router.patch("/{request_id}/review")
async def review_change_request(
    request_id: str,
    payload: ChangeRequestReview,
    current_user: dict = Depends(require_roles(["PDS_OFFICER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    requests = await _find_requests(
        db,
        select(ChangeRequestRecord).where(ChangeRequestRecord.id == request_id),
        {"id": request_id},
        limit=1,
    )
    if not requests:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change request not found.",
        )
    request_record = requests[0]
    await _ensure_officer_owns_request(request_record, current_user, db)
    open_statuses = ["SUBMITTED", "UNDER_REVIEW", "OFFICER_VERIFICATION"]
    if request_record.get("status") not in open_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This change request is no longer awaiting review.",
        )

    reviewer_id = str(current_user.get("_id") or current_user.get("id") or "")
    reviewed_at = datetime.now(timezone.utc).isoformat()
    try:
        collection = _mongo_collection()
        mongo_record = None
        if collection is not None:
            try:
                mongo_record = await run_in_threadpool(
                    lambda: collection.find_one_and_update(
                        {
                            "id": request_id,
                            "beneficiary_id": request_record.get("beneficiary_id"),
                            "status": {"$in": open_statuses},
                        },
                        {
                            "$set": {
                                "status": payload.status,
                                "review_notes": payload.review_notes,
                                "reviewed_by": reviewer_id,
                                "reviewed_at": reviewed_at,
                            }
                        },
                        return_document=ReturnDocument.AFTER,
                        projection={"_id": 0},
                    )
                )
            except Exception as exc:
                logger.warning(
                    "MongoDB request review failed; trying SQL fallback: %s", exc
                )
        if mongo_record:
            log_action(
                reviewer_id,
                canonicalize_role(current_user.get("role", "")) or "PDS_OFFICER",
                f"CHANGE_REQUEST_{payload.status}",
                {"request_id": request_id, "beneficiary_id": request_record.get("beneficiary_id")},
            )
            return {"success": True, "request": mongo_record}

        result = await db.execute(
            select(ChangeRequestRecord).where(ChangeRequestRecord.id == request_id)
        )
        record = result.scalars().first()
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Change request not found.",
            )
        if record.status not in open_statuses:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This change request is no longer awaiting review.",
            )
        record.status = payload.status
        record.review_notes = payload.review_notes
        record.reviewed_by = reviewer_id
        record.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(record)
        log_action(
            reviewer_id,
            canonicalize_role(current_user.get("role", "")) or "PDS_OFFICER",
            f"CHANGE_REQUEST_{payload.status}",
            {"request_id": request_id, "beneficiary_id": request_record.get("beneficiary_id")},
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception("Could not update beneficiary change request")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update the request in the configured application database.",
        ) from exc

    return {"success": True, "request": _serialize(record)}
