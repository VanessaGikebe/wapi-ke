"""FastAPI application entrypoint.

Tooling phase only: exposes a single ``/health`` endpoint so we can confirm the
service boots. Routers (auth, categories, experiences, assistant) come later.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.assistant import router as assistant_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.categories import router as categories_router
from app.api.v1.events import router as events_router
from app.api.v1.experiences import router as experiences_router
from app.api.v1.favorites import router as favorites_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="Wapike API", version="0.1.0")

# Allow the browser frontend to call the API with cookies (credentials).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(experiences_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(assistant_router, prefix="/api/v1")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """Liveness probe. Returns a static OK payload."""

    return {"status": "ok"}
