from pathlib import Path
from collections import Counter
from math import log2

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"


def is_strong_secret(value: str | None) -> bool:
    secret = (value or "").strip()
    if len(secret) < 32:
        return False
    lowered = secret.lower()
    if any(
        marker in lowered
        for marker in (
            "change-me",
            "changeme",
            "placeholder",
            "replace-with",
            "your-secret",
            "example-key",
        )
    ):
        return False

    frequencies = Counter(secret)
    entropy = -sum(
        (count / len(secret)) * log2(count / len(secret))
        for count in frequencies.values()
    )
    return entropy >= 4.5 and len(frequencies) >= 16


class Settings(BaseSettings):
    PROJECT_NAME: str = "PDSW Backend API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "sqlite+aiosqlite:///./pdsw_local.db"
    MONGODB_URI: str = ""
    MONGODB_DATABASE: str = "pdsw"

    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    SEPOLIA_CHAIN_ID: int = 11155111

    BOOTSTRAP_ADMIN_SECRET: str = ""
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    ADMIN_NAME: str = "System Administrator"
    ADMIN_WALLET_ADDRESS: str = ""
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "APP_ENV", "NODE_ENV"),
    )

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.ENVIRONMENT.strip().lower() in {"prod", "production"}:
            if not is_strong_secret(self.JWT_SECRET):
                raise ValueError(
                    "Production requires a strong, non-placeholder JWT_SECRET."
                )
            if self.ADMIN_PASSWORD and len(self.ADMIN_PASSWORD) < 12:
                raise ValueError(
                    "Production administrator bootstrap passwords must be at least 12 characters."
                )
            if self.BOOTSTRAP_ADMIN_SECRET and not is_strong_secret(
                self.BOOTSTRAP_ADMIN_SECRET
            ):
                raise ValueError(
                    "Production BOOTSTRAP_ADMIN_SECRET must be strong and non-placeholder."
                )
        return self

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
