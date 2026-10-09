"""Client for requesting structured JSON responses from a local Ollama server.

The service is intentionally small: it owns HTTP transport and response
validation, while prompt construction and business fallbacks remain in the
summarization service.
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

import httpx

class OllamaServiceError(RuntimeError):
    """Raised when Ollama cannot return a valid structured response."""

    pass


async def chat_json(
    *,
    prompt: str,
    base_url: str,
    model: str,
    timeout_s: int = 120,
) -> Dict[str, Any]:
    """Send a prompt to Ollama and decode the JSON in ``message.content``.

    Ollama is called without streaming because the summarization pipeline
    needs the complete response before validating its structure. Responses
    wrapped in explanatory text are accepted when a JSON object can be
    extracted from the content.

    Args:
        prompt: User prompt sent to the configured Ollama model.
        base_url: Ollama server URL, with or without a trailing slash.
        model: Model name accepted by Ollama.
        timeout_s: Maximum request duration in seconds.

    Returns:
        The decoded JSON object returned by the model.

    Raises:
        OllamaServiceError: If the HTTP response is unsuccessful, omits
            ``message.content``, or does not contain parseable JSON.
        httpx.HTTPError: If the HTTP client cannot complete the request.
    """

    url = base_url.rstrip("/") + "/api/chat"

    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code >= 400:
        raise OllamaServiceError(f"Ollama HTTP {resp.status_code}: {resp.text}")

    data = resp.json()
    # ollama devolve message com role e content
    content = (
        data.get("message", {}).get("content")
        if isinstance(data, dict)
        else None
    )
    if content is None:
        raise OllamaServiceError(f"Ollama response missing message.content: {data}")

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise OllamaServiceError(f"Ollama content not JSON: {content}")
        try:
            return json.loads(content[start : end + 1])
        except json.JSONDecodeError as e:
            raise OllamaServiceError(f"Ollama content not JSON parseable: {e}; content={content}")
