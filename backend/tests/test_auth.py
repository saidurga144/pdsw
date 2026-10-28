import uuid
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from eth_account import Account
from eth_account.messages import encode_defunct
import datetime
import secrets
from backend.main import app
from backend import database
from backend.auth.security import get_password_hash
from backend.auth.user_store import insert_user, find_user_by_id, DuplicateUserError
from backend.auth import user_store
from backend.auth.rate_limiter import limiter
from backend.config import is_strong_secret
from backend.rbac.roles import canonicalize_role

TEST_USER_EMAIL = "test.ephemeral@pds.gov.in"


def test_legacy_roles_are_normalized_and_unknown_roles_rejected():
    assert canonicalize_role("OFFICER") == "PDS_OFFICER"
    assert canonicalize_role("SOC") == "SOC_ANALYST"
    assert canonicalize_role("unknown-role") is None


def test_secret_strength_rejects_placeholders_and_low_entropy_values():
    assert is_strong_secret(secrets.token_urlsafe(48))
    assert not is_strong_secret("A" * 64)
    assert not is_strong_secret("replace-with-a-real-random-secret-value")


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database(tmp_path_factory):
    """Run auth tests against a disposable SQLite database, never local app data."""
    database_path = tmp_path_factory.mktemp("pdsw-auth-tests") / "auth-tests.sqlite3"
    test_url = f"sqlite+aiosqlite:///{database_path.as_posix()}"
    test_engine, test_session_factory = database._create_engine_and_maker(test_url)
    original_engine = database.engine
    original_session_factory = database.AsyncSessionLocal
    database.engine = test_engine
    database.AsyncSessionLocal = test_session_factory

    try:
        with patch.object(user_store, "_mongo_collection_or_none", return_value=None):
            await database.init_db()
            async with database.AsyncSessionLocal() as db:
                await insert_user(
                    db,
                    {
                        "_id": "usr-test-ephemeral",
                        "email": TEST_USER_EMAIL,
                        "password_hash": get_password_hash("password123"),
                        "role": "BENEFICIARY",
                        "full_name": "Test User",
                        "phone": "9876543210",
                        "jurisdiction": "Test Zone",
                        "wallet_address": None,
                        "status": "ACTIVE",
                        "created_at": datetime.datetime.now(
                            datetime.timezone.utc
                        ).isoformat()
                        + "Z",
                        "last_login_at": None,
                    },
                )
            yield
    finally:
        await test_engine.dispose()
        database.engine = original_engine
        database.AsyncSessionLocal = original_session_factory


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["chain_id"] == 11155111


@pytest.mark.asyncio
async def test_public_registration_disabled():
    """
    Verifies that public self-registration is completely disabled.
    All account registration endpoints must return 403 Forbidden.
    """
    test_email = "test.citizen@pds.gov.in"
    password = "SecurePassword2026!"

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        reg_payload = {
            "email": test_email,
            "password": password,
            "role": "BENEFICIARY",
            "full_name": "Ravi Kumar",
        }
        res = await client.post("/api/auth/register", json=reg_payload)
        assert res.status_code == 403
        assert "disabled" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_two_phase_authentication_and_metamask_verification():
    """
    Tests the complete 2-Phase authentication flow:
    Phase 1: Database credentials login -> returns temp_token
    Phase 2: Nonce generation -> SIWE personal_sign -> verify-wallet -> returns session token
    """
    login_email = TEST_USER_EMAIL
    password = "password123"

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_res = await client.post(
            "/api/auth/login",
            json={
                "email": login_email,
                "password": password,
                "role": "BENEFICIARY",
            },
        )
        assert login_res.status_code == 200
        step1_data = login_res.json()
        assert step1_data["requires_metamask"] is True
        temp_token = step1_data["temp_token"]
        assert temp_token is not None

        mismatch_res = await client.post(
            "/api/auth/login",
            json={
                "email": login_email,
                "password": password,
                "role": "ADMIN",
            },
        )
        assert mismatch_res.status_code == 403
        assert "does not match your registered role" in mismatch_res.json()["detail"]

        wallet = Account.create()
        wallet_address = wallet.address

        nonce_res = await client.get(
            f"/api/auth/nonce?address={wallet_address}",
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        assert nonce_res.status_code == 200
        nonce_data = nonce_res.json()
        nonce = nonce_data["nonce"]
        assert nonce is not None

        # A newer challenge must not invalidate an older MetaMask popup that is
        # still waiting for the user to confirm the signature.
        newer_nonce_res = await client.get(
            f"/api/auth/nonce?address={wallet_address}",
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        assert newer_nonce_res.status_code == 200
        assert newer_nonce_res.json()["nonce"] != nonce

        siwe_message = (
            f"{nonce_data['domain']} wants you to sign in with your Ethereum account:\n"
            f"{wallet_address}\n\n"
            f"Sign in to Public Distribution System Welfare (PDSW) Government Portal with your verified wallet.\n\n"
            f"URI: {nonce_data['uri']}\n"
            f"Version: 1\n"
            f"Chain ID: {nonce_data['chainId']}\n"
            f"Nonce: {nonce}\n"
            f"Issued At: {nonce_data['issuedAt']}\n"
            f"Expiration Time: {nonce_data['expiresAt']}"
        )

        encoded_msg = encode_defunct(text=siwe_message)
        signed_msg = Account.sign_message(encoded_msg, private_key=wallet.key)
        signature = signed_msg.signature.hex()
        if not signature.startswith("0x"):
            signature = "0x" + signature

        verify_res = await client.post(
            "/api/auth/verify-wallet",
            json={
                "wallet_address": wallet_address,
                "message": siwe_message,
                "signature": signature,
                "chain_id": 11155111,
            },
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["success"] is True
        assert verify_data["token"] is not None
        assert verify_data["redirect_url"] == "/beneficiary/dashboard"
        assert verify_data["user"]["wallet_address"].lower() == wallet_address.lower()

        replay_res = await client.post(
            "/api/auth/verify-wallet",
            json={
                "wallet_address": wallet_address,
                "message": siwe_message,
                "signature": signature,
                "chain_id": 11155111,
            },
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        assert replay_res.status_code == 401
        assert "replay attack prevented" in replay_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_provision_pds_officer_and_login():
    """Admin-provisioned PDS Officer must authenticate with the same credentials."""
    admin_id = f"usr-adm-test-{uuid.uuid4().hex[:8]}"
    admin_email = f"admin.provision.{uuid.uuid4().hex[:8]}@pds.gov.in"
    admin_password = "adminpass123"
    officer_email = f"officer.test.{uuid.uuid4().hex[:8]}@pds.gov.in"
    officer_password = "SecureOfficer2026!"

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        async with database.AsyncSessionLocal() as db:
            try:
                await insert_user(
                    db,
                    {
                        "_id": admin_id,
                        "email": admin_email,
                        "password_hash": get_password_hash(admin_password),
                        "role": "ADMIN",
                        "full_name": "Provision Test Admin",
                        "phone": "9876543210",
                        "jurisdiction": "Test HQ",
                        "wallet_address": None,
                        "status": "ACTIVE",
                        "created_at": datetime.datetime.now(
                            datetime.timezone.utc
                        ).isoformat()
                        + "Z",
                        "last_login_at": None,
                    },
                )
            except DuplicateUserError:
                pass

        admin_login = await client.post(
            "/api/auth/login",
            json={
                "email": admin_email,
                "password": admin_password,
                "role": "ADMIN",
            },
        )
        assert admin_login.status_code == 200
        admin_login.json()["temp_token"]

        from backend.auth.security import create_access_token

        admin_token = create_access_token(
            {
                "sub": admin_id,
                "userId": admin_id,
                "email": admin_email,
                "role": "ADMIN",
            }
        )

        provision_res = await client.post(
            "/api/auth/admin/provision-user",
            json={
                "email": officer_email,
                "password": officer_password,
                "role": "PDS_OFFICER",
                "full_name": "Test PDS Officer",
                "phone": "9123456789",
                "jurisdiction": "Central Delhi",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert provision_res.status_code == 201, provision_res.text
        provision_data = provision_res.json()
        assert provision_data["role"] == "PDS_OFFICER"
        assert provision_data["email"] == officer_email

        officer_login = await client.post(
            "/api/auth/login",
            json={
                "email": officer_email,
                "password": officer_password,
                "role": "PDS_OFFICER",
            },
        )
        assert officer_login.status_code == 200, officer_login.text
        step1 = officer_login.json()
        assert step1["user"]["role"] == "PDS_OFFICER"

        legacy_role_login = await client.post(
            "/api/auth/login",
            json={
                "email": officer_email,
                "password": officer_password,
                "role": "OFFICER",
            },
        )
        assert legacy_role_login.status_code == 200

        wrong_password = await client.post(
            "/api/auth/login",
            json={
                "email": officer_email,
                "password": "WrongPassword!",
                "role": "PDS_OFFICER",
            },
        )
        assert wrong_password.status_code == 401

        role_mismatch = await client.post(
            "/api/auth/login",
            json={
                "email": officer_email,
                "password": officer_password,
                "role": "BENEFICIARY",
            },
        )
        assert role_mismatch.status_code == 403
        assert "does not match your registered role" in role_mismatch.json()["detail"]


@pytest.mark.asyncio
async def test_admin_can_deactivate_and_reactivate_same_user_account():
    """Status changes block login, preserve identity, and restore the same account."""
    from backend.auth.security import create_access_token

    suffix = uuid.uuid4().hex[:10]
    admin_id = f"usr-admin-status-{suffix}"
    user_id = f"usr-user-status-{suffix}"
    admin_email = f"admin.status.{suffix}@pds.gov.in"
    user_email = f"user.status.{suffix}@pds.gov.in"
    password = "StatusTest2026!"

    async with database.AsyncSessionLocal() as db:
        for user_doc in (
            {
                "_id": admin_id,
                "email": admin_email,
                "password_hash": get_password_hash(password),
                "role": "ADMIN",
                "full_name": "Status Test Admin",
                "phone": None,
                "jurisdiction": "HQ",
                "wallet_address": None,
                "status": "ACTIVE",
            },
            {
                "_id": user_id,
                "email": user_email,
                "password_hash": get_password_hash(password),
                "role": "BENEFICIARY",
                "full_name": "Status Test Beneficiary",
                "phone": "9876543210",
                "jurisdiction": "Delhi",
                "wallet_address": "0x1234567890123456789012345678901234567890",
                "status": "ACTIVE",
            },
        ):
            user_doc["created_at"] = (
                datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
            )
            user_doc["last_login_at"] = None
            await insert_user(db, user_doc)

        before = await find_user_by_id(db, user_id)

    admin_token = create_access_token(
        {"sub": admin_id, "userId": admin_id, "email": admin_email, "role": "ADMIN"}
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        deactivated = await client.patch(
            f"/api/auth/admin/users/{user_id}/deactivate",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert deactivated.status_code == 200, deactivated.text
        assert deactivated.json()["status"] == "INACTIVE"

        blocked_login = await client.post(
            "/api/auth/login",
            json={"email": user_email, "password": password, "role": "BENEFICIARY"},
        )
        assert blocked_login.status_code == 403
        assert "inactive" in blocked_login.json()["detail"].lower()

        reactivated = await client.patch(
            f"/api/auth/admin/users/{user_id}/activate",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert reactivated.status_code == 200, reactivated.text
        assert reactivated.json()["status"] == "ACTIVE"

        restored_login = await client.post(
            "/api/auth/login",
            json={"email": user_email, "password": password, "role": "BENEFICIARY"},
        )
        assert restored_login.status_code == 200, restored_login.text

        async with database.AsyncSessionLocal() as db:
            after = await find_user_by_id(db, user_id)
        assert after["_id"] == before["_id"]
        assert after["email"] == before["email"]
        assert after["role"] == before["role"]
        assert after["wallet_address"] == before["wallet_address"]
        assert str(after["status"]).upper() == "ACTIVE"

        self_deactivate = await client.patch(
            f"/api/auth/admin/users/{admin_id}/deactivate",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert self_deactivate.status_code == 400


@pytest.mark.asyncio
async def test_officer_can_only_toggle_beneficiary_accounts():
    """PDS officers can manage beneficiary status but not privileged accounts."""
    from backend.auth.security import create_access_token

    suffix = uuid.uuid4().hex[:10]
    officer_id = f"usr-officer-status-{suffix}"
    beneficiary_id = f"usr-beneficiary-status-{suffix}"
    admin_id = f"usr-protected-status-{suffix}"
    officer_email = f"officer.status.{suffix}@pds.gov.in"
    beneficiary_email = f"beneficiary.status.{suffix}@pds.gov.in"
    password = "StatusTest2026!"

    async with database.AsyncSessionLocal() as db:
        for user_doc in (
            {
                "_id": officer_id,
                "email": officer_email,
                "password_hash": get_password_hash(password),
                "role": "PDS_OFFICER",
                "full_name": "Status Test Officer",
                "phone": None,
                "jurisdiction": "Delhi",
                "wallet_address": None,
                "status": "ACTIVE",
            },
            {
                "_id": beneficiary_id,
                "email": beneficiary_email,
                "password_hash": get_password_hash(password),
                "role": "BENEFICIARY",
                "full_name": "Status Test Beneficiary",
                "phone": None,
                "jurisdiction": "Delhi",
                "wallet_address": None,
                "status": "ACTIVE",
            },
            {
                "_id": admin_id,
                "email": f"protected.status.{suffix}@pds.gov.in",
                "password_hash": get_password_hash(password),
                "role": "ADMIN",
                "full_name": "Protected Admin",
                "phone": None,
                "jurisdiction": "HQ",
                "wallet_address": None,
                "status": "ACTIVE",
            },
        ):
            user_doc["created_at"] = (
                datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
            )
            user_doc["last_login_at"] = None
            await insert_user(db, user_doc)

    officer_token = create_access_token(
        {
            "sub": officer_id,
            "userId": officer_id,
            "email": officer_email,
            "role": "PDS_OFFICER",
        }
    )
    headers = {"Authorization": f"Bearer {officer_token}"}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        deactivated = await client.patch(
            f"/api/auth/officer/beneficiaries/{beneficiary_id}/deactivate",
            headers=headers,
        )
        assert deactivated.status_code == 200, deactivated.text
        assert deactivated.json()["status"] == "INACTIVE"

        blocked_login = await client.post(
            "/api/auth/login",
            json={
                "email": beneficiary_email,
                "password": password,
                "role": "BENEFICIARY",
            },
        )
        assert blocked_login.status_code == 403

        reactivated = await client.patch(
            f"/api/auth/officer/beneficiaries/{beneficiary_id}/activate",
            headers=headers,
        )
        assert reactivated.status_code == 200, reactivated.text
        assert reactivated.json()["status"] == "ACTIVE"

        restored_login = await client.post(
            "/api/auth/login",
            json={
                "email": beneficiary_email,
                "password": password,
                "role": "BENEFICIARY",
            },
        )
        assert restored_login.status_code == 200, restored_login.text

        protected_target = await client.patch(
            f"/api/auth/officer/beneficiaries/{admin_id}/deactivate", headers=headers
        )
        assert protected_target.status_code == 403


@pytest.mark.asyncio
async def test_officer_list_shows_the_same_persisted_beneficiary_as_admin():
    """Officer enrollment is immediately visible through the shared auth store."""
    from backend.auth.security import create_access_token

    suffix = uuid.uuid4().hex[:10]
    officer_id = f"usr-officer-list-{suffix}"
    admin_id = f"usr-admin-list-{suffix}"
    officer_email = f"officer.list.{suffix}@pds.gov.in"
    admin_email = f"admin.list.{suffix}@pds.gov.in"
    beneficiary_email = f"beneficiary.list.{suffix}@pds.gov.in"
    password = "ListTest2026!"

    async with database.AsyncSessionLocal() as db:
        for user_doc in (
            {
                "_id": officer_id,
                "email": officer_email,
                "password_hash": get_password_hash(password),
                "role": "PDS_OFFICER",
                "full_name": "List Test Officer",
                "phone": None,
                "jurisdiction": "Delhi",
                "wallet_address": None,
                "status": "ACTIVE",
            },
            {
                "_id": admin_id,
                "email": admin_email,
                "password_hash": get_password_hash(password),
                "role": "ADMIN",
                "full_name": "List Test Admin",
                "phone": None,
                "jurisdiction": "HQ",
                "wallet_address": None,
                "status": "ACTIVE",
            },
        ):
            user_doc["created_at"] = (
                datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
            )
            user_doc["last_login_at"] = None
            await insert_user(db, user_doc)

    officer_token = create_access_token(
        {
            "sub": officer_id,
            "userId": officer_id,
            "email": officer_email,
            "role": "PDS_OFFICER",
        }
    )
    admin_token = create_access_token(
        {"sub": admin_id, "userId": admin_id, "email": admin_email, "role": "ADMIN"}
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        created = await client.post(
            "/api/auth/officer/create-beneficiary",
            json={
                "email": beneficiary_email,
                "password": password,
                "full_name": "Persistent Beneficiary",
                "phone": "9876543210",
                "jurisdiction": "Delhi",
                "card_category": "PHH",
            },
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert created.status_code == 201, created.text
        created_user = created.json()

        officer_list = await client.get(
            "/api/auth/officer/beneficiaries",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert officer_list.status_code == 200, officer_list.text
        officer_user = next(
            user
            for user in officer_list.json()["beneficiaries"]
            if user["id"] == created_user["id"]
        )

        admin_list = await client.get(
            "/api/auth/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_list.status_code == 200, admin_list.text
        admin_user = next(
            user
            for user in admin_list.json()["users"]
            if user["id"] == created_user["id"]
        )

        assert officer_user["id"] == admin_user["id"] == created_user["id"]
        assert officer_user["email"] == admin_user["email"] == beneficiary_email
        assert officer_user["role"] == admin_user["role"] == "BENEFICIARY"
        assert officer_user["status"] == admin_user["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_long_password_dos_rejection():
    """Verify that oversized passwords (>128 chars) are rejected before expensive hashing."""
    oversized_password = "A" * 500
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": oversized_password,
                "role": "BENEFICIARY",
            },
        )
        assert res.status_code == 422
        assert "password" in str(res.json()).lower()


@pytest.mark.asyncio
async def test_backend_rate_limiting_and_brute_force_throttling():
    """Verify sliding-window rate limiting activates on rapid repeated requests."""
    limiter.reset_all()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Send 16 rapid login requests from the same client IP
        responses = []
        for _ in range(16):
            res = await client.post(
                "/api/auth/login",
                json={
                    "email": "nonexistent.user@pds.gov.in",
                    "password": "WrongPassword1!",
                    "role": "BENEFICIARY",
                },
            )
            responses.append(res.status_code)

        # The 16th request must be throttled with HTTP 429
        assert 429 in responses
        assert responses[-1] == 429
    limiter.reset_all()


@pytest.mark.asyncio
async def test_account_brute_force_lockout():
    """Verify that 5 failed attempts against an account triggers account throttling."""
    limiter.reset_all()
    target_email = f"brute.target.{uuid.uuid4().hex[:6]}@pds.gov.in"
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Simulate 5 consecutive failed logins for this account
        for _ in range(5):
            limiter.record_failed_login(target_email)

        # 6th attempt should return 429
        res = await client.post(
            "/api/auth/login",
            json={
                "email": target_email,
                "password": "WrongPassword123!",
                "role": "BENEFICIARY",
            },
        )
        assert res.status_code == 429
        assert "too many failed login attempts" in res.json()["detail"].lower()
    limiter.reset_all()
