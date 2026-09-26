from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from models.schemas import AIResponse, EvidenceItem

class BaseLLMProvider(ABC):
    """
    Abstract interface for LLM providers in Shodh-a-Code.
    Enforces a uniform contract for grounded response generation,
    health inspection, and token estimation.
    """
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name

    @abstractmethod
    def generate_grounded_response(
        self,
        question: str,
        evidence: List[EvidenceItem],
        tool_results: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AIResponse:
        """Generates a structured, evidence-grounded AIResponse."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Checks API availability and credentials validity."""
        pass

    def estimate_usage(self, prompt: str, completion: str) -> Dict[str, int]:
        """Rough token count estimation based on character heuristic (~4 chars/token)."""
        prompt_tokens = max(1, len(prompt) // 4)
        completion_tokens = max(1, len(completion) // 4)
        return {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
