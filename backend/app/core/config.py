from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "PropTech API"
    debug: bool = True
    database_url: str = "sqlite:///./proptech.db"

    # CORS
    cors_origins: str = ""

    s3_endpoint_url: str = ""
    s3_bucket: str = "proptech-media"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    posthog_key: str = ""
    sentry_dsn: str = ""
    openai_api_key: str = ""
    ai_model: str = ""

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12

    redis_url: str = "redis://localhost:6379"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode="after")
    def enforce_production_secrets(self) -> "Settings":
        if not self.debug and self.jwt_secret_key == "change-me-in-production":
            raise ValueError(
                "JWT_SECRET_KEY must be changed in production. "
                "Generate one with: openssl rand -hex 32"
            )
        return self

    @property
    def allowed_origins(self) -> list[str]:
        if not self.cors_origins:
            return ["http://localhost:3000", "http://localhost:8081"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
