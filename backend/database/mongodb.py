"""MongoDB connection module for PDSW."""

import logging
import os
from pathlib import Path
import string
from typing import Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, InvalidURI, OperationFailure, PyMongoError

_BACKEND_DIR = Path(__file__).parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=False)

logger = logging.getLogger("pdsw.mongodb")

_mongo_client: Optional[MongoClient] = None
_mongo_db: Optional[Database] = None


def _quote_mongodb_credential(value: str) -> str:
    encoded_parts: list[str] = []
    pending_chars: list[str] = []
    hex_digits = set(string.hexdigits)
    i = 0

    while i < len(value):
        char = value[i]
        has_percent_escape = (
            char == "%"
            and i + 2 < len(value)
            and value[i + 1] in hex_digits
            and value[i + 2] in hex_digits
        )

        if has_percent_escape:
            if pending_chars:
                encoded_parts.append(quote_plus("".join(pending_chars), safe=""))
                pending_chars.clear()
            encoded_parts.append(value[i : i + 3])
            i += 3
            continue

        pending_chars.append(char)
        i += 1

    if pending_chars:
        encoded_parts.append(quote_plus("".join(pending_chars), safe=""))

    return "".join(encoded_parts)


def _normalise_mongodb_uri(mongo_uri: str) -> str:
    if not mongo_uri.startswith(("mongodb://", "mongodb+srv://")):
        return mongo_uri

    scheme_end = mongo_uri.find("://")
    credentials_start = scheme_end + 3
    query_or_fragment_start = min(
        [
            position
            for position in (
                mongo_uri.find("?", credentials_start),
                mongo_uri.find("#", credentials_start),
                len(mongo_uri),
            )
            if position != -1
        ]
    )
    at_index = mongo_uri.rfind("@", credentials_start, query_or_fragment_start)

    if at_index == -1:
        return mongo_uri

    userinfo = mongo_uri[credentials_start:at_index]
    if ":" not in userinfo:
        return mongo_uri

    username, password = userinfo.split(":", 1)
    encoded_userinfo = (
        f"{_quote_mongodb_credential(username)}:"
        f"{_quote_mongodb_credential(password)}"
    )

    if encoded_userinfo == userinfo:
        return mongo_uri

    return f"{mongo_uri[:credentials_start]}{encoded_userinfo}{mongo_uri[at_index:]}"


def init_mongodb() -> None:
    global _mongo_client, _mongo_db

    mongo_uri = _normalise_mongodb_uri(os.getenv("MONGODB_URI", "").strip())
    mongo_db_name = os.getenv("MONGODB_DATABASE", "pdsw").strip() or "pdsw"

    if not mongo_uri:
        raise RuntimeError(
            "MONGODB_URI is not set. "
            "Add it to backend/.env – see backend/.env.example for the required format."
        )

    logger.info("Connecting to MongoDB …")

    timeout_ms = int(os.getenv("MONGODB_TIMEOUT_MS", "3000"))
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=timeout_ms)
        client.admin.command("ping")

        db = client[mongo_db_name]
        db["users"].create_index(
            [("email", ASCENDING)],
            unique=True,
            name="idx_users_email_unique",
            background=True,
        )

        _mongo_client = client
        _mongo_db = db

        logger.info(
            "MongoDB connected successfully. "
            f"Database: '{mongo_db_name}'. "
            "Unique email index on users collection ensured."
        )

    except InvalidURI as exc:
        raise RuntimeError(
            "MongoDB URI is invalid. Check MONGODB_URI in backend/.env. "
            "If your username or password contains special characters, "
            "percent-encode them.\n"
            f"Detail: {exc}"
        ) from exc
    except ConnectionFailure as exc:
        raise RuntimeError(
            f"MongoDB connection failed – cannot reach the server. "
            f"Check MONGODB_URI in backend/.env.\nDetail: {exc}"
        ) from exc
    except OperationFailure as exc:
        raise RuntimeError(
            f"MongoDB authentication or operation failed.\nDetail: {exc}"
        ) from exc
    except PyMongoError as exc:
        raise RuntimeError(
            f"MongoDB initialisation failed. Check backend/.env.\nDetail: {exc}"
        ) from exc


def get_mongo_db() -> Database:
    if _mongo_db is None:
        raise RuntimeError(
            "MongoDB is not initialised. "
            "Ensure `init_mongodb()` is called during application startup."
        )
    return _mongo_db


def get_users_collection() -> Collection:
    return get_mongo_db()["users"]


def close_mongodb() -> None:
    global _mongo_client, _mongo_db
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        logger.info("MongoDB connection closed.")
