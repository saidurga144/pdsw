"""
backend/rbac/roles.py
---------------------
Centralized role constants for the PDSW platform.
All backend code should import from here for role checks.
"""

from typing import FrozenSet

# ----- Canonical role identifiers -----
ROLE_ADMIN: str = "ADMIN"
ROLE_PDS_OFFICER: str = "PDS_OFFICER"
ROLE_SOC_ANALYST: str = "SOC_ANALYST"
ROLE_BENEFICIARY: str = "BENEFICIARY"

# ----- Full set of allowed roles -----
ALLOWED_ROLES: FrozenSet[str] = frozenset({
    ROLE_ADMIN,
    ROLE_PDS_OFFICER,
    ROLE_SOC_ANALYST,
    ROLE_BENEFICIARY,
})

# ----- Public signup only permits Beneficiary -----
PUBLIC_SIGNUP_ROLES: FrozenSet[str] = frozenset({ROLE_BENEFICIARY})

# ----- Roles that must be created by an Admin -----
ADMIN_PROVISIONED_ROLES: FrozenSet[str] = frozenset({
    ROLE_PDS_OFFICER,
    ROLE_SOC_ANALYST,
})

# ----- Dashboard redirects for each role -----
ROLE_DASHBOARD_MAP: dict[str, str] = {
    ROLE_BENEFICIARY: "/beneficiary/dashboard",
    ROLE_PDS_OFFICER: "/officer/dashboard",
    ROLE_ADMIN: "/admin/dashboard",
    ROLE_SOC_ANALYST: "/soc/dashboard",
}

# ----- Legacy → canonical mapping (for migration) -----
LEGACY_ROLE_MAP: dict[str, str] = {
    "OFFICER": ROLE_PDS_OFFICER,
    "SOC": ROLE_SOC_ANALYST,
    "AUDITOR": ROLE_SOC_ANALYST,  # Auditors merged into SOC_ANALYST
    "SECURITY_ANALYST": ROLE_SOC_ANALYST,
    "ADMIN": ROLE_ADMIN,
    "BENEFICIARY": ROLE_BENEFICIARY,
    "PDS_OFFICER": ROLE_PDS_OFFICER,
    "SOC_ANALYST": ROLE_SOC_ANALYST,
}

def canonicalize_role(raw_role: str) -> str:
    """Normalize any legacy role string to its canonical form.
    Unknown values fall back to BENEFICIARY for safety.
    """
    if not raw_role:
        return ROLE_BENEFICIARY
    key = raw_role.strip().upper().replace("-", "_").replace(" ", "_")
    return LEGACY_ROLE_MAP.get(key, ROLE_BENEFICIARY)
