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
    # Google Gemini API key (Google AI Studio) for the AI assistant.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_temperature: float = 0.7

    # Google Sign-In: the OAuth 2.0 Web client ID. When set, POST /auth/google
    # verifies Google ID tokens whose `aud` matches this value. Leave blank to
    # disable Google sign-in (the endpoint then returns 503).
    google_client_id: str = ""

    # Supabase Auth bridge. When SUPABASE_JWKS_URL is set, protected routes
    # accept Supabase-issued JWTs (verified against the project's JWKS) in
    # addition to (legacy) app-issued tokens.
    supabase_url: str = ""
    supabase_jwks_url: str = ""
    # (Removed admin_signup_code — admins are created only via the seed CLI /
    # super-admin invitation, never self-service.)
    # Supabase service (secret) key — SERVER-SIDE ONLY. Used by the backend to
    # create auth accounts, mint activation magic links, and issue signed
    # Storage upload/download URLs. Never expose this to the browser.
    supabase_service_key: str = ""

    # Supabase Storage buckets. Verification documents (ID, registration
    # certificate) live in a PRIVATE bucket read by admins via signed URLs;
    # business logos/covers live in a PUBLIC bucket.
    business_docs_bucket: str = "business-documents"
    business_media_bucket: str = "business-media"

    # Where activation magic links point the browser (the frontend origin).
    frontend_url: str = "http://localhost:3000"

    # Verification provider for business onboarding. "manual" = admins review
    # uploaded documents by hand (Phase 1). A real eCitizen BRS provider can be
    # slotted in later without changing the onboarding flow.
    verification_provider: str = "manual"

    # Account activation is done via one-time magic links (business approval and
    # admin invitation). During development these are minted through Supabase
    # Auth; in production a transactional email provider (Resend) delivers them.
    magic_link_expiry_hours: int = 24
    admin_invite_expiry_hours: int = 24

    # Transactional email (Resend). Leave RESEND_API_KEY blank in development to
    # fall back to Supabase Auth's built-in magic-link emails.
    resend_api_key: str = ""
    email_from: str = "WapiKE <no-reply@wapike.co.ke>"

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
