from __future__ import annotations

import json
import logging
import re
from typing import Any, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from ..core.config import settings

logger = logging.getLogger(__name__)

# obs: o resumo pode ser determinístico (fallback) ou via LLM (que o groq eh o padrão).


class TaskOut(BaseModel):
    title: str
    body: str = ""
    assignees: list[str] = Field(default_factory=list)


class DecisionOut(BaseModel):
    title: str
    context: str = ""


class SummaryTasksOut(BaseModel):
    summary: str
    tasks: list[TaskOut]
    decisions: list[DecisionOut] = Field(default_factory=list)


class MeetingAnalysis(BaseModel):
    overview: str
    decisions: list[DecisionOut] = Field(default_factory=list)


class MeetingState(TypedDict, total=False):
    transcript: str
    assignees: list[str]
    ollama_base_url: str
    ollama_model: str
    llm_enabled: bool
    prepared_content: str
    analysis: MeetingAnalysis
    summary: str
    decisions: list[DecisionOut]
    tasks: list[TaskOut]


def build_prompt(transcript: str, assignees: list[str]) -> str:
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

# depois vou colocar um prompt melhor, esse é só um teste.
def build_analysis_prompt(content: str) -> str:
    return f"""
você analisa transcrições de reuniões. Por favor, identifique somente informações presentes no texto.

Responda exclusivamente em JSON válido neste formato:
{{
  "overview": string,
  "decisions": [
    {{"title": string, "context": string}}
  ]
}}

TRANSCRIÇÃO:
{content}
""".strip()


def _parse_json(content: str) -> dict[str, Any]:
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


async def _groq_chat_json(prompt: str) -> dict[str, Any]:
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


async def _ollama_chat_json(
    prompt: str,
    base_url: str,
    model: str,
) -> dict[str, Any]:
    from .ollama_service import chat_json

    return await chat_json(prompt=prompt, base_url=base_url, model=model)


async def _request_json(state: MeetingState, prompt: str) -> dict[str, Any] | None:
    if not state.get("llm_enabled"):
        return None

    try:
        if _groq_api_key():
            return await _groq_chat_json(prompt)
        return await _ollama_chat_json(
            prompt,
            state.get("ollama_base_url", ""),
            state.get("ollama_model", ""),
        )
    except Exception:
        logger.exception("falha ao executar etapa do grafo com ia")
        return None


def _sentences(content: str) -> list[str]:
    return [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", content) if sentence.strip()]


def _fallback_tasks(content: str, assignees: list[str]) -> list[TaskOut]:
    keywords = ["fazer", "implementar", "criar", "refator", "definir", "alinhar", "resolver", "precisa", "vamos"]
    tasks: list[TaskOut] = []
    for sentence in _sentences(content)[:30]:
        if any(keyword in sentence.lower() for keyword in keywords):
            tasks.append(
                TaskOut(
                    title=f"Tarefa #{len(tasks) + 1}",
                    body=f"Ação:\n{sentence}\n\nAnexos/Referências:",
                    assignees=list(assignees),
                )
            )
        if len(tasks) >= 5:
            break

    if not tasks:
        tasks.append(
            TaskOut(
                title="Ações do áudio",
                body=f"Ações do áudio:\n{content[:500]}\n\nAnexos/Referências:",
                assignees=list(assignees),
            )
        )
    return tasks


async def _prepare_content(state: MeetingState) -> dict[str, Any]:
    # normaliza o texto antes de enviar para as etapas do grafo
    transcript = state.get("transcript", "")
    return {"prepared_content": re.sub(r"\s+", " ", transcript).strip()}


async def _analyze_meeting(state: MeetingState) -> dict[str, Any]:
    content = state.get("prepared_content", "")
    payload = await _request_json(state, build_analysis_prompt(content))

    if payload is not None:
        try:
            return {"analysis": MeetingAnalysis(**payload)}
        except Exception:
            logger.exception("resposta de análise inválida")

    return {
        "analysis": MeetingAnalysis(
            overview=" ".join(_sentences(content)[:3]),
            decisions=[],
        )
    }


async def _generate_summary(state: MeetingState) -> dict[str, Any]:
    analysis = state.get("analysis")
    return {"summary": analysis.overview if analysis else ""}


async def _extract_decisions(state: MeetingState) -> dict[str, Any]:
    analysis = state.get("analysis")
    return {"decisions": analysis.decisions if analysis else []}


async def _extract_tasks(state: MeetingState) -> dict[str, Any]:
    content = state.get("prepared_content", "")
    assignees = state.get("assignees", [])
    payload = await _request_json(state, build_prompt(content, assignees))

    if payload is not None:
        try:
            return {"tasks": SummaryTasksOut(**payload).tasks}
        except Exception:
            logger.exception("resposta de tarefas inválida")
    return {"tasks": _fallback_tasks(content, assignees)}


async def _assign_responsibles(state: MeetingState) -> dict[str, Any]:
    # mantém apenas responsáveis que foram autorizados para a reunião
    allowed = {assignee.casefold(): assignee for assignee in state.get("assignees", [])}
    assigned_tasks: list[TaskOut] = []

    for task in state.get("tasks", []):
        assignees: list[str] = []
        for assignee in task.assignees:
            normalized = assignee.casefold()
            if normalized in allowed and allowed[normalized] not in assignees:
                assignees.append(allowed[normalized])
        assigned_tasks.append(task.model_copy(update={"assignees": assignees}))
    return {"tasks": assigned_tasks}

# as saídas independentes são executadas depois da análise compartilhada
def _build_meeting_graph():
    workflow = StateGraph(MeetingState)
    workflow.add_node("prepare_content", _prepare_content)
    workflow.add_node("analyze_meeting", _analyze_meeting)
    workflow.add_node("generate_summary", _generate_summary)
    workflow.add_node("extract_decisions", _extract_decisions)
    workflow.add_node("extract_tasks", _extract_tasks)
    workflow.add_node("assign_responsibles", _assign_responsibles)
    workflow.add_edge(START, "prepare_content")
    workflow.add_edge("prepare_content", "analyze_meeting")
    workflow.add_edge("analyze_meeting", "generate_summary")
    workflow.add_edge("analyze_meeting", "extract_decisions")
    workflow.add_edge("analyze_meeting", "extract_tasks")
    workflow.add_edge("extract_tasks", "assign_responsibles")
    workflow.add_edge("generate_summary", END)
    workflow.add_edge("extract_decisions", END)
    workflow.add_edge("assign_responsibles", END)
    return workflow.compile()


meeting_graph = _build_meeting_graph()


async def summarize_and_extract(
    transcript: str, assignees: list[str],
    *, ollama_base_url: str = "", ollama_model: str = "",
    llm_enabled: bool = False) -> SummaryTasksOut:

    if not transcript.strip():
        return SummaryTasksOut(summary="", tasks=[], decisions=[])

    result = await meeting_graph.ainvoke(
        {
            "transcript": transcript,
            "assignees": assignees,
            "ollama_base_url": ollama_base_url,
            "ollama_model": ollama_model,
            "llm_enabled": llm_enabled,
        }
    )
    return SummaryTasksOut(
        summary=result.get("summary", ""),
        tasks=result.get("tasks", []),
        decisions=result.get("decisions", []),
    )
