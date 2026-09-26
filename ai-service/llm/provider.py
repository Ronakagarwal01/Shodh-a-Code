import os
import json
from typing import Dict, Any, List, Optional
from models.schemas import AIResponse, EvidenceItem
from llm.gemini_provider import GeminiProvider
from llm.openai_provider import OpenAIProvider
from llm.fallback_engine import DeterministicGroundedEngine

class LLMProvider:
    """
    Unified LLM Provider Manager for Shodh-a-Code.
    Dispatches to real LLM providers (Google Gemini, OpenAI) when an API key is present.
    If the API key is missing or the external call fails (timeout, rate limit, outage),
    it seamlessly falls back to the deterministic grounded reasoning engine.
    Always maintains strict accuracy: clearly marks generationMode as 'llm' or 'deterministic_fallback'.
    """
    def __init__(self, provider: str = "gemini", api_key: str = "", model_name: str = "gemini-1.5-flash"):
        self.provider = (provider or os.getenv("LLM_PROVIDER", "gemini")).lower()
        self.api_key = api_key or os.getenv("LLM_API_KEY", "")
        self.model_name = model_name or os.getenv("LLM_MODEL", "gemini-1.5-flash")
        
        self.fallback_engine = DeterministicGroundedEngine()
        self.active_provider_client = None

        if self.api_key:
            if self.provider == "gemini":
                self.active_provider_client = GeminiProvider(api_key=self.api_key, model_name=self.model_name)
            elif self.provider == "openai":
                self.active_provider_client = OpenAIProvider(api_key=self.api_key, model_name=self.model_name)

    def is_llm_active(self) -> bool:
        """Returns True if a real LLM provider is configured with an API key."""
        return bool(self.api_key and self.active_provider_client)

    def health_check(self) -> Dict[str, Any]:
        """Reports live LLM connectivity and fallback availability."""
        if self.is_llm_active() and self.active_provider_client:
            health = self.active_provider_client.health_check()
            return {
                "llm_integrated": True,
                "provider": self.provider,
                "model": self.model_name,
                "active_client_status": health,
                "fallback_available": True
            }
        return {
            "llm_integrated": False,
            "provider": self.provider,
            "model": self.model_name,
            "mode": "deterministic_fallback",
            "reason": "No LLM_API_KEY configured",
            "fallback_available": True
        }

    def synthesize_response(
        self,
        question: str,
        evidence: List[EvidenceItem],
        tool_results: Dict[str, Any],
        context: Dict[str, Any]
    ) -> AIResponse:
        """
        Synthesizes an inspectable, evidence-grounded response.
        If an external API key is configured, invokes the real LLM with structured output.
        Falls back cleanly to the deterministic grounded engine on any error.
        """
        if self.is_llm_active() and self.active_provider_client:
            try:
                response = self.active_provider_client.generate_grounded_response(
                    question=question,
                    evidence=evidence,
                    tool_results=tool_results,
                    context=context
                )
                return response
            except Exception as e:
                # Log external error safely without revealing secrets
                err_msg = f"External LLM invocation failed ({type(e).__name__}: {str(e)[:150]}). Falling back to deterministic grounded synthesis."
                print(f"[LLMProvider] {err_msg}")
                fallback_resp = self.fallback_engine.synthesize(question, evidence, tool_results, context)
                fallback_resp.warnings.append(err_msg)
                return fallback_resp

        # Default: Deterministic Grounded Reasoning
        return self.fallback_engine.synthesize(question, evidence, tool_results, context)
