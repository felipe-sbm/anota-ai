from __future__ import annotations

import json
from typing import Any, Dict, Optional

import httpx

class OllamaServiceError(RuntimeError):
    pass


async def chat_json(
    *,
    prompt: str,
    base_url: str,
    model: str,
    timeout_s: int = 120,
) -> Dict[str, Any]:
    # chama o ollama e exige json estrito no campo message.content.
    # estratégia: enviar prompt com instrução para devolver json válido,
    # parsear o content como json e, se o content vier com texto antes
    # ou depois, tenta extrair a substring json.

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
        # tenta extrair o primeiro json provável
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise OllamaServiceError(f"Ollama content not JSON: {content}")
        try:
            return json.loads(content[start : end + 1])
        except json.JSONDecodeError as e:
            raise OllamaServiceError(f"Ollama content not JSON parseable: {e}; content={content}")

