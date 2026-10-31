import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import settings
from backend import database
from backend.routers import auth, audit, requests
from backend.database.mongodb import init_mongodb, close_mongodb
from backend.auth.user_store import get_user_store_label

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdsw.main")

MAX_REQUEST_BODY_BYTES = 1 * 1024 * 1024  # 1 MB


class ContentSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large. Maximum 1 MB allowed."},
            )
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PDSW FastAPI Backend Service...")

    try:
        try:
            init_mongodb()
        except RuntimeError as mongo_err:
            logger.warning(
                "MongoDB not initialised; using local SQLite auth fallback. "
                "Set a valid/reachable MONGODB_URI in backend/.env to use Atlas. Detail: %s",
                mongo_err,
            )

        await database.init_db()

        if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
            from backend.auth.admin_bootstrap import ensure_admin_initialized

            await ensure_admin_initialized(
                email=settings.ADMIN_EMAIL,
                password=settings.ADMIN_PASSWORD,
                name=settings.ADMIN_NAME,
            )

        logger.info(
            "PDSW Backend ready. Auth store: %s. Database persistence active.",
            get_user_store_label(),
        )
        yield
    finally:
        logger.info("Shutting down PDSW FastAPI Backend Service...")
        try:
            close_mongodb()
        finally:
            await database.engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url=None if os.getenv("ENVIRONMENT", "development") == "production" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT", "development") == "production" else "/redoc",
)

app.add_middleware(ContentSizeLimitMiddleware)

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Bootstrap-Token"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(requests.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "PDSW FastAPI Backend",
        "version": settings.VERSION,
        "chain_id": settings.SEPOLIA_CHAIN_ID,
        "auth_store": get_user_store_label(),
    }
