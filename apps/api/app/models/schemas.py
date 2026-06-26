from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProcessAudioRequest(BaseModel):
    # Repo alvo em formato: org/repo
    repo_full_name: str = Field(..., description="GitHub repo full name, ex: org/repo")

    # Logins GitHub
    assignees: List[str] = Field(default_factory=list)

    # Se a extensão enviar file_id
    file_id: Optional[str] = Field(default=None)


class TaskSpec(BaseModel):
    title: str
    body: str = ""
    assignees: List[str] = Field(default_factory=list)


class ProcessAudioResponse(BaseModel):
    transcript: str
    summary: str
    tasks: List[TaskSpec]
    created_issues: List[Dict[str, Any]] = Field(default_factory=list)


class TranscribeResponse(BaseModel):
    transcript: str


class JwtSubject(BaseModel):
    sub: str
    github_login: Optional[str] = None

