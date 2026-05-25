from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "BUCAN DEY"
    APP_VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"

    MONGO_URL: str = ""
    DB_NAME: str = "bucan_dey"

    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,https://bucan-dey.vercel.app,https://bucandey.com,https://www.bucandey.com"
    CORS_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1):\d+$|^https://[a-z0-9-]+\.vercel\.app$"

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_UPLOAD_FOLDER: str = "bucan-dey"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:evongorecords@gmail.com"

    LIVE_PROVIDER: str = "livekit"
    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    LIVE_MAX_DURATION_MINUTES: int = 120
    LIVE_STREAMER_INACTIVE_MINUTES: int = 3
    LIVE_VIEWER_INACTIVE_SECONDS: int = 60
    LIVE_CONTROL_INTERVAL_SECONDS: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
