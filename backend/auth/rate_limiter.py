"""In-memory sliding-window rate limiter and brute-force protection for FastAPI backend."""

import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    def __init__(self):
        # Maps key -> list of request timestamps (epoch floats)
        self._requests: Dict[str, List[float]] = defaultdict(list)
        # Maps account (email) -> list of failure timestamps
        self._failed_attempts: Dict[str, List[float]] = defaultdict(list)
        self._max_tracked_keys = 50_000

    def _cleanup_old(self, timestamps: List[float], cutoff: float) -> List[float]:
        return [ts for ts in timestamps if ts > cutoff]

    def _prune_if_needed(self):
        if len(self._requests) > self._max_tracked_keys:
            now = time.time()
            cutoff = now - 3600
            keys_to_delete = [
                k for k, v in self._requests.items()
                if not v or v[-1] < cutoff
            ]
            for k in keys_to_delete:
                del self._requests[k]

    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int = 60,
    ) -> Tuple[bool, int]:
        """
        Returns (allowed, retry_after_seconds).
        If allowed is True, records this request.
        If allowed is False, does not record and returns wait time.
        """
        now = time.time()
        cutoff = now - window_seconds

        timestamps = self._cleanup_old(self._requests[key], cutoff)
        self._requests[key] = timestamps

        if len(timestamps) >= max_requests:
            oldest = timestamps[0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return False, retry_after

        timestamps.append(now)
        self._prune_if_needed()
        return True, 0

    def record_failed_login(self, account_key: str, window_seconds: int = 300):
        """Records a failed login attempt for brute-force tracking."""
        now = time.time()
        cutoff = now - window_seconds
        attempts = self._cleanup_old(self._failed_attempts[account_key], cutoff)
        attempts.append(now)
        self._failed_attempts[account_key] = attempts

    def is_account_throttled(
        self, account_key: str, max_failures: int = 5, cooldown_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Checks if an account is currently throttled due to excessive failed attempts.
        Returns (throttled, retry_after_seconds).
        """
        now = time.time()
        cutoff = now - 300
        attempts = self._cleanup_old(self._failed_attempts[account_key], cutoff)
        self._failed_attempts[account_key] = attempts

        if len(attempts) >= max_failures:
            most_recent = attempts[-1]
            elapsed = now - most_recent
            if elapsed < cooldown_seconds:
                return True, int(cooldown_seconds - elapsed)

        return False, 0

    def reset_failed_login(self, account_key: str):
        """Resets failed login tracking upon successful authentication."""
        self._failed_attempts.pop(account_key, None)

    def reset_all(self):
        """Testing helper to clear all tracked rates and failures."""
        self._requests.clear()
        self._failed_attempts.clear()


limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extracts client IP safely from Request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            candidate = parts[0]
            # Basic validation of candidate IP (avoid arbitrary header injection)
            if len(candidate) <= 45 and all(c in "0123456789abcdefABCDEF:." for c in candidate):
                return candidate
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        candidate = real_ip.strip()
        if len(candidate) <= 45 and all(c in "0123456789abcdefABCDEF:." for c in candidate):
            return candidate
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def enforce_rate_limit(
    request: Request,
    action: str,
    max_requests: int,
    window_seconds: int = 60,
):
    ip = get_client_ip(request)
    key = f"{action}:{ip}"
    allowed, retry_after = limiter.check_rate_limit(key, max_requests, window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for {action}. Please retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

