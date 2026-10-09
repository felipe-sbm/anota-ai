"""Pydantic contracts exchanged by the API routes.

These models are also the source for request and response schemas in the
FastAPI OpenAPI document. They intentionally describe transport data only;
business rules remain in route, service, and persistence modules.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class ProcessAudioRequest(BaseModel):
    """Identify an uploaded recording and its optional project context."""
    # repo alvo no formato org/repo (opcional, se não informado só transcreve e sumariza)
    repo_full_name: Optional[str] = Field(default=None, description="GitHub repo full name, ex: org/repo")

    # logins do github
    assignees: List[str] = Field(default_factory=list)

    # se a extensão enviar file_id
    file_id: Optional[str] = Field(default=None)
    project_id: Optional[str] = Field(default=None)


class TaskSpec(BaseModel):
    """Task extracted from a meeting transcript."""
    title: str
    body: str = ""
    assignees: List[str] = Field(default_factory=list)


class DecisionSpec(BaseModel):
    """Decision extracted from a meeting transcript."""
    title: str
    context: str = ""


class ProcessAudioResponse(BaseModel):
    """Structured result returned after audio analysis."""
    transcript: str
    summary: str
    tasks: List[TaskSpec]
    decisions: List[DecisionSpec] = Field(default_factory=list)
    created_issues: List[Dict[str, Any]] = Field(default_factory=list)


class TranscribeResponse(BaseModel):
    transcript: str


class JwtSubject(BaseModel):
    sub: str
    github_login: Optional[str] = None


class IssueTaskConfig(BaseModel):
    # configuração para uma única issue a ser criada
    title: str
    body: str = ""
    repo_full_name: str
    assignee: Optional[str] = Field(default=None, description="GitHub login do responsável")


class CreateIssuesBatchRequest(BaseModel):
    file_id: Optional[str] = Field(default=None, description="Se informado, atualiza o registro com as issues criadas")
    tasks: List[IssueTaskConfig] = Field(min_length=1)


class ReviewTaskSpec(BaseModel):
    title: str = Field(min_length=1)
    body: str = ""
    assignees: List[str] = Field(default_factory=list)


class ReviewRequest(BaseModel):
    tasks: List[ReviewTaskSpec] = Field(min_length=1)


class IssueCreateRequest(BaseModel):
    """Fields accepted when creating an issue immediately in GitHub."""
    # cria uma issue instantânea dentro do próprio sistema

    repo_full_name: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=256)
    body: str = ""
    assignee: Optional[str] = Field(default=None, description="GitHub login do responsável")
    labels: List[str] = Field(default_factory=list, description="Nomes das labels do GitHub")
    milestone: Optional[int] = Field(default=None, description="Número do milestone no repositório")
    project: Optional[int] = Field(default=None, description="Número do projeto clássico do repositório")
    points: int = Field(default=0, ge=0, le=100, description="Pontos/importancia no sistema")
    priority: Literal["low", "medium", "high"] = "medium"


class IssueUpdateRequest(BaseModel):
    """Optional fields used to update an internal issue or draft."""
    # atualiza campos e detalhes internos de uma tarefa (pontos, prioridade etc.)
    
    title: Optional[str] = Field(default=None, min_length=1, max_length=256)
    body: Optional[str] = None
    repo_full_name: Optional[str] = None
    assignee: Optional[str] = None
    points: Optional[int] = Field(default=None, ge=0, le=100)
    priority: Optional[Literal["low", "medium", "high"]] = None
    project_id: Optional[str] = None


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    repositories: List[str] = Field(default_factory=list)
    team_ids: List[str] = Field(default_factory=list)


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None
    repositories: Optional[List[str]] = None
    team_ids: Optional[List[str]] = None


class ProjectLinkRequest(BaseModel):
    project_id: Optional[str] = None


class ConfirmIssuesRequest(BaseModel):
    """Identifiers of drafts that should be published as GitHub issues."""
    # confirma rascunhos e os envia ao GitHub como issues reais
    
    issue_ids: List[str] = Field(min_length=1, max_length=100)


class SprintCreateRequest(BaseModel):
    # cria uma sprint (scrum enxuto: nome, objetivo e período)
    name: str = Field(min_length=1, max_length=120)
    goal: str = ""
    start_date: str = Field(min_length=10, max_length=10, description="Formato YYYY-MM-DD")
    end_date: str = Field(min_length=10, max_length=10, description="Formato YYYY-MM-DD")
    status: Literal["planned", "active", "completed"] = "planned"


class SprintUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    goal: Optional[str] = None
    start_date: Optional[str] = Field(default=None, min_length=10, max_length=10)
    end_date: Optional[str] = Field(default=None, min_length=10, max_length=10)
    status: Optional[Literal["planned", "active", "completed"]] = None


class SprintTaskCreateRequest(BaseModel):
    """A backlog item created manually or from a meeting recording."""
    # item do sprint backlog; pode vir de reunião (record_id) ou ser manual; o
    # issue_id vincula a tarefa com uma issue existente no sistema/GitHub.
    title: str = Field(min_length=1, max_length=256)
    description: str = ""
    assignee: Optional[str] = Field(default=None, description="GitHub login do responsável")
    points: int = Field(default=0, ge=0, le=100)
    status: Literal["todo", "in_progress", "done"] = "todo"
    origin: Literal["meeting", "manual"] = "manual"
    record_id: Optional[str] = None
    issue_id: Optional[str] = None


class SprintTaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=256)
    description: Optional[str] = None
    assignee: Optional[str] = None
    points: Optional[int] = Field(default=None, ge=0, le=100)
    status: Optional[Literal["todo", "in_progress", "done"]] = None
    origin: Optional[Literal["meeting", "manual"]] = None
    record_id: Optional[str] = None
    issue_id: Optional[str] = None
