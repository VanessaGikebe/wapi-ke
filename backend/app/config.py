"""Application configuration loaded from the environment / `.env` file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings sourced from environment variables (and a local `.env`).

    Only the keys required for the current tooling phase are declared here.
    Add new settings as features land.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Core service settings.
    database_url: str = "postgresql+psycopg://wapike:wapike@localhost:5432/wapike"
    jwt_secret: str = "change-me-to-a-long-random-secret"
    anthropic_api_key: str = ""

    # Google Sign-In: the OAuth 2.0 Web client ID. When set, POST /auth/google
    # verifies Google ID tokens whose `aud` matches this value. Leave blank to
    # disable Google sign-in (the endpoint then returns 503).
    google_client_id: str = ""

    # JWT / auth settings.
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    # Set true in production (HTTPS) so the refresh cookie is Secure.
    cookie_secure: bool = False

    # Browser origins allowed to call the API with credentials (CORS).
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]


@lru_cache
def get_settings() -> Settings:
    """Return a cached `Settings` instance.

    Cached so the `.env` file is parsed once per process; use this everywhere
    rather than constructing `Settings()` directly.
    """

    return Settings()
