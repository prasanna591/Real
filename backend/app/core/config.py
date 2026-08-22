from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "PropTech API"
    debug: bool = True
    database_url: str = "sqlite:///./proptech.db"

    s3_endpoint_url: str = ""
    s3_bucket: str = "proptech-media"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    posthog_key: str = ""
    openai_api_key: str = ""

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
