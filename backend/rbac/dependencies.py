"""FastAPI dependency functions for authentication and role-based access control."""

from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from backend.auth.security import verify_jwt_token
from backend.auth.user_store import (
    find_user_by_email,
    find_user_by_id,
    find_user_by_wallet,
)
from backend.database import get_db
from backend.rbac.roles import canonicalize_role

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user_from_mongo(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
        )

    payload = verify_jwt_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
        )

    if payload.get("step") == "METAMASK_PENDING":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication incomplete. Step 2 MetaMask Sepolia verification is required.",
        )

    user_id = payload.get("sub") or payload.get("userId")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload identity.",
        )

    try:
        user_doc = await find_user_by_id(db, user_id)
        if not user_doc and payload.get("email"):
            user_doc = await find_user_by_email(db, payload.get("email"))
        if not user_doc and payload.get("walletAddress"):
            user_doc = await find_user_by_wallet(db, payload.get("walletAddress"))
        if not user_doc and str(payload.get("role", "")).upper() == "ADMIN":
            from backend.config import settings

            token_email = (payload.get("email") or "").strip().lower()
            if settings.ADMIN_EMAIL and token_email == settings.ADMIN_EMAIL.strip().lower():
                user_doc = await find_user_by_email(db, settings.ADMIN_EMAIL)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service temporarily unavailable: {exc}",
        )

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )

    if user_doc.get("status", "ACTIVE") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user_doc.get('status')}. Contact system administrator.",
        )

    return user_doc


get_current_user = get_current_user_from_mongo


def require_roles(allowed_roles: List[str]):
    async def role_checker(
        user_doc: dict = Depends(get_current_user_from_mongo),
    ) -> dict:
        role_val = user_doc.get("role")
        if hasattr(role_val, "value"):
            raw_role = str(role_val.value)
        else:
            raw_role = str(role_val or "")
        canonical_role = canonicalize_role(raw_role)
        allowed_canonical = [canonicalize_role(r) for r in allowed_roles]
        if canonical_role is None or canonical_role not in allowed_canonical:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Role [{canonical_role}] is not authorised "
                    "for this portal resource."
                ),
            )
        return user_doc

    return role_checker
