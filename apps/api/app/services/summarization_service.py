from __future__ import annotations

import json
from typing import List, Dict, Any

from pydantic import BaseModel

# obs: o resumo é determinístico (sem OpenAI/LangChain).

class TaskOut(BaseModel):
    title: str
    body: str = ""
    assignees: List[str] = []


class SummaryTasksOut(BaseModel):
    summary: str
    tasks: List[TaskOut]


def build_prompt(transcript: str, assignees: List[str]) -> str:
    # forçamos JSON estrito no output para facilitar o parse do resultado.
    # se o modelo falhar, pode ser necessário adaptar o parser/validação.
    return f"""
Você é um assistente que transforma o conteúdo de uma gravação em:
1) um resumo curto
2) uma lista de tarefas (issues) para um time de desenvolvimento

REGRAS:
- Gere tasks SE houver ações, decisões, dúvidas ou itens de trabalho.
- Cada task deve ter title claro e body contendo contexto.
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


def summarize_and_extract(transcript: str, assignees: List[str]) -> SummaryTasksOut:
    """MVP determinístico (sem OpenAI/LangChain).

    Para produção: você pode substituir por um LLM real, mas este projeto pode funcionar apenas com Whisper local.
    """


    if not transcript.strip():
        return SummaryTasksOut(summary="", tasks=[])

    # fallback simples
    sentences = [s.strip() for s in transcript.replace("\n", " ").split(".") if s.strip()]
    summary = ". ".join(sentences[:3]).strip()

    # heurística: separar por linhas/frases com palavras típicas
    tasks: List[TaskOut] = []
    keywords = ["fazer", "implementar", "criar", "refator", "definir", "alinhar", "resolver", "precisa", "vamos"]

    for i, s in enumerate(sentences[:30]):
        if any(k in s.lower() for k in keywords):
            tasks.append(TaskOut(title=f"Tarefa #{len(tasks)+1}", body=s, assignees=list(assignees)))
        if len(tasks) >= 5:
            break

    # se não encontrou, tenta ao menos 1 task genérica
    if not tasks and len(sentences) > 0:
        tasks.append(TaskOut(title="Ações do áudio", body=transcript[:500], assignees=list(assignees)))

    return SummaryTasksOut(summary=summary, tasks=tasks)

