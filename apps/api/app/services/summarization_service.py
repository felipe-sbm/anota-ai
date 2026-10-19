"""Meeting-analysis pipeline built with LangGraph.

The graph prepares transcript content, optionally calls Groq or Ollama for
structured JSON, and falls back to deterministic heuristics when LLM analysis
is disabled or unavailable. Its output is deliberately typed before it is
returned to routes.
"""

from __future__ import annotations

import json
import logging
import re
from collections import Counter
from typing import Any, Literal, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from ..core.config import settings

logger = logging.getLogger(__name__)

# obs: o resumo pode ser determinístico (fallback) ou via LLM (o groq é o padrão).


class TaskOut(BaseModel):
    """AI-generated or fallback task suggestion."""
    title: str
    body: str = ""
    assignees: list[str] = Field(default_factory=list)
    points: int = Field(default=0, description="Importância estimada entre 0 e 100 (sugestão)")
    priority: str = Field(default="medium", description='Sugestão: "low", "medium" ou "high"')


class DecisionOut(BaseModel):
    """Decision identified in the meeting, including its current status."""
    title: str
    context: str = ""
    status: Literal["aligned", "needs_discussion"] = Field(
        default="aligned",
        description=(
            '"aligned" quando houve consenso; '
            '"needs_discussion" quando ainda depende de conversa.'
        ),
    )


class DetailOut(BaseModel):
    """A discussion topic expanded in the meeting notes (section "Detalhes")."""
    topic: str
    notes: str = ""


class MeetingAnalysis(BaseModel):
    """Professional, structured reading of a meeting."""
    title: str = ""
    overview: str = ""
    decisions: list[DecisionOut] = Field(default_factory=list)
    details: list[DetailOut] = Field(default_factory=list)


class TasksExtractionOut(BaseModel):
    """Tasks returned by the extraction step before responsible resolution."""
    tasks: list[TaskOut] = Field(default_factory=list)


class SummaryTasksOut(BaseModel):
    """Complete result of meeting summarization and task extraction."""
    title: str = ""
    summary: str = ""
    decisions: list[DecisionOut] = Field(default_factory=list)
    details: list[DetailOut] = Field(default_factory=list)
    tasks: list[TaskOut] = Field(default_factory=list)


class MeetingState(TypedDict, total=False):
    transcript: str
    assignees: list[str]
    ollama_base_url: str
    ollama_model: str
    llm_enabled: bool
    prepared_content: str
    analysis: MeetingAnalysis
    title: str
    summary: str
    decisions: list[DecisionOut]
    details: list[DetailOut]
    tasks: list[TaskOut]


def build_prompt(transcript: str, assignees: list[str]) -> str:
    """Build the strict JSON prompt used for task extraction."""
    # forçamos JSON estrito no output para facilitar o parse do resultado.
    return f"""
Você recebe a transcrição de uma reunião e extrai as próximas etapas (tarefas)
para um time de desenvolvimento.

REGRAS:
- Gere tasks SE houver ações, decisões, dúvidas ou itens de trabalho.
- Cada task deve ter um "title" curto e claro (no imperativo, ex: "Criar tela de login")
  e um "body" com o contexto necessário para executá-la.
- No campo body, inclua SEMPRE uma seção final chamada "Anexos/Referências:".
  - Se não houver anexos, deixe "Anexos/Referências:" vazio (apenas a seção).
  - Não invente anexos; use apenas informações que existam no texto.
- NÃO invente assignees. Use APENAS os assignees fornecidos pelo usuário.
- Se assignees estiver vazio, deixe assignees de cada task como [].
- Cada task deve incluir "points" (número inteiro entre 0 e 100, importancia estimada)
  e "priority" ("low", "medium" ou "high", urgência/impacto).
- points e priority são APENAS UMA SUGESTÃO do sistema; o usuário poderá ajustá-los depois.

OUTPUT EXCLUSIVAMENTE em JSON válido no formato:
{{
  \"tasks\": [
    {{
      \"title\": string,
      \"body\": string,
      \"assignees\": [string],
      \"points\": 20,
      \"priority\": \"high\"
    }}
  ]
}}

ASSIGNEES (logins GitHub): {assignees}

TRANSCRIÇÃO:
{transcript}
""".strip()


def build_analysis_prompt(content: str) -> str:
    """Build the prompt that produces professional, structured meeting notes."""
    # o objetivo é gerar anotações no estilo de um resumo executivo: um título
    # curto, um panorama, as decisões (com status) e os detalhes por tópico.
    return f"""
Você é um analista sênior que transforma a transcrição de uma reunião em
anotações profissionais, no estilo de um resumo executivo.

Analise SOMENTE o que está na transcrição e responda, exclusivamente, com um
objeto JSON válido neste formato:
{{
  "title": string,
  "overview": string,
  "decisions": [
    {{"title": string, "context": string, "status": "aligned" | "needs_discussion"}}
  ],
  "details": [
    {{"topic": string, "notes": string}}
  ]
}}

REGRAS:
- "title": frase curta (3 a 8 palavras), sem ponto final, que resuma a reunião
  inteira (ex: "Alinhamento de ideias para continuidade do MVP").
- "overview": resumo executivo em 1 a 2 parágrafos, cobrindo o essencial do que
  foi discutido, com começo, meio e fim. Deve fazer sentido sozinho.
- "decisions": liste apenas decisões, consensos e itens que ficaram em aberto.
  - Use "aligned" quando houve consenso ou fechamento.
  - Use "needs_discussion" quando ainda depende de uma conversa futura.
  - Deixe "decisions" como [] se não houver nenhuma.
- "details": agrupe a discussão por assunto; cada item traz um "topic" curto e
  "notes" com o detalhamento do que foi dito sobre ele (o equivalente à seção
  "Detalhes" das anotações). Quanto mais completo, melhor.
- NÃO invente nomes, prazos, números ou fatos que não estejam no texto.
- Escreva em português do Brasil, com tom profissional, objetivo e claro.

TRANSCRIÇÃO:
{content}
""".strip()


def _parse_json(content: str) -> dict[str, Any]:
    # pega o primeiro objeto json válido da resposta da ia.
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            raise ValueError(f"A resposta não contém JSON válido: {content[:200]}")
        return json.loads(match.group(0))


def _groq_api_key() -> str:
    # retorna a chave do groq.
    return settings.GROQ_API_KEY


async def _groq_chat_json(prompt: str) -> dict[str, Any]:
    # chama o endpoint compatível com openai do groq pedindo json estrito.
    # precisa da chave do groq no .env (pegue pelo console.groq.com).
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
    # quebra em frases por pontuação final ou por quebra de linha (transcrições
    # costumam vir sem pontuação, mas com um segmento por linha).
    parts = re.split(r"(?<=[.!?])\s+|\n+", content)
    return [part.strip() for part in parts if part.strip()]


def _strip_speaker(sentence: str) -> str:
    """Remove a leading speaker prefix such as ``Felipe Samuel:`` when present."""
    head, sep, tail = sentence.partition(":")
    if sep and tail.strip() and len(head) <= 40:
        return tail.strip()
    return sentence.strip()


# palavras funcionais ignoradas na extração de tópicos (fallback determinístico)
_STOPWORDS = {
    "para", "como", "porque", "sobre", "entre", "depois", "antes", "também",
    "tambem", "ainda", "sempre", "nunca", "muito", "pouco", "então", "entao",
    "assim", "onde", "quando", "qual", "quais", "esse", "essa", "isso", "este",
    "esta", "isto", "aquele", "aquela", "estou", "estamos", "estava", "vamos",
    "acho", "beleza", "tipo", "coisa", "coisas", "gente", "pessoal", "aqui",
    "ali", "lá", "la", "meu", "minha", "seu", "sua", "nosso", "nossa", "eles",
    "elas", "você", "voce", "vocês", "voces", "todos", "todas", "fazer", "feito",
    "vai", "vou", "vão", "vao", "ser", "sendo", "tem", "têm", "tinha", "ter",
    "está", "estao", "estão", "era", "eram", "mas", "que", "com", "uma", "dos",
    "das", "por", "pra", "pro", "não", "nao", "sim", "bem", "mais", "menos",
    "cada", "outro", "outra", "pode", "podem", "podemos", "deve", "devem",
    "dever", "falar", "falei", "partir", "até", "ate", "desde", "sem", "nem",
    "ou", "ele", "ela", "nas", "nos", "num", "numa", "tava", "ficar", "ficou",
    "precisa", "preciso", "precisamos", "sugiro", "sugerir", "sugestão",
    "sugestao", "arcar", "manter", "gerar", "usar", "usamos", "utilizar",
    "definimos", "definido", "definir", "estabelecido", "estabelecer",
    "acordado", "acordada", "acordamos", "decidido", "decidimos", "combinamos",
    "escolhemos", "optamos", "adotar", "adotamos", "devemos", "começa",
    "comecar", "começar", "inicia", "iniciar", "ajudar", "adianta", "adiantar",
    "agiliza", "agilizar", "funciona", "funcionar", "gera", "criar", "cria",
    "implementar", "resolver", "alinhar", "revisar", "verificar", "primeiro",
    "depois", "ainda", "será", "sera", "ente", "né", "ne", "tá", "ta", "já",
    "ja", "tipo", "parte", "entrar", "colocar", "deixar", "olha", "mano",
}

# pistas textuais usadas para separar decisões fechadas de itens em aberto
_DECISION_ALIGNED = (
    "ficou acordado", "ficou decidido", "ficou definido", "decidimos",
    "acordamos", "combinamos", "definimos", "escolhemos", "optamos",
    "vamos usar", "vai ser", "será", "sera", "adotar", "adoção", "adocao",
)
_DECISION_OPEN = (
    "precisa de mais conversa", "em aberto", "a definir", "falta definir",
    "pendente", "depende", "fica para depois", "próxima reunião",
    "proxima reuniao", "discutir depois", "ainda precisa",
)


def _looks_like_verb(word: str) -> bool:
    """Cheap heuristic to drop common verb forms from topic keywords."""
    if len(word) < 4:
        return False
    return word.endswith(("ar", "er", "ir", "ou", "am"))


def _content_words(text: str) -> list[str]:
    """Return the meaningful lowercase words of a sentence."""
    words: list[str] = []
    for token in re.findall(r"[0-9A-Za-zÀ-ÿ]+", text):
        lowered = token.lower()
        if lowered in _STOPWORDS or lowered.isdigit() or _looks_like_verb(lowered):
            continue
        if len(lowered) >= 4 or (token.isupper() and len(lowered) >= 3):
            words.append(lowered)
    return words


def _keyword_forms(sentences: list[str]) -> tuple[Counter, dict[str, str]]:
    """Count keywords and keep their original casing for display."""
    freq: Counter = Counter()
    forms: dict[str, str] = {}
    for sentence in sentences:
        for token in re.findall(r"[0-9A-Za-zÀ-ÿ]+", sentence):
            lowered = token.lower()
            if lowered in _STOPWORDS or lowered.isdigit() or _looks_like_verb(lowered):
                continue
            if len(lowered) < 4 and not (token.isupper() and len(lowered) >= 3):
                continue
            freq[lowered] += 1
            forms.setdefault(lowered, token)
    return freq, forms


def _rank_sentences(sentences: list[str]) -> list[int]:
    """Rank sentence indexes by salience (keyword frequency, length-normalised)."""
    freq, _ = _keyword_forms(sentences)
    if not freq:
        return list(range(len(sentences)))
    top = max(freq.values())
    scored: list[tuple[float, int]] = []
    for index, sentence in enumerate(sentences):
        words = _content_words(sentence)
        if not words:
            continue
        score = sum(freq[word] / top for word in words) / (len(words) ** 0.5)
        scored.append((score, index))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [index for _, index in scored]


_LEAD_FILLERS = (
    "a gente", "gente", "eu", "nós", "nos", "então", "entao", "aí", "ai",
    "olha", "bom", "vamos", "acho que", "eu acho", "tipo", "beleza",
    "definimos que", "decidimos que", "combinamos que", "acordamos que",
    "ficou acordado", "ficou decidido", "ficou definido", "ficou estabelecido",
    "precisamos", "precisa", "temos que", "temos", "que", "é", "eh",
    "de", "do", "da", "dos", "das", "o", "a", "os", "as", "um", "uma",
    "uns", "umas", "em", "no", "na", "para", "pra", "pro", "com", "por",
)


def _trim_leading_fillers(text: str) -> str:
    """Drop conversational prefixes so phrases start on the actual content."""
    current = text.strip()
    changed = True
    while changed and current:
        changed = False
        lowered = current.lower()
        for filler in _LEAD_FILLERS:
            if lowered.startswith(filler + " "):
                current = current[len(filler):].strip()
                changed = True
                break
    return current


# palavras que não devem terminar um título/frase
_TRAIL_FILLERS = {
    "de", "do", "da", "dos", "das", "o", "a", "os", "as", "um", "uma", "uns",
    "umas", "em", "no", "na", "nos", "nas", "para", "pra", "pro", "com", "por",
    "que", "e", "ou", "como", "sobre", "entre", "ao", "aos", "se", "à",
}


def _short_phrase(sentence: str, limit: int = 9) -> str:
    """Turn a sentence into a short, capitalised phrase."""
    cleaned = re.sub(r"[^\wÀ-ÿ\s]", "", _strip_speaker(sentence))
    cleaned = _trim_leading_fillers(cleaned)
    words = cleaned.split()[:limit]
    while words and words[-1].lower() in _TRAIL_FILLERS:
        words.pop()
    phrase = " ".join(words)[:80].strip()
    return (phrase[:1].upper() + phrase[1:]) if phrase else ""


def _fallback_title(sentences: list[str]) -> str:
    """Build a short title from the meeting's most frequent keywords."""
    freq, forms = _keyword_forms(sentences)
    keywords = [forms[word] for word, _ in freq.most_common(4)]
    if len(keywords) >= 2:
        head = ", ".join(keywords[:2])
        if len(keywords) >= 3:
            head += " e " + keywords[2]
        return head[:80]
    for sentence in sentences:
        phrase = _short_phrase(sentence, 8)
        if len(phrase.split()) >= 3:
            return phrase
    return "Reunião"


def _fallback_overview(sentences: list[str], limit: int = 4) -> str:
    """Compose an overview from the most salient sentences, in original order."""
    ranked = _rank_sentences(sentences)[:limit]
    if not ranked:
        return " ".join(sentences[:3]).strip()
    return " ".join(sentences[index] for index in sorted(ranked)).strip()


def _fallback_decisions(sentences: list[str], limit: int = 5) -> list[DecisionOut]:
    """Detect closed and open decisions from textual cues."""
    decisions: list[DecisionOut] = []
    seen: set[str] = set()
    for sentence in sentences:
        lowered = sentence.lower()
        matched = next((cue for cue in _DECISION_OPEN if cue in lowered), None)
        if matched:
            status: Literal["aligned", "needs_discussion"] = "needs_discussion"
        else:
            matched = next((cue for cue in _DECISION_ALIGNED if cue in lowered), None)
            status = "aligned"
        if not matched:
            continue

        # a decisão começa na pista ("ficou acordado", "vamos usar"...), então o
        # título parte desse trecho para não herdar a introdução da frase.
        start = lowered.find(matched)
        snippet = sentence[start:].strip() if start >= 0 else sentence
        title = _short_phrase(snippet)
        if not title or title.lower() in seen:
            continue
        seen.add(title.lower())
        decisions.append(DecisionOut(title=title, context=sentence.strip(), status=status))
        if len(decisions) >= limit:
            break
    return decisions


def _similarity(left: set[str], right: set[str]) -> float:
    """Jaccard similarity between two keyword sets."""
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def _fallback_details(sentences: list[str], limit: int = 5) -> list[DetailOut]:
    """Cluster the discussion into topics and summarise each one."""
    clusters: list[dict[str, Any]] = []
    for sentence in sentences:
        words = set(_content_words(sentence))
        if len(words) < 2:
            continue
        best: dict[str, Any] | None = None
        best_score = 0.0
        for cluster in clusters:
            score = _similarity(words, cluster["words"])
            if score > best_score:
                best, best_score = cluster, score
        if best is not None and best_score >= 0.2:
            best["sentences"].append(sentence)
            best["words"] |= words
        else:
            clusters.append({"words": set(words), "sentences": [sentence]})

    details: list[DetailOut] = []
    for cluster in clusters:
        cluster_sentences: list[str] = cluster["sentences"]
        if not cluster_sentences:
            continue
        freq, forms = _keyword_forms(cluster_sentences)
        topic = ", ".join(forms[word] for word, _ in freq.most_common(3)) or "Tópicos discutidos"
        ranked = _rank_sentences(cluster_sentences)[:3]
        notes = " ".join(cluster_sentences[index] for index in sorted(ranked))
        details.append(DetailOut(topic=topic[:80], notes=notes))

    details.sort(key=lambda item: len(item.notes), reverse=True)
    return details[:limit]


def _fallback_analysis(content: str) -> MeetingAnalysis:
    """Extractive meeting reading used when the LLM is unavailable.

    It cleans speaker prefixes and duplicated lines, ranks sentences by keyword
    salience, and derives a title, an overview, decisions, and topics — so the
    recording still yields a readable, professional-looking summary offline.
    """
    seen: set[str] = set()
    sentences: list[str] = []
    for raw in _sentences(content):
        clean = _strip_speaker(raw)
        key = clean.lower().strip()
        if not clean or key in seen:
            continue
        seen.add(key)
        sentences.append(clean)

    if not sentences:
        return MeetingAnalysis()

    return MeetingAnalysis(
        title=_fallback_title(sentences),
        overview=_fallback_overview(sentences),
        decisions=_fallback_decisions(sentences),
        details=_fallback_details(sentences),
    )


def _suggest_priority(content: str) -> str:
    # um pequeno heurístico para sugerir prioridade baseado em palavras-chave
    # depois vou até deixar mais complexo para pegar de tudo, e por contexto também.
    # para mvp não é necessário tanta complexidade
    
    high = (
        "urgente", "urgência", "urgência", "imediato", "immediato", "asap",
        "crític", "critic", "bloquea", "produção", "produccion", "bug",
        "erro", "roto", "quiebra", "parado", "importante", "prioridade alta",
    )
    low = (
        "opcional", "podemos depois", "para depois", "quando puder",
        "cuando se pueda", "quando der", "sugestão", "sugerencia", "idea",
        "nice to have", "sem urgência", "sin urgencia",
    )
    content_lower = content.lower()
    if any(keyword in content_lower for keyword in high):
        return "high"
    if any(keyword in content_lower for keyword in low):
        return "low"
    return "medium"


def _suggest_points(content: str, priority: str) -> int:
    base = {"high": 40, "medium": 20, "low": 5}.get(priority, 20)
    content_lower = content.lower()
    extra = 0
    if any(
        keyword in content_lower
        for keyword in (
            "complexo", "complejo", "grande", "integração", "integracion",
            "refactor", "migra", "arquitectura", "arquitetura",
        )
    ):
        extra = 15
    return min(base + extra, 100)


def _fallback_tasks(content: str, assignees: list[str]) -> list[TaskOut]:
    keywords = ["fazer", "implementar", "criar", "refator", "definir", "alinhar", "resolver", "precisa", "vamos"]
    tasks: list[TaskOut] = []
    for sentence in _sentences(content)[:30]:
        clean = _strip_speaker(sentence)
        if any(keyword in clean.lower() for keyword in keywords):
            priority = _suggest_priority(clean)
            title = _short_phrase(clean, 8) or f"Tarefa #{len(tasks) + 1}"
            tasks.append(
                TaskOut(
                    title=title,
                    body=f"Ação:\n{clean}\n\nAnexos/Referências:",
                    assignees=list(assignees),
                    points=_suggest_points(clean, priority),
                    priority=priority,
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
    # normaliza espaços sem destruir as quebras de linha da transcrição
    transcript = state.get("transcript", "")
    normalized = re.sub(r"[ \t]+", " ", transcript)
    normalized = re.sub(r"\n{2,}", "\n", normalized)
    return {"prepared_content": normalized.strip()}


async def _analyze_meeting(state: MeetingState) -> dict[str, Any]:
    content = state.get("prepared_content", "")
    payload = await _request_json(state, build_analysis_prompt(content))

    if payload is not None:
        try:
            return {"analysis": MeetingAnalysis(**payload)}
        except Exception:
            logger.exception("resposta de análise inválida")

    return {"analysis": _fallback_analysis(content)}


async def _generate_summary(state: MeetingState) -> dict[str, Any]:
    analysis = state.get("analysis")
    return {
        "title": analysis.title if analysis else "",
        "summary": analysis.overview if analysis else "",
    }


async def _extract_decisions(state: MeetingState) -> dict[str, Any]:
    analysis = state.get("analysis")
    return {"decisions": analysis.decisions if analysis else []}


async def _extract_details(state: MeetingState) -> dict[str, Any]:
    analysis = state.get("analysis")
    return {"details": analysis.details if analysis else []}


async def _extract_tasks(state: MeetingState) -> dict[str, Any]:
    content = state.get("prepared_content", "")
    assignees = state.get("assignees", [])
    payload = await _request_json(state, build_prompt(content, assignees))

    if payload is not None:
        try:
            return {"tasks": TasksExtractionOut(**payload).tasks}
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
    workflow.add_node("extract_details", _extract_details)
    workflow.add_node("extract_tasks", _extract_tasks)
    workflow.add_node("assign_responsibles", _assign_responsibles)
    workflow.add_edge(START, "prepare_content")
    workflow.add_edge("prepare_content", "analyze_meeting")
    workflow.add_edge("analyze_meeting", "generate_summary")
    workflow.add_edge("analyze_meeting", "extract_decisions")
    workflow.add_edge("analyze_meeting", "extract_details")
    workflow.add_edge("analyze_meeting", "extract_tasks")
    workflow.add_edge("extract_tasks", "assign_responsibles")
    workflow.add_edge("generate_summary", END)
    workflow.add_edge("extract_decisions", END)
    workflow.add_edge("extract_details", END)
    workflow.add_edge("assign_responsibles", END)
    return workflow.compile()


meeting_graph = _build_meeting_graph()


async def summarize_and_extract(
    transcript: str, assignees: list[str],
    *, ollama_base_url: str = "", ollama_model: str = "",
    llm_enabled: bool = False) -> SummaryTasksOut:
    """Run the analysis graph and return the title, summary, notes, and tasks.

    The function never publishes GitHub issues. Persistence and publication
    are explicit responsibilities of the route layer after user review.
    """

    if not transcript.strip():
        return SummaryTasksOut()

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
        title=result.get("title", ""),
        summary=result.get("summary", ""),
        decisions=result.get("decisions", []),
        details=result.get("details", []),
        tasks=result.get("tasks", []),
    )
