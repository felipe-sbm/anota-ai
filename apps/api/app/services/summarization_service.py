from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel


# obs: o resumo pode ser determinístico (fallback) ou via Ollama.


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
1) um resumo curto
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


async def summarize_and_extract(
    transcript: str,
    assignees: List[str],
    *,
    ollama_base_url: str,
    ollama_model: str,
    llm_enabled: bool,
) -> SummaryTasksOut:
    """Resumir e extrair tasks.

    - Se llm_enabled: tenta Ollama e parseia JSON estrito.
    - Se falhar: fallback determinístico.
    """

    if not transcript.strip():
        return SummaryTasksOut(summary="", tasks=[])

    if llm_enabled:
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
            # fallback silencioso
            pass

    # fallback determinístico (bom o suficiente para não quebrar o fluxo)
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

