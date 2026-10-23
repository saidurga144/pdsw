import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend import database
from backend.routers import auth, audit
from backend.database.mongodb import init_mongodb, close_mongodb
from backend.auth.user_store import get_user_store_label

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdsw.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PDSW FastAPI Backend Service...")

    try:
        init_mongodb()
    except RuntimeError as mongo_err:
        logger.warning(
            "MongoDB not initialised; using local SQLite auth fallback. "
            "Set a valid/reachable MONGODB_URI in backend/.env to use Atlas. Detail: %s",
            mongo_err,
        )

    await database.init_db()

    # ── Ensure Administrator account exists (auto-initializes once if absent, never overwrites)
    if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
        from backend.auth.admin_bootstrap import ensure_admin_initialized
        await ensure_admin_initialized(
            email=settings.ADMIN_EMAIL,
            password=settings.ADMIN_PASSWORD,
            name=settings.ADMIN_NAME,
        )

    logger.info(
        "PDSW Backend ready. Auth store: %s. Database persistence active — no records will be reset.",
        get_user_store_label(),
    )

    yield

    logger.info("Shutting down PDSW FastAPI Backend Service...")
    close_mongodb()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "PDSW FastAPI Backend",
        "version": settings.VERSION,
        "chain_id": settings.SEPOLIA_CHAIN_ID,
        "auth_store": get_user_store_label(),
    }
