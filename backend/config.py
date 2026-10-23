import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "PDSW Backend API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "sqlite+aiosqlite:///./pdsw_local.db"

    JWT_SECRET: str = "pdsw-super-secret-cryptographic-jwt-key-2026-production-ready"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    SEPOLIA_CHAIN_ID: int = 11155111

    # First-admin bootstrap (one-time, server-side secret)
    BOOTSTRAP_ADMIN_SECRET: str = "pdsw-bootstrap-secret-change-me-2026"
    ADMIN_EMAIL: str = "canikiisu@gmail.com"
    ADMIN_PASSWORD: str = "sai@144S"
    ADMIN_NAME: str = "System Administrator"
    ADMIN_WALLET_ADDRESS: str = ""


    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
