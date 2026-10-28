import datetime
from enum import Enum
import secrets
from typing import Any, Dict, List, Optional
import bcrypt
from jose import jwt, JWTError
from backend.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Computes a bcrypt hash for a plaintext password."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def _get_jwt_secret() -> str:
    secret = settings.JWT_SECRET.strip()
    if not secret:
        raise RuntimeError("JWT_SECRET must be configured before using authentication.")
    return secret


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """Issues an authenticated JWT session token."""
    to_encode = data.copy()
    for k, v in list(to_encode.items()):
        if isinstance(v, Enum):
            to_encode[k] = v.value
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, _get_jwt_secret(), algorithm=settings.JWT_ALGORITHM)


def has_role(token_payload: Dict[str, Any], required: List[Enum]) -> bool:
    """Check if the role in token_payload matches any of the required enum values."""
    role = token_payload.get("role")
    role_val = role.value if isinstance(role, Enum) else str(role)
    required_vals = [r.value if isinstance(r, Enum) else str(r) for r in required]
    return role_val.upper() in (rv.upper() for rv in required_vals)


def create_temp_metamask_token(user_id: str, email: str, role: str) -> str:
    """Creates a short-lived (30 min) token for the intermediate MetaMask verification step."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "step": "METAMASK_PENDING",
        "exp": now + datetime.timedelta(minutes=30),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=settings.JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Cryptographically verifies a JWT session token."""
    try:
        return jwt.decode(
            token, _get_jwt_secret(), algorithms=[settings.JWT_ALGORITHM]
        )
    except (JWTError, RuntimeError):
        return None


def generate_secure_nonce() -> str:
    """Generates a high-entropy hex nonce for SIWE challenge authentication."""
    return secrets.token_hex(16)


def recover_ethereum_signer(message: str, signature: str) -> str:
    """Recovers the Ethereum signer address from an EIP-191 / EIP-4361 personal_sign message."""
    try:
        from eth_account.messages import encode_defunct
        from eth_account import Account

        message_hash = encode_defunct(text=message)
        return Account.recover_message(message_hash, signature=signature)
    except Exception as e:
        try:
            from web3 import Web3
            from eth_account.messages import encode_defunct

            w3 = Web3()
            msg_hash = encode_defunct(text=message)
            return w3.eth.account.recover_message(msg_hash, signature=signature)
        except Exception:
            raise ValueError(
                f"Failed to cryptographically recover Ethereum signature: {str(e)}"
            )
