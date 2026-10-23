"""
backend/routers/auth.py
-----------------------
Authentication router for PDSW.
"""

import uuid
import re
import logging
import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.database import get_db
from backend.models import AuthNonce, User
from backend.schemas import (
    UserRegister,
    UserLogin,
    UserOut,
    AdminProvisionUser,
    LoginStepOneResponse,
    NonceResponse,
    VerifyWalletRequest,
    VerifyWalletResponse,
    ResetPasswordRequest,
    ForgotPasswordRequest,
    OfficerCreateBeneficiary,
    UpdateBeneficiary,
)
from backend.auth.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_temp_metamask_token,
    verify_jwt_token,
    generate_secure_nonce,
    recover_ethereum_signer,
)
from backend.rbac.dependencies import get_current_user_from_mongo, require_roles
from backend.config import settings
from backend.auth.user_store import (
    DuplicateUserError,
    find_user_by_email,
    find_user_by_id,
    find_user_by_wallet,
    get_user_store_label,
    insert_user,
    update_user,
    deactivate_user,
    activate_user,
    hard_delete_user,
    create_password_reset_token,
    verify_and_burn_password_reset_token,
)

logger = logging.getLogger("pdsw.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

from backend.rbac.roles import ROLE_DASHBOARD_MAP, ADMIN_PROVISIONED_ROLES, canonicalize_role

# ---------------------------------------------------------------------------
# Nonce TTL — configurable, stored in SQLite auth_nonces table.
# SQLite is used so nonces survive Uvicorn --reload and hot-reloads.
# ---------------------------------------------------------------------------
_NONCE_TTL_MINUTES = 15



# ---------------------------------------------------------------------------
# Helper: convert a MongoDB user document → UserOut (no password_hash leaked)
# ---------------------------------------------------------------------------
def _doc_to_user_out(doc: dict) -> UserOut:
    """
    Converts a MongoDB user document to a UserOut response model.
    password_hash is deliberately excluded – it is never returned to the client.
    """
    return UserOut(
        id=doc["_id"],
        email=doc["email"],
        role=doc["role"],
        name=doc.get("full_name", ""),
        full_name=doc.get("full_name", ""),
        phone=doc.get("phone"),
        jurisdiction=doc.get("jurisdiction"),
        wallet_address=doc.get("wallet_address"),
        status=doc.get("status", "ACTIVE"),
    )


# ===========================================================================
# SIGNUP  –  POST /auth/register
# ===========================================================================
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Creates a new user account.

    Flow:
      1. Validate role.
      2. Check email uniqueness in MongoDB pdsw.users (unique index enforces this).
      3. Hash the password with bcrypt – plain-text password is NEVER stored.
      4. Insert user document into MongoDB pdsw.users.
      5. Return UserOut (no password_hash).

    MongoDB is preferred for this data. SQLite is used only as a local fallback
    when MongoDB is unavailable.
    """
    # Public signup is completely disabled
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public account registration is disabled. Accounts must be provisioned by a PDS administrator.",
    )

    # 1. Role validation – ensure the role constant exists (defensive)
    if canonical_role not in ROLE_DASHBOARD_MAP:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: BENEFICIARY role missing.",
        )

    # 2. Check for existing email BEFORE insert (friendly error message)
    existing = await find_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An account with this email already exists "
                f"(assigned role: [{existing.get('role', 'UNKNOWN')}]). "
                "The same email cannot be registered across multiple roles."
            ),
        )

    # 3. Build user document – role forced to BENEFICIARY
    new_user_id = f"usr-ben-{uuid.uuid4().hex[:8]}"
    created_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"

    # SECURITY: bcrypt hash is safe to store; plain‑text password is discarded immediately.
    user_doc = {
        "_id":           new_user_id,
        "email":         clean_email,
        "password_hash": get_password_hash(payload.password),   # bcrypt – never plain‑text
        "role":          canonical_role,
        "full_name":     payload.full_name.strip(),
        "phone":         payload.phone,
        "jurisdiction":  payload.jurisdiction or "National Jurisdiction",
        "wallet_address": None,
        "status":        "ACTIVE",
        "created_at":    created_at_utc,
        "last_login_at": None,
    }

    # 4. Insert into MongoDB pdsw.users
    # The unique index on `email` acts as a final safety net against race conditions.
    try:
        await insert_user(db, user_doc)
        logger.info(
            "User registered in auth store – email: %s, role: %s",
            clean_email, canonical_role,
        )
    except DuplicateUserError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # 5. Return safe user profile (no password_hash)
    return _doc_to_user_out(user_doc)

@router.post("/admin/provision-user", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(["ADMIN"]))])
async def provision_user(payload: AdminProvisionUser, db: AsyncSession = Depends(get_db)):
    """Admin creates PDS Officer or SOC Analyst accounts.
    Payload.role must be one of the admin‑provisioned roles.
    """
    clean_email = payload.email.strip().lower()
    canonical_role = canonicalize_role(payload.role)
    if canonical_role not in ADMIN_PROVISIONED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only PDS Officer or SOC Analyst accounts can be provisioned by admin.",
        )
    existing = await find_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with this email already exists (role: {existing.get('role')}).",
        )

    clean_wallet = payload.wallet_address.strip().lower() if payload.wallet_address else None
    if clean_wallet:
        wallet_owner = await find_user_by_wallet(db, clean_wallet)
        if wallet_owner:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This wallet is already linked to another account. Use a different wallet or contact an administrator.",
            )

    new_user_id = f"usr-{canonical_role[:3].lower()}-{uuid.uuid4().hex[:8]}"
    created_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    user_doc = {
        "_id": new_user_id,
        "email": clean_email,
        "password_hash": get_password_hash(payload.password),
        "role": canonical_role,
        "full_name": payload.full_name.strip(),
        "phone": payload.phone,
        "jurisdiction": payload.jurisdiction or "National Jurisdiction",
        "wallet_address": clean_wallet,
        "status": "ACTIVE",
        "created_at": created_at_utc,
        "last_login_at": None,
    }
    try:
        await insert_user(db, user_doc)
        logger.info("Admin created user %s with role %s and wallet %s", clean_email, canonical_role, clean_wallet)
    except DuplicateUserError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )
    out_doc = {**user_doc, "role": canonical_role}
    return _doc_to_user_out(out_doc)


@router.post(
    "/admin/create-user",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["ADMIN"]))],
)
async def create_user_alias(payload: AdminProvisionUser, db: AsyncSession = Depends(get_db)):
    """Alias for /admin/provision-user supporting Create User terminology."""
    return await provision_user(payload, db)


@router.delete("/admin/users/{user_id}", dependencies=[Depends(require_roles(["ADMIN"]))])
async def delete_user(
    user_id: str,
    current_admin: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """
    Safely deletes/deactivates a user account.
    Admins cannot delete their own account.
    """
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "")
    admin_email = str(current_admin.get("email") or "").strip().lower()

    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )

    target_email = str(target_user.get("email") or "").strip().lower()
    if admin_id == user_id or (admin_email and admin_email == target_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own active administrator account.",
        )

    current_status = str(target_user.get("status") or "ACTIVE").upper()
    if current_status in {"INACTIVE", "DEACTIVATED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is already inactive.",
        )

    deactivated = await deactivate_user(db, user_id)
    if not deactivated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user account.",
        )

    logger.info("Admin %s deactivated user %s (%s)", admin_email, user_id, target_email)
    return {
        "success": True,
        "message": f"User account '{target_email}' deactivated successfully.",
        "user_id": user_id,
        "status": "INACTIVE",
    }


@router.patch("/admin/users/{user_id}/deactivate", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_deactivate_user(
    user_id: str,
    current_admin: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """Admin deactivates an account by setting status=INACTIVE. No data is deleted."""
    return await delete_user(user_id, current_admin, db)


@router.patch("/admin/users/{user_id}/activate", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_activate_user(
    user_id: str,
    current_admin: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """Admin reactivates the same user account by setting status=ACTIVE."""
    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested account does not exist.",
        )

    current_status = str(target_user.get("status") or "ACTIVE").upper()
    if current_status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is already active.",
        )

    activated = await activate_user(db, user_id)
    if not activated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user account.",
        )

    admin_email = str(current_admin.get("email") or "").strip().lower()
    target_email = str(target_user.get("email") or "").strip().lower()
    logger.info("Admin %s activated user %s (%s)", admin_email, user_id, target_email)
    return {
        "success": True,
        "message": f"User account '{target_email}' activated successfully.",
        "user_id": user_id,
        "status": "ACTIVE",
    }


@router.post("/admin/users/{user_id}/reset-password", dependencies=[Depends(require_roles(["ADMIN"]))])
async def admin_initiate_password_reset(
    user_id: str,
    current_admin: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """Generates a one-time password reset token for a user (Admin only)."""
    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )

    target_id = target_user.get("_id") or target_user.get("id")
    token = await create_password_reset_token(db, target_id, target_user["email"])
    return {
        "success": True,
        "message": f"Password reset token generated for {target_user['email']}.",
        "reset_token": token,
        "reset_url": f"/reset-password?token={token}",
        "email": target_user["email"],
    }


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generates a password reset token if account exists."""
    clean_email = payload.email.strip().lower()
    target_user = await find_user_by_email(db, clean_email)
    if not target_user:
        return {
            "success": True,
            "message": f"If an account is associated with {clean_email}, a reset token has been generated.",
        }

    target_id = target_user.get("_id") or target_user.get("id")
    token = await create_password_reset_token(db, target_id, target_user["email"])
    return {
        "success": True,
        "message": f"If an account is associated with {clean_email}, a reset token has been generated.",
        "reset_token": token,
        "reset_url": f"/reset-password?token={token}",
    }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resets the account password using a valid one-time token."""
    reset_record = await verify_and_burn_password_reset_token(db, payload.token.strip())
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid, expired, or has already been used.",
        )

    user_id = reset_record["user_id"]
    new_hash = get_password_hash(payload.new_password)
    await update_user(db, user_id, {"password_hash": new_hash})
    logger.info("Password successfully updated for user %s", user_id)
    return {
        "success": True,
        "message": "Password updated successfully. You can now log in with your new password.",
    }


@router.post(
    "/officer/create-beneficiary",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["ADMIN", "PDS_OFFICER"]))],
)
async def officer_create_beneficiary(
    payload: OfficerCreateBeneficiary,
    current_officer: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """PDS Officer creates a persistent BENEFICIARY user account in the database."""
    clean_email = payload.email.strip().lower()
    canonical_role = "BENEFICIARY"

    existing = await find_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with this email already exists (role: {existing.get('role')}).",
        )

    clean_wallet = payload.wallet_address.strip().lower() if payload.wallet_address else None
    if clean_wallet:
        wallet_owner = await find_user_by_wallet(db, clean_wallet)
        if wallet_owner:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This wallet is already linked to another account. Use a different wallet or contact an administrator.",
            )

    new_user_id = f"usr-ben-{uuid.uuid4().hex[:8]}"
    created_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    user_doc = {
        "_id": new_user_id,
        "email": clean_email,
        "password_hash": get_password_hash(payload.password),
        "role": canonical_role,
        "full_name": payload.full_name.strip(),
        "phone": payload.phone,
        "jurisdiction": payload.jurisdiction or current_officer.get("jurisdiction", "National Jurisdiction"),
        "wallet_address": clean_wallet,
        "status": "ACTIVE",
        "created_at": created_at_utc,
        "last_login_at": None,
    }

    try:
        await insert_user(db, user_doc)
        logger.info("Officer created Beneficiary user %s with wallet %s", clean_email, clean_wallet)
    except DuplicateUserError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    out_doc = {**user_doc, "role": canonical_role}
    return _doc_to_user_out(out_doc)


# ===========================================================================
# LOGIN PHASE 1  –  POST /auth/login
# ===========================================================================
@router.post("/login", response_model=LoginStepOneResponse)
async def login_step_one(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Phase 1: Email + Password + Role verification.

    Flow:
      1. Find user by email in MongoDB pdsw.users.
      2. Verify bcrypt password hash.
      3. Enforce role match.
      4. Check account status.
      5. Record last_login_at timestamp in MongoDB.
      6. Issue a short-lived temp token for Phase 2 (MetaMask).

    MongoDB is the preferred lookup source for user credentials.
    password_hash is NEVER returned to the frontend.
    """
    clean_email = payload.email.strip().lower()
    canonical_role = canonicalize_role(payload.role)
    auth_store = get_user_store_label()

    # 1. Find user by email
    user_doc = await find_user_by_email(db, clean_email)
    password_ok = bool(
        user_doc and verify_password(payload.password, user_doc.get("password_hash", ""))
    )

    logger.info(
        "Login attempt – email_normalized: yes, user_found: %s, stored_role: %s, "
        "account_status: %s, password_verification: %s, auth_store: %s",
        "yes" if user_doc else "no",
        user_doc.get("role", "N/A") if user_doc else "N/A",
        user_doc.get("status", "N/A") if user_doc else "N/A",
        "success" if password_ok else "failure",
        auth_store,
    )

    # 2. Verify password (constant-time; avoids user-enumeration timing attacks)
    if not user_doc or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    # 3. Strict role match – user cannot authenticate as a different role
    user_canonical_role = canonicalize_role(user_doc.get("role", ""))
    if user_canonical_role != canonical_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access denied: The selected role [{payload.role}] does not match "
                f"your registered role [{user_doc.get('role')}]."
            ),
        )

    # 4. Account status check
    if user_doc.get("status", "ACTIVE") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Your account is currently {user_doc.get('status')}. "
                "Please contact the administrator."
            ),
        )

    # 5. Record login timestamp in MongoDB (non-critical – logged on failure, not raised)
    try:
        await update_user(
            db,
            user_doc["_id"],
            {"last_login_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"},
        )
    except Exception as exc:
        logger.warning("Could not update last_login_at for %s: %s", clean_email, exc)

    # 6. Issue Phase 1 intermediate temp token ONLY (Step 1 alone MUST NOT issue session token)
    temp_token = create_temp_metamask_token(
        user_doc["_id"], user_doc["email"], user_canonical_role
    )

    return LoginStepOneResponse(
        success=True,
        requires_metamask=True,
        temp_token=temp_token,
        token=None,
        redirect_url=None,
        user=_doc_to_user_out(user_doc),
        message="Credentials verified. Please proceed to MetaMask Sepolia verification.",
    )


# ===========================================================================
# METAMASK NONCE  –  GET /auth/nonce
# ===========================================================================
@router.get("/nonce", response_model=NonceResponse)
async def get_auth_nonce(
    address: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(None),
):
    """
    Generates a cryptographically strong unique authentication nonce.
    Persisted in SQLite AuthNonce table to prevent replay attacks.
    This is MetaMask SIWE flow data – NOT user account data – so SQLite is correct here.
    """
    clean_address = address.strip().lower()
    if not re.match(r"^0x[a-fA-F0-9]{40}$", clean_address):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Ethereum wallet address format.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing intermediate authorization token. Please complete step 1 login first.",
        )

    token = authorization.split(" ")[1]
    decoded = verify_jwt_token(token)
    if not decoded or not decoded.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired intermediate login token. Please restart login.",
        )

    if decoded.get("step") != "METAMASK_PENDING":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid intermediate authentication token. Please restart login.",
        )

    user_id = decoded["sub"]

    nonce_val = generate_secure_nonce()
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    expires_at = now + datetime.timedelta(minutes=_NONCE_TTL_MINUTES)

    # Persist nonce in SQLite — survives Uvicorn --reload and hot-reloads.
    # Do not delete older unused nonces here. MetaMask can keep an older
    # signature popup open while the UI requests a fresh challenge; deleting
    # the old row makes that valid popup fail as "expired/not found".
    try:
        old_nonces = await db.execute(
            select(AuthNonce).where(
                AuthNonce.wallet_address == clean_address,
                AuthNonce.used.is_(False),
                AuthNonce.expires_at < now,
            )
        )
        for old in old_nonces.scalars().all():
            old.used = True
    except Exception:
        pass  # Non-fatal cleanup

    auth_nonce = AuthNonce(
        user_id=user_id,
        wallet_address=clean_address,
        nonce=nonce_val,
        expires_at=expires_at,
        used=False,
    )
    db.add(auth_nonce)
    await db.commit()
    await db.refresh(auth_nonce)

    # Use a fixed frontend domain/uri so the SIWE message is consistent
    # regardless of which host header the Python server receives
    domain = "localhost"
    uri = "http://localhost:3000"

    logger.info(
        "[AUTH] Challenge created — wallet: %s, nonce: %s..., expires_at: %s",
        clean_address,
        nonce_val[:8],
        expires_at.isoformat(),
    )

    return NonceResponse(
        success=True,
        nonce=nonce_val,
        domain=domain,
        uri=uri,
        chainId=settings.SEPOLIA_CHAIN_ID,
        issuedAt=now.isoformat() + "Z",
        expiresAt=expires_at.isoformat() + "Z",
    )


# ===========================================================================
# METAMASK VERIFY  –  POST /auth/verify-wallet
# ===========================================================================
@router.post("/verify-wallet", response_model=VerifyWalletResponse)
async def verify_wallet_and_login(
    payload: VerifyWalletRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(None),
):
    """
    Phase 2: Cryptographic SIWE Signature Verification & 1-to-1 Wallet Association.

    1. Validates the Phase 1 temp token.
    2. Recovers Ethereum signer from signature.
    3. Verifies the nonce in SQLite and burns it (replay-attack prevention).
    4. Loads the user from MongoDB pdsw.users.
    5. Enforces 1-to-1 wallet ownership (checked in MongoDB).
    6. Persists public wallet_address to MongoDB pdsw.users (NOT private key).
    7. Issues full session JWT.
    """
    if payload.chain_id != settings.SEPOLIA_CHAIN_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please switch MetaMask to the Sepolia network.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing intermediate authorization token. Please complete step 1 login first.",
        )

    token = authorization.split(" ")[1]
    decoded = verify_jwt_token(token)
    if not decoded or not decoded.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired intermediate login token. Please restart login.",
        )

    if decoded.get("step") != "METAMASK_PENDING":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid intermediate authentication token. Please restart login.",
        )

    user_id = decoded["sub"]
    clean_address = payload.wallet_address.strip().lower()

    # 1. Recover Ethereum signer from signature
    try:
        recovered_address = recover_ethereum_signer(payload.message, payload.signature)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Cryptographic signature verification failed: {str(err)}",
        )

    if recovered_address.lower() != clean_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Signer mismatch. Claimed: {clean_address}, Recovered: {recovered_address.lower()}",
        )

    # 2. Extract and validate nonce from the signed message
    nonce_match = re.search(r"Nonce:\s*([a-fA-F0-9]+)", payload.message)
    if not nonce_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication message is missing a valid Nonce field.",
        )
    message_nonce = nonce_match.group(1).strip()

    # 3. Verify nonce in SQLite and burn it immediately (atomic, survives reloads)
    now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    nonce_query = await db.execute(
        select(AuthNonce).where(
            AuthNonce.user_id == user_id,
            AuthNonce.wallet_address == clean_address,
            AuthNonce.nonce == message_nonce,
        )
    )
    nonce_record = nonce_query.scalars().first()

    if not nonce_record:
        logger.warning("[AUTH] Challenge not found — user: %s, wallet: %s, nonce: %s...", user_id, clean_address, message_nonce[:8])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication challenge not found. Please click 'Get New Challenge' to request a fresh one.",
        )

    if nonce_record.used:
        logger.warning("[AUTH] Challenge already used — wallet: %s", clean_address)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Replay attack prevented: this authentication challenge has already been used. Please sign in again.",
        )

    if nonce_record.expires_at < now_utc:
        logger.warning(
            "[AUTH] Challenge expired — wallet: %s, expired_at: %s, now: %s",
            clean_address, nonce_record.expires_at.isoformat(), now_utc.isoformat(),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication challenge expired. Please click 'Get New Challenge' to request a fresh one.",
        )

    logger.info(
        "[AUTH] Challenge valid — wallet: %s, nonce: %s..., expires_at: %s",
        clean_address, message_nonce[:8], nonce_record.expires_at.isoformat(),
    )

    # Burn the nonce — mark used before any further checks to prevent races
    nonce_record.used = True
    await db.commit()

    # 4. Load user from auth store
    user_doc = await find_user_by_id(db, user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    # 5. Enforce registered wallet match or establish initial wallet
    registered_wallet = (user_doc.get("wallet_address") or "").strip().lower()
    if registered_wallet:
        if registered_wallet != clean_address:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The connected wallet does not match the wallet registered for this account.",
            )
    else:
        # Initial wallet association (e.g. initial Admin setup)
        wallet_owner = await find_user_by_wallet(db, clean_address, exclude_user_id=user_id)
        if wallet_owner:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This wallet is already linked to another account. Use a different wallet or contact an administrator.",
            )
        await update_user(
            db,
            user_id,
            {
                "wallet_address": clean_address,
                "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
            },
        )
        user_doc["wallet_address"] = clean_address

    # 6. Issue full authenticated session JWT (always use canonical role)
    canonical_user_role = canonicalize_role(user_doc.get("role", ""))
    session_token = create_access_token({
        "sub":           user_doc["_id"],
        "userId":        user_doc["_id"],
        "email":         user_doc["email"],
        "role":          canonical_user_role,
        "walletAddress": clean_address,
        "name":          user_doc.get("full_name", ""),
        "jurisdiction":  user_doc.get("jurisdiction", ""),
    })
    redirect_url = ROLE_DASHBOARD_MAP.get(canonical_user_role, "/beneficiary/dashboard")

    return VerifyWalletResponse(
        success=True,
        token=session_token,
        redirect_url=redirect_url,
        user=_doc_to_user_out(user_doc),
        message="Cryptographic wallet authentication successful. Session established.",
    )


# ===========================================================================
# WALLET LOGIN  –  GET /auth/users/by-wallet/{wallet_address}
# Disabled: Direct wallet login without database verification is forbidden.
# ===========================================================================
@router.get("/users/by-wallet/{wallet_address}")
async def get_session_by_wallet(
    wallet_address: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Direct single-step wallet login is completely disabled.
    Every user must complete Step 1 (database credentials) followed by
    Step 2 (MetaMask Sepolia verification).
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Direct wallet authentication is disabled. Two-step authentication (Database credentials + MetaMask Sepolia) is mandatory for all accounts.",
    )


# ===========================================================================
# PROFILE  –  GET /auth/me
# ===========================================================================
@router.get("/me", response_model=UserOut, dependencies=[Depends(require_roles(["ADMIN","PDS_OFFICER","SOC_ANALYST","BENEFICIARY"]))])
async def get_authenticated_profile(
    current_user: dict = Depends(get_current_user_from_mongo),
):
    """
    Returns the authenticated user's profile loaded from MongoDB pdsw.users.
    password_hash is never included in the response.
    """
    return _doc_to_user_out(current_user)


# ===========================================================================
# LOGOUT  –  POST /auth/logout
# ===========================================================================
@router.post("/logout", dependencies=[Depends(require_roles(["ADMIN","PDS_OFFICER","SOC_ANALYST","BENEFICIARY"]))])
async def logout(current_user: dict = Depends(get_current_user_from_mongo)):
    """Ends the user session (client discards the JWT)."""
    return {"success": True, "message": "Successfully logged out."}


# ===========================================================================
# BOOTSTRAP ADMIN  –  POST /auth/bootstrap-admin
# ===========================================================================
@router.post("/bootstrap-admin", status_code=status.HTTP_201_CREATED)
async def bootstrap_admin(
    payload: AdminProvisionUser,
    db: AsyncSession = Depends(get_db),
    x_bootstrap_token: Optional[str] = Header(None, alias="X-Bootstrap-Token"),
):
    """
    One-time secure endpoint to create the very first ADMIN account.

    Security guarantees:
    - Requires a secret token (X-Bootstrap-Token) that matches BOOTSTRAP_ADMIN_SECRET
      stored in backend/.env — never exposed to the frontend.
    - Auto-disables permanently once any ADMIN exists in the database (returns 409).
    - Cannot be used to create duplicate admins or non-admin roles.
    - No unauthenticated data is returned beyond success/failure status.
    """
    # 1. Validate bootstrap token (constant-time comparison via secrets.compare_digest)
    import secrets as _secrets
    expected_token = settings.BOOTSTRAP_ADMIN_SECRET
    if not x_bootstrap_token or not _secrets.compare_digest(
        x_bootstrap_token.strip(), expected_token
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing bootstrap token.",
        )

    # 2. Check if ANY admin already exists — if so, bootstrap is disabled permanently
    users_col = None
    try:
        from backend.database.mongodb import get_users_collection
        users_col = get_users_collection()
    except RuntimeError:
        pass

    existing_admin = None
    if users_col is not None:
        try:
            existing_admin = users_col.find_one({"role": "ADMIN"})
        except Exception:
            pass
    else:
        result = await db.execute(
            select(User).where(User.role == "ADMIN")  # type: ignore[attr-defined]
        )
        existing_admin = result.scalars().first()

    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="System already initialized. An administrator account already exists. Bootstrap is permanently disabled.",
        )

    # 3. Validate that payload role is ADMIN
    if payload.role.strip().upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bootstrap endpoint only creates ADMIN accounts.",
        )

    # 4. Create the admin account
    clean_email = payload.email.strip().lower()
    existing = await find_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with this email already exists (role: {existing.get('role')}).",
        )

    new_user_id = f"usr-adm-{uuid.uuid4().hex[:8]}"
    created_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    user_doc = {
        "_id": new_user_id,
        "email": clean_email,
        "password_hash": get_password_hash(payload.password),
        "role": "ADMIN",
        "full_name": payload.full_name.strip(),
        "phone": payload.phone,
        "jurisdiction": payload.jurisdiction or "National Headquarters",
        "wallet_address": None,
        "status": "ACTIVE",
        "created_at": created_at_utc,
        "last_login_at": None,
    }

    try:
        await insert_user(db, user_doc)
        logger.info("Bootstrap: First ADMIN account created — email: %s", clean_email)
    except DuplicateUserError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    return {
        "success": True,
        "message": "First administrator account created successfully. Bootstrap is now permanently disabled.",
        "user": _doc_to_user_out(user_doc),
    }


# ===========================================================================
# LIST USERS  –  GET /auth/users  (ADMIN only)
# ===========================================================================
@router.get("/users", dependencies=[Depends(require_roles(["ADMIN"]))])
async def list_all_users(db: AsyncSession = Depends(get_db)):
    """
    Returns all user accounts from the auth store (MongoDB preferred, SQLite fallback).
    password_hash is NEVER included in the response.
    """
    users_col = None
    try:
        from backend.database.mongodb import get_users_collection
        users_col = get_users_collection()
    except RuntimeError:
        pass

    if users_col is not None:
        try:
            docs = list(users_col.find({}, {"password_hash": 0}))
            return {"success": True, "users": [_doc_to_user_out(d).model_dump() for d in docs]}
        except Exception as exc:
            logger.warning("MongoDB list users failed; falling back to SQLite: %s", exc)

    # SQLite fallback
    result = await db.execute(select(User))  # type: ignore[attr-defined]
    sqlite_users = result.scalars().all()
    users_out = [
        _doc_to_user_out({
            "_id": u.id, "email": u.email, "role": u.role,
            "full_name": u.full_name, "phone": u.phone,
            "jurisdiction": u.jurisdiction, "wallet_address": u.wallet_address,
            "status": u.status,
        }).model_dump()
        for u in sqlite_users
    ]
    return {"success": True, "users": users_out}


# ===========================================================================
# PLATFORM STATS  –  GET /auth/stats  (ADMIN only)
# ===========================================================================
@router.get("/stats", dependencies=[Depends(require_roles(["ADMIN"]))])
async def platform_stats(db: AsyncSession = Depends(get_db)):
    """
    Returns active user counts from the database — deactivated/suspended accounts excluded.
    totalUsers and per-role counts only include ACTIVE accounts so the dashboard
    'Manage Users' badge reflects the live operational headcount.
    """
    users_col = None
    try:
        from backend.database.mongodb import get_users_collection
        users_col = get_users_collection()
    except RuntimeError:
        pass

    counts = {"ADMIN": 0, "PDS_OFFICER": 0, "SOC_ANALYST": 0, "BENEFICIARY": 0}

    if users_col is not None:
        try:
            # Only count ACTIVE users — deactivated accounts are excluded from the KPI
            pipeline = [
                {"$match": {"status": "ACTIVE"}},
                {"$group": {"_id": "$role", "count": {"$sum": 1}}},
            ]
            for doc in users_col.aggregate(pipeline):
                role_key = doc["_id"]
                if role_key in counts:
                    counts[role_key] = doc["count"]
        except Exception as exc:
            logger.warning("MongoDB stats failed; falling back to SQLite: %s", exc)
            users_col = None

    if users_col is None:
        for role_key in counts:
            result = await db.execute(
                select(User).where(
                    User.role == role_key,  # type: ignore[attr-defined]
                    User.status == "ACTIVE",  # type: ignore[attr-defined]
                )
            )
            counts[role_key] = len(result.scalars().all())

    total = sum(counts.values())
    return {
        "success": True,
        "stats": {
            "totalUsers": total,
            "admins": counts["ADMIN"],
            "pdsOfficers": counts["PDS_OFFICER"],
            "socAnalysts": counts["SOC_ANALYST"],
            "beneficiaries": counts["BENEFICIARY"],
            "pendingRequests": 0,
            "totalDistributions": 0,
            "totalAuditEvents": 0,
        },
    }


# ===========================================================================
# OFFICER BENEFICIARY LIST  –  GET /auth/officer/beneficiaries
# Uses the same persistent account store as the Admin User Management page.
# ===========================================================================
@router.get(
    "/officer/beneficiaries",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_list_beneficiaries(
    db: AsyncSession = Depends(get_db),
):
    """Returns every persistent BENEFICIARY account visible to PDS Officers."""
    users_col = None
    try:
        from backend.database.mongodb import get_users_collection
        users_col = get_users_collection()
    except RuntimeError:
        pass

    if users_col is not None:
        try:
            docs = list(users_col.find({"role": "BENEFICIARY"}, {"password_hash": 0}))
            return {"success": True, "beneficiaries": [_doc_to_user_out(doc).model_dump() for doc in docs]}
        except Exception as exc:
            logger.warning("MongoDB beneficiary list failed; falling back to SQLite: %s", exc)

    result = await db.execute(select(User).where(User.role == "BENEFICIARY"))  # type: ignore[attr-defined]
    beneficiaries = [
        _doc_to_user_out({
            "_id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
            "phone": user.phone,
            "jurisdiction": user.jurisdiction,
            "wallet_address": user.wallet_address,
            "status": user.status,
            "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
            "updated_at": user.updated_at.isoformat() + "Z" if user.updated_at else None,
        }).model_dump()
        for user in result.scalars().all()
    ]
    return {"success": True, "beneficiaries": beneficiaries}


# ===========================================================================
# OFFICER CREATE BENEFICIARY  –  POST /auth/officer/create-beneficiary
# ===========================================================================
@router.post(
    "/officer/create-beneficiary",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_create_beneficiary(
    payload: AdminProvisionUser,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_from_mongo),
):
    """
    PDS Officer creates a Beneficiary account.
    Only BENEFICIARY role is allowed through this endpoint.
    """
    if payload.role.strip().upper() != "BENEFICIARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officers can only create Beneficiary accounts.",
        )

    clean_email = payload.email.strip().lower()
    existing = await find_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with this email already exists (role: {existing.get('role')}).",
        )

    new_user_id = f"usr-ben-{uuid.uuid4().hex[:8]}"
    created_at_utc = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
    user_doc = {
        "_id": new_user_id,
        "email": clean_email,
        "password_hash": get_password_hash(payload.password),
        "role": "BENEFICIARY",
        "full_name": payload.full_name.strip(),
        "phone": payload.phone,
        "jurisdiction": payload.jurisdiction or "National Jurisdiction",
        "wallet_address": None,
        "status": "ACTIVE",
        "created_at": created_at_utc,
        "last_login_at": None,
    }

    try:
        await insert_user(db, user_doc)
        logger.info(
            "PDS Officer %s created beneficiary %s",
            current_user.get("email"), clean_email,
        )
    except DuplicateUserError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    return _doc_to_user_out(user_doc)



# ===========================================================================
# OFFICER — EDIT BENEFICIARY  –  PATCH /auth/officer/beneficiaries/{user_id}
# PDS Officer can edit ONLY BENEFICIARY accounts. Role cannot be changed.
# ===========================================================================
@router.patch(
    "/officer/beneficiaries/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_update_beneficiary(
    user_id: str,
    payload: UpdateBeneficiary,
    current_officer: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """
    PDS Officer updates a BENEFICIARY account's profile details.
    Role is immutable — officer cannot promote or change the beneficiary's role.
    Officer cannot edit ADMIN, PDS_OFFICER, or SOC_ANALYST accounts.
    """
    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary with ID '{user_id}' not found.",
        )

    # Security: officer can only edit BENEFICIARY accounts
    target_role = canonicalize_role(target_user.get("role", ""))
    if target_role != "BENEFICIARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"PDS Officer can only edit BENEFICIARY accounts. Target account role is [{target_role}].",
        )

    updates: dict = {}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name.strip()
    if payload.phone is not None:
        updates["phone"] = payload.phone
    if payload.jurisdiction is not None:
        updates["jurisdiction"] = payload.jurisdiction
    if payload.card_category is not None:
        updates["card_category"] = payload.card_category
    if updates:
        updates["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        await update_user(db, user_id, updates)
        # Reload updated record
        target_user = await find_user_by_id(db, user_id)

    logger.info(
        "PDS Officer %s updated beneficiary %s fields: %s",
        current_officer.get("email"), user_id, list(updates.keys()),
    )
    return _doc_to_user_out(target_user)


# ===========================================================================
# OFFICER — DEACTIVATE BENEFICIARY  –  DELETE /auth/officer/beneficiaries/{user_id}
# PDS Officer can deactivate ONLY BENEFICIARY accounts.
# ===========================================================================
@router.delete(
    "/officer/beneficiaries/{user_id}",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_deactivate_beneficiary(
    user_id: str,
    current_officer: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """
    PDS Officer soft-deactivates a BENEFICIARY account.
    Deactivated accounts cannot login. Historical records are preserved.
    Officer cannot deactivate ADMIN, PDS_OFFICER, or SOC_ANALYST accounts.
    """
    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary with ID '{user_id}' not found.",
        )

    # Security: officer can only deactivate BENEFICIARY accounts
    target_role = canonicalize_role(target_user.get("role", ""))
    if target_role != "BENEFICIARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"PDS Officer can only deactivate BENEFICIARY accounts. Target role is [{target_role}].",
        )

    current_status = str(target_user.get("status") or "ACTIVE").upper()
    if current_status in {"INACTIVE", "DEACTIVATED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This beneficiary account is already inactive.",
        )

    target_email = str(target_user.get("email") or "").strip().lower()
    deactivated = await deactivate_user(db, user_id)
    if not deactivated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate beneficiary account.",
        )

    logger.info(
        "PDS Officer %s deactivated beneficiary %s (%s)",
        current_officer.get("email"), user_id, target_email,
    )
    return {
        "success": True,
        "message": f"Beneficiary account '{target_email}' deactivated successfully.",
        "user_id": user_id,
        "status": "INACTIVE",
    }


@router.patch(
    "/officer/beneficiaries/{user_id}/deactivate",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_deactivate_beneficiary_patch(
    user_id: str,
    current_officer: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """PDS Officer deactivates a BENEFICIARY account without deleting data."""
    return await officer_deactivate_beneficiary(user_id, current_officer, db)


@router.patch(
    "/officer/beneficiaries/{user_id}/activate",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_activate_beneficiary(
    user_id: str,
    current_officer: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """PDS Officer reactivates only BENEFICIARY accounts."""
    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary with ID '{user_id}' not found.",
        )

    target_role = canonicalize_role(target_user.get("role", ""))
    if target_role != "BENEFICIARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"PDS Officer can only activate BENEFICIARY accounts. Target role is [{target_role}].",
        )

    current_status = str(target_user.get("status") or "ACTIVE").upper()
    if current_status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This beneficiary account is already active.",
        )

    activated = await activate_user(db, user_id)
    if not activated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate beneficiary account.",
        )

    target_email = str(target_user.get("email") or "").strip().lower()
    logger.info(
        "PDS Officer %s activated beneficiary %s (%s)",
        current_officer.get("email"), user_id, target_email,
    )
    return {
        "success": True,
        "message": f"Beneficiary account '{target_email}' activated successfully.",
        "user_id": user_id,
        "status": "ACTIVE",
    }


# ===========================================================================
# OFFICER — RESET BENEFICIARY PASSWORD  –  POST /auth/officer/beneficiaries/{user_id}/reset-password
# PDS Officer can reset password ONLY for BENEFICIARY accounts.
# ===========================================================================
@router.post(
    "/officer/beneficiaries/{user_id}/reset-password",
    dependencies=[Depends(require_roles(["PDS_OFFICER"]))],
)
async def officer_reset_beneficiary_password(
    user_id: str,
    current_officer: dict = Depends(get_current_user_from_mongo),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a one-time password reset token for a BENEFICIARY account.
    PDS Officer cannot reset passwords for ADMIN, PDS_OFFICER, or SOC_ANALYST.
    """
    target_user = await find_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary with ID '{user_id}' not found.",
        )

    # Security: officer can only reset BENEFICIARY passwords
    target_role = canonicalize_role(target_user.get("role", ""))
    if target_role != "BENEFICIARY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"PDS Officer can only reset passwords for BENEFICIARY accounts. Target role is [{target_role}].",
        )

    target_id = target_user.get("_id") or target_user.get("id")
    reset_token = await create_password_reset_token(db, target_id, target_user["email"])

    logger.info(
        "PDS Officer %s generated password reset for beneficiary %s",
        current_officer.get("email"), user_id,
    )
    return {
        "success": True,
        "message": f"Password reset token generated for {target_user['email']}.",
        "reset_token": reset_token,
        "reset_url": f"/reset-password?token={reset_token}",
        "email": target_user["email"],
    }
