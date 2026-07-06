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

    # Supabase Auth bridge. When SUPABASE_JWKS_URL is set, protected routes
    # accept Supabase-issued JWTs (verified against the project's JWKS) in
    # addition to (legacy) app-issued tokens.
    supabase_url: str = ""
    supabase_jwks_url: str = ""
    supabase_service_role_key: str = ""
    site_url: str = "http://localhost:3000"

    # JWT / auth settings.
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    # Set true in production (HTTPS) so the refresh cookie is Secure.
    cookie_secure: bool = False

    # CORS: comma-separated list of allowed browser origins, e.g.
    # "http://localhost:3000,https://your-app.vercel.app". Optionally set
    # CORS_ORIGIN_REGEX to allow Vercel preview URLs, e.g.
    # "https://.*\\.vercel\\.app".
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    cors_origin_regex: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached `Settings` instance.

    Cached so the `.env` file is parsed once per process; use this everywhere
    rather than constructing `Settings()` directly.
    """

    return Settings()
