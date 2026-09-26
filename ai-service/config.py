import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AI_SERVICE_PORT: int = 8000
    CONTEST_API_URL: str = os.getenv("CONTEST_API_URL", "http://localhost:4000")
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini") # gemini | openai | anthropic | mock_grounded
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3.1-flash-lite")
    MAX_TOOL_CALLS: int = 5
    MAX_RETRIEVAL_RESULTS: int = 8
    
    # Qdrant
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", "6333"))
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_COLLECTION: str = "shodha_knowledge"
    
    # Neo4j
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USERNAME: str = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "shodha_graph_pass_2026")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
