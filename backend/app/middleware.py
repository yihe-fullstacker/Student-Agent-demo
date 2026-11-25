from collections import defaultdict, deque
import logging
import threading
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger(__name__)

_RATE_LOCK = threading.Lock()
_REQUEST_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def reset_rate_limiter() -> None:
    """Clear in-memory rate limit buckets (used in tests)."""
    with _RATE_LOCK:
        _REQUEST_BUCKETS.clear()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request path, status code, and latency, and catch unhandled exceptions."""

    async def dispatch(self, request: Request, call_next):
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = int((time.monotonic() - started) * 1000)
            logger.exception(
                "Unhandled exception on %s %s (%d ms)",
                request.method,
                request.url.path,
                elapsed_ms,
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "服务器开小差了，请稍后重试"},
            )

        elapsed_ms = int((time.monotonic() - started) * 1000)
        response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
        logger.info(
            "%s %s -> %d (%d ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple sliding-window IP rate limiter returning HTTP 429 when exceeded."""

    async def dispatch(self, request: Request, call_next):
        if (
            not settings.RATE_LIMIT_ENABLED
            or request.method == "OPTIONS"
            or request.url.path == "/api/health"
        ):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window = max(1, settings.RATE_LIMIT_WINDOW_SECONDS)
        limit = max(1, settings.RATE_LIMIT_REQUESTS)

        with _RATE_LOCK:
            bucket = _REQUEST_BUCKETS[client_ip]
            cutoff = now - window
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "操作过于频繁，请稍后再试"},
                )
            bucket.append(now)

        return await call_next(request)
