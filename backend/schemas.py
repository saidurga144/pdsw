import re
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(
        ...,
        description="Designated role: only BENEFICIARY allowed for public signup; other roles ADMIN, PDS_OFFICER, SOC_ANALYST are admin-provisioned.",
    )
    full_name: str
    phone: Optional[str] = None
    jurisdiction: Optional[str] = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if not v:
            return None
        clean = "".join(ch for ch in str(v) if ch.isdigit())
        if len(clean) > 10:
            clean = clean[-10:]
        if len(clean) != 10:
            raise ValueError("Mobile phone number must be exactly 10 digits.")
        return clean


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    name: str
    full_name: str
    phone: Optional[str] = None
    jurisdiction: Optional[str] = None
    wallet_address: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class LoginStepOneResponse(BaseModel):
    success: bool
    requires_metamask: bool = True
    temp_token: str
    token: Optional[str] = None
    redirect_url: Optional[str] = None
    user: UserOut
    message: str = (
        "Credentials verified. Please connect and verify your MetaMask wallet."
    )


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class OfficerCreateBeneficiary(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str
    phone: Optional[str] = None
    jurisdiction: Optional[str] = None
    wallet_address: Optional[str] = None
    ration_card_number: Optional[str] = None
    card_category: Optional[str] = None

    @field_validator("wallet_address", mode="before")
    @classmethod
    def validate_wallet(cls, v):
        if not v:
            return None
        clean = str(v).strip().lower()
        if not re.match(r"^0x[a-f0-9]{40}$", clean):
            raise ValueError(
                "Invalid Ethereum Sepolia wallet address. Must be a 42-character hex address starting with 0x."
            )
        return clean


class UpdateBeneficiary(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    jurisdiction: Optional[str] = None
    card_category: Optional[str] = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if not v:
            return None
        clean = "".join(ch for ch in str(v) if ch.isdigit())
        if len(clean) > 10:
            clean = clean[-10:]
        if len(clean) not in (0, 10):
            raise ValueError("Mobile phone number must be exactly 10 digits.")
        return clean or None


class NonceResponse(BaseModel):
    success: bool
    nonce: str
    domain: str
    uri: str
    chainId: int
    issuedAt: str
    expiresAt: str


class VerifyWalletRequest(BaseModel):
    wallet_address: str
    message: str
    signature: str
    chain_id: Optional[int] = 11155111


class VerifyWalletResponse(BaseModel):
    success: bool
    token: str
    redirect_url: str
    user: UserOut
    message: str = "MetaMask cryptographic authentication successful."


class AdminProvisionUser(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(
        ..., description="Role to provision: must be PDS_OFFICER or SOC_ANALYST."
    )
    full_name: str
    phone: Optional[str] = None
    jurisdiction: Optional[str] = None
    wallet_address: Optional[str] = None

    @field_validator("wallet_address", mode="before")
    @classmethod
    def validate_wallet(cls, v):
        if not v:
            return None
        clean = str(v).strip().lower()
        if not re.match(r"^0x[a-f0-9]{40}$", clean):
            raise ValueError(
                "Invalid Ethereum Sepolia wallet address. Must be a 42-character hex address starting with 0x."
            )
        return clean

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if not v:
            return None
        clean = "".join(ch for ch in str(v) if ch.isdigit())
        if len(clean) > 10:
            clean = clean[-10:]
        if len(clean) != 10:
            raise ValueError("Mobile phone number must be exactly 10 digits.")
        return clean


class DocumentAuditCreate(BaseModel):
    document_id: str
    ipfs_cid: str
    file_hash: str
    tx_hash: str
    metadata_json: Optional[str] = None


class DocumentAuditOut(BaseModel):
    id: str
    document_id: str
    ipfs_cid: str
    file_hash: str
    tx_hash: Optional[str]
    wallet_address: str
    role: str
    status: str
    created_at: Any

    model_config = ConfigDict(from_attributes=True)
