from __future__ import annotations

import re
from typing import Dict, List

from ..models.database import get_user_aliases


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def _extract_candidates(transcript: str) -> List[str]:
    """MVP: extrai "palavras" e sequências simples para tentar bater com aliases.

    Estratégia:
    - manter só tokens alfanuméricos/underscore/acentos
    - gerar n-grams de 1 até 3 tokens (ex: "felipe potigol")
    """

    tokens = re.findall(r"[\wÀ-ÿ]+", transcript, flags=re.IGNORECASE)
    tokens = [_normalize(t) for t in tokens if t.strip()]

    candidates: List[str] = []
    for n in (1, 2, 3):
        for i in range(0, len(tokens) - n + 1):
            gram = " ".join(tokens[i : i + n])
            candidates.append(gram)

    # dedupe preservando ordem
    seen = set()
    out = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def resolve_assignees_from_transcript(*, transcript: str, allowed_github_logins: List[str] | None = None) -> List[str]:
    """
    Retorna github_logins resolvidos a partir de menções por nome/apelido.

    allowed_github_logins:
      - se fornecido, filtra para apenas esses logins.
    """

    transcript_norm = _normalize(transcript)
    if not transcript_norm:
        return []

    aliases = get_user_aliases()
    # aliases: {normalized_alias: github_login}

    candidates = _extract_candidates(transcript_norm)

    resolved: List[str] = []
    for cand in candidates:
        gh = aliases.get(cand)
        if not gh:
            continue
        if allowed_github_logins is not None and gh not in allowed_github_logins:
            continue
        if gh not in resolved:
            resolved.append(gh)

    return resolved

