from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProcessAudioRequest(BaseModel):
    # Repo alvo em formato: org/repo (opcional - se não informado, só transcreve e sumariza)
    repo_full_name: Optional[str] = Field(default=None, description="GitHub repo full name, ex: org/repo")

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


class IssueTaskConfig(BaseModel):
    """Config for a single issue to be created"""
    title: str
    body: str = ""
    repo_full_name: str
    assignee: Optional[str] = Field(default=None, description="GitHub login do responsável")


class CreateIssuesBatchRequest(BaseModel):
    file_id: Optional[str] = Field(default=None, description="Se informado, atualiza o registro com as issues criadas")
    tasks: List[IssueTaskConfig] = Field(min_length=1)