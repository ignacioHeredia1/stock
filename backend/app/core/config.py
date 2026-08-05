import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Absolute path to root project dir to avoid duplicate db files depending on CWD
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = BASE_DIR / "kiosco.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "KioscoOS SaaS"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "kiosco_secret_key_super_secure_jwt_2026_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Absolute path for SQLite fallback
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"

    class Config:
        case_sensitive = True
        env_file = ".env"

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

settings = Settings()
