"""Persist beneficiary change requests and their supporting IPFS references."""

import logging
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.database.mongodb import get_mongo_db
from backend.models import ChangeRequestRecord
from backend.rbac.dependencies import require_roles

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


class ChangeRequestReview(BaseModel):
    status: Literal["UNDER_REVIEW", "APPROVED", "REJECTED", "ESCALATED"]
    review_notes: str = Field(default="", max_length=2000)


def _mongo_collection():
    try:
        return get_mongo_db()["change_requests"]
    except RuntimeError:
        return None


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
        "previous_data": payload.previous_data,
        "requested_data": payload.requested_data,
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
    _current_user: dict = Depends(
        require_roles(["PDS_OFFICER", "ADMIN", "SOC_ANALYST"])
    ),
    db: AsyncSession = Depends(get_db),
):
    return {
        "success": True,
        "requests": await _find_requests(
            db,
            select(ChangeRequestRecord).where(
                ChangeRequestRecord.status.in_(
                    ["SUBMITTED", "UNDER_REVIEW", "OFFICER_VERIFICATION"]
                )
            ),
            {
                "status": {
                    "$in": ["SUBMITTED", "UNDER_REVIEW", "OFFICER_VERIFICATION"]
                }
            },
        ),
    }


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


@router.patch("/{request_id}/review")
async def review_change_request(
    request_id: str,
    payload: ChangeRequestReview,
    current_user: dict = Depends(require_roles(["PDS_OFFICER", "ADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    try:
        collection = _mongo_collection()
        mongo_record = None
        if collection is not None:
            try:
                mongo_record = await run_in_threadpool(
                    lambda: collection.find_one_and_update(
                        {"id": request_id},
                        {
                            "$set": {
                                "status": payload.status,
                                "review_notes": payload.review_notes,
                                "reviewed_by": str(
                                    current_user.get("_id") or current_user.get("id") or ""
                                ),
                                "reviewed_at": datetime.now(timezone.utc).isoformat(),
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
        record.status = payload.status
        record.review_notes = payload.review_notes
        record.reviewed_by = str(current_user.get("_id") or current_user.get("id") or "")
        record.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(record)
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
