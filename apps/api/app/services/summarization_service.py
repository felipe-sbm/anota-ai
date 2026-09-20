from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

import httpx
from pydantic import BaseModel

from ..core.config import settings

logger = logging.getLogger(__name__)

# obs: o resumo pode ser determinístico (fallback) ou via LLM (que o groq eh o padrão).


class TaskOut(BaseModel):
    title: str
    body: str = ""
    assignees: List[str] = []


class SummaryTasksOut(BaseModel):
    summary: str
    tasks: List[TaskOut]


def build_prompt(transcript: str, assignees: List[str]) -> str:
    # forçamos JSON estrito no output para facilitar o parse do resultado.
    return f"""
Você é um assistente que transforma o conteúdo de uma gravação em:
1) um resumo completo e detalhado baseado no conteudo recebido
2) uma lista de tarefas (issues) para um time de desenvolvimento

REGRAS:
- Gere tasks SE houver ações, decisões, dúvidas ou itens de trabalho.
- Cada task deve ter title claro e body contendo contexto.
- No campo body, inclua SEMPRE uma seção final chamada "Anexos/Referências:".
  - Se não houver anexos, deixe "Anexos/Referências:" vazio (apenas a seção).
  - Não invente anexos; use apenas informações que existam no texto.
- NÃO invente assignees. Use APENAS os assignees fornecidos pelo usuário.
- Se assignees estiver vazio, deixe assignees de cada task como [].

OUTPUT EXCLUSIVAMENTE em JSON válido no formato:
{{
  \"summary\": string,
  \"tasks\": [
    {{
      \"title\": string,
      \"body\": string,
      \"assignees\": [string]
    }}
  ]
}}

ASSIGNEES (logins GitHub): {assignees}

TRANSCRIÇÃO:
{transcript}
""".strip()


def _parse_json(content: str) -> Dict[str, Any]:
    """pega o primeiro objeto JSON válido da resposta da IA"""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            raise ValueError(f"A resposta não contém JSON válido: {content[:200]}")
        return json.loads(match.group(0))


def _groq_api_key() -> str:
    """retorna a chave do groq"""
    return settings.GROQ_API_KEY


async def _groq_chat_json(prompt: str) -> Dict[str, Any]:
    """chama o endpoint compatível com OpenAI do Groq pedindo JSON estrito.

    Precisa da chave do Groq no .env (pegue pelo https://console.groq.com).
    """
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {_groq_api_key()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "temperature": 0.2,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Você é um assistente que recebe uma transcrição de reunião "
                    "e responde SEMPRE com um único objeto JSON válido."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=headers, json=payload)

    r.raise_for_status()

    data = r.json()
    content = data["choices"][0]["message"]["content"]
    return _parse_json(content)


async def summarize_and_extract(
    transcript: str,
    assignees: List[str],
    *,
    ollama_base_url: str = "",
    ollama_model: str = "",
    llm_enabled: bool = False,
) -> SummaryTasksOut:
    """Resumir e extrair tasks.

    Ordem de tentativa:
    1. api do groq, se `GROQ_API_KEY` estiver configurado no .env;
    2. Ollama (local, que agora é legado), se configurado;
    3. Fallback determinístico, para nunca quebrar o fluxo.
    """

    if not transcript.strip():
        return SummaryTasksOut(summary="", tasks=[])

    if llm_enabled:
        if _groq_api_key():
            try:
                prompt = build_prompt(transcript=transcript, assignees=assignees)
                payload = await _groq_chat_json(prompt)
                return SummaryTasksOut(**payload)
            except Exception:
                # mantém o fluxo de processamento disponível, mas não esconde
                # erros de autenticação, limite, rede ou resposta inválida.
                logger.exception("Falha ao gerar resumo com a API da Groq; usando fallback local")
                pass
        else:
            # ollama local (caso um dia esteja disponível).
            try:
                from .ollama_service import chat_json

                prompt = build_prompt(transcript=transcript, assignees=assignees)
                payload = await chat_json(
                    prompt=prompt,
                    base_url=ollama_base_url,
                    model=ollama_model,
                )
                return SummaryTasksOut(**payload)
            except Exception:
                logger.exception("Falha ao gerar resumo com Ollama; usando fallback local")
                pass

    # fallback (bom o suficiente para não quebrar o fluxo ;])
    sentences = [s.strip() for s in transcript.replace("\n", " ").split(".") if s.strip()]
    summary = ". ".join(sentences[:3]).strip()

    keywords = ["fazer", "implementar", "criar", "refator", "definir", "alinhar", "resolver", "precisa", "vamos"]

    tasks: List[TaskOut] = []
    for s in sentences[:30]:
        if any(k in s.lower() for k in keywords):
            body = (
                f"Ação:\n{s}\n\n"
                "Anexos/Referências:\n"
            ).strip()
            tasks.append(
                TaskOut(
                    title=f"Tarefa #{len(tasks)+1}",
                    body=body,
                    assignees=list(assignees),
                )
            )
        if len(tasks) >= 5:
            break

    if not tasks:
        tasks.append(
            TaskOut(
                title="Ações do áudio",
                body=(
                    f"Ações do áudio:\n{transcript[:500]}\n\n"
                    "Anexos/Referências:\n"
                ).strip(),
                assignees=list(assignees),
            )
        )

    return SummaryTasksOut(summary=summary, tasks=tasks)
