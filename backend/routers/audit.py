"""Document Audit Ledger router for blockchain-verified document records."""

import datetime
from typing import List
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.database import get_db
from backend.models import DocumentAudit
from backend.rbac.dependencies import get_current_user, require_roles
from backend.schemas import DocumentAuditCreate, DocumentAuditOut

router = APIRouter(
    prefix="/audit",
    tags=["Document Audit Ledger"],
    dependencies=[
        Depends(require_roles(["ADMIN", "PDS_OFFICER", "SOC_ANALYST", "BENEFICIARY"]))
    ],
)


@router.post(
    "/document", response_model=DocumentAuditOut, status_code=status.HTTP_201_CREATED
)
async def record_document_audit(
    payload: DocumentAuditCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Records a blockchain-verified document upload audit trail in SQLite."""
    audit_id = f"aud-doc-{uuid.uuid4().hex[:10]}"
    audit_record = DocumentAudit(
        id=audit_id,
        user_id=current_user["_id"],
        wallet_address=current_user.get("wallet_address")
        or "0x0000000000000000000000000000000000000000",
        document_id=payload.document_id,
        ipfs_cid=payload.ipfs_cid,
        file_hash=payload.file_hash,
        tx_hash=payload.tx_hash,
        role=current_user.get("role", ""),
        status="CONFIRMED_ON_CHAIN",
        metadata_json=payload.metadata_json,
        created_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
    )

    db.add(audit_record)
    await db.commit()
    await db.refresh(audit_record)

    return audit_record


@router.get("/documents", response_model=List[DocumentAuditOut])
async def list_document_audits(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves document audit trail records from SQLite."""
    query = select(DocumentAudit).order_by(DocumentAudit.created_at.desc()).limit(100)
    res = await db.execute(query)
    return res.scalars().all()
