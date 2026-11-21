from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    gemini_reasoning_model: str = "gemini-4-hydrogen"
    database_url: str = "postgresql+asyncpg://evidenceos:password@localhost:5432/evidenceos"
    backend_service_token: str = ""
    demo_mode: bool = True
    enable_paddle_ocr: bool = False
    whatsapp_access_token: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_app_secret: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
