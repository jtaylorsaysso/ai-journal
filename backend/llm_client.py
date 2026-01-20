"""
LLM Client Abstraction Layer
Supports Ollama for local inference with retry logic
"""
import requests
import time
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod


class LLMClient(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """Generate text completion"""
        pass


class OllamaClient(LLMClient):
    """Ollama local LLM client with retry logic"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "phi3:mini",
        timeout: int = 60,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request to Ollama API with retry logic"""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=self.timeout
                )
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.ConnectionError as e:
                last_error = f"Cannot connect to Ollama at {self.base_url}. Is it running?"
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                    
            except requests.exceptions.Timeout as e:
                last_error = f"Request timed out after {self.timeout}s"
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                    
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    raise ValueError(
                        f"Model '{self.model}' not found. "
                        f"Run: ollama pull {self.model}"
                    )
                last_error = f"HTTP error: {e.response.status_code}"
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                    
            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
        
        raise RuntimeError(f"Ollama request failed after {self.max_retries} attempts: {last_error}")
    
    def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> str:
        """
        Generate text completion using Ollama
        
        Args:
            prompt: The user prompt
            system: System message/context (optional)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            
        Returns:
            Generated text response
            
        Raises:
            ValueError: If model not found
            RuntimeError: If connection/generation fails after retries
        """
        # Construct full prompt with system message if provided
        full_prompt = prompt
        if system:
            full_prompt = f"{system}\n\n{prompt}"
        
        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        result = self._make_request(payload)
        return result.get("response", "").strip()
    
    def check_health(self) -> bool:
        """Check if Ollama server is accessible"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )
            return response.status_code == 200
        except:
            return False


def get_llm_client(config) -> LLMClient:
    """
    Factory function to create LLM client based on configuration
    
    Args:
        config: Flask app config object
        
    Returns:
        LLMClient instance (Ollama only for now)
    """
    return OllamaClient(
        base_url=config.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
        model=config.get('OLLAMA_MODEL', 'phi3:mini'),
        timeout=config.get('OLLAMA_TIMEOUT', 60),
        max_retries=config.get('OLLAMA_MAX_RETRIES', 3),
        retry_delay=config.get('OLLAMA_RETRY_DELAY', 1.0)
    )
