"""Centralized role constants for the PDSW platform."""

from typing import FrozenSet

ROLE_ADMIN: str = "ADMIN"
ROLE_PDS_OFFICER: str = "PDS_OFFICER"
ROLE_SOC_ANALYST: str = "SOC_ANALYST"
ROLE_BENEFICIARY: str = "BENEFICIARY"

ALLOWED_ROLES: FrozenSet[str] = frozenset(
    {
        ROLE_ADMIN,
        ROLE_PDS_OFFICER,
        ROLE_SOC_ANALYST,
        ROLE_BENEFICIARY,
    }
)

PUBLIC_SIGNUP_ROLES: FrozenSet[str] = frozenset({ROLE_BENEFICIARY})

ADMIN_PROVISIONED_ROLES: FrozenSet[str] = frozenset(
    {
        ROLE_PDS_OFFICER,
        ROLE_SOC_ANALYST,
    }
)

ROLE_DASHBOARD_MAP: dict[str, str] = {
    ROLE_BENEFICIARY: "/beneficiary/dashboard",
    ROLE_PDS_OFFICER: "/officer/dashboard",
    ROLE_ADMIN: "/admin/dashboard",
    ROLE_SOC_ANALYST: "/soc/dashboard",
}

LEGACY_ROLE_MAP: dict[str, str] = {
    "OFFICER": ROLE_PDS_OFFICER,
    "SOC": ROLE_SOC_ANALYST,
    "AUDITOR": ROLE_SOC_ANALYST,
    "SECURITY_ANALYST": ROLE_SOC_ANALYST,
    "ADMIN": ROLE_ADMIN,
    "BENEFICIARY": ROLE_BENEFICIARY,
    "PDS_OFFICER": ROLE_PDS_OFFICER,
    "SOC_ANALYST": ROLE_SOC_ANALYST,
}


def canonicalize_role(raw_role: str | None) -> str | None:
    """Normalize supported legacy role names; reject unknown roles."""
    if not isinstance(raw_role, str) or not raw_role.strip():
        return None
    key = raw_role.strip().upper().replace("-", "_").replace(" ", "_")
    return LEGACY_ROLE_MAP.get(key)
