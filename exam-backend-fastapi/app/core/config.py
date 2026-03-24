from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


@dataclass
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://exam_user:exam_pass_123@localhost:5432/exam_creator")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    cors_origins: list[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://localhost:8080",
            ).split(",")
            if origin.strip()
        ]
    )
    # Si CORS_ORIGINS vaut "*", on autorise tout (pratique en dev réseau local)
    @property
    def cors_allow_all(self) -> bool:
        return os.getenv("CORS_ORIGINS", "").strip() == "*"

    ia_api_url: str = os.getenv("IA_API_URL", "http://localhost:8000")


settings = Settings()
