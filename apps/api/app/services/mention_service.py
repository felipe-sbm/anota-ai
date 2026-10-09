"""Helpers for resolving responsible users mentioned in transcripts."""

from __future__ import annotations

import re
from typing import Any, Dict, List

from ..models.database import get_user_aliases


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def _extract_candidates(transcript: str) -> List[str]:
    # MVP: extrai palavras e sequências simples para tentar bater com aliases.
    # estratégia: manter só tokens alfanuméricos, underscore e acentos;
    # gerar n grams de 1 até 3 tokens (exemplo: felipe potigol)

    tokens: List[Any] = re.findall(r"[\wÀ-ÿ]+", transcript, flags=re.IGNORECASE)
    tokens: List[str] = [_normalize(t) for t in tokens if t.strip()]

    candidates: List[str] = []
    for n in (1, 2, 3):
        for i in range(0, len(tokens) - n + 1):
            gram: str = " ".join(tokens[i : i + n])
            candidates.append(gram)

    # remove duplicados preservando a ordem
    seen = set()
    out = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def resolve_assignees_from_transcript(*, transcript: str, allowed_github_logins: List[str] | None = None) -> List[str]:
    """Return unique matching assignees, optionally restricted to project members."""
    """Resolve transcript mentions to allowed GitHub logins.

    Args:
        transcript: Meeting transcript containing participant references.
        allowed_github_logins: Optional project membership allowlist.

    Returns:
        Unique GitHub logins that can be assigned to generated issues.
    """
    # retorna github_logins resolvidos a partir de menções por nome ou apelido.
    # allowed_github_logins: se fornecido, filtra para apenas esses logins.

    transcript_norm: str = _normalize(transcript)
    if not transcript_norm:
        return []

    aliases: Dict[str, str] = get_user_aliases()
    # aliases no formato alias normalizado para github_login

    candidates: List[str] = _extract_candidates(transcript_norm)

    resolved: List[str] = []
    for cand in candidates:
        gh: str | None = aliases.get(cand)
        if not gh:
            continue
        if allowed_github_logins is not None and gh not in allowed_github_logins:
            continue
        if gh not in resolved:
            resolved.append(gh)

    return resolved
"""Resolve people mentioned in transcripts to allowed GitHub logins."""
