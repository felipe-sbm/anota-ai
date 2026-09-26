from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class ProcessAudioRequest(BaseModel):
    # repo alvo no formato org/repo (opcional, se não informado só transcreve e sumariza)
    repo_full_name: Optional[str] = Field(default=None, description="GitHub repo full name, ex: org/repo")

    # logins do github
    assignees: List[str] = Field(default_factory=list)

    # se a extensão enviar file_id
    file_id: Optional[str] = Field(default=None)


class TaskSpec(BaseModel):
    title: str
    body: str = ""
    assignees: List[str] = Field(default_factory=list)


class DecisionSpec(BaseModel):
    title: str
    context: str = ""


class ProcessAudioResponse(BaseModel):
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
    # cria uma issue instantânea dentro do próprio sistema
    
    repo_full_name: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=256)
    body: str = ""
    assignee: Optional[str] = Field(default=None, description="GitHub login do responsável")
    points: int = Field(default=0, ge=0, le=100, description="Pontos/importancia no sistema")
    priority: Literal["low", "medium", "high"] = "medium"


class IssueUpdateRequest(BaseModel):
    # atualiza campos e detalhes internos de uma tarefa (pontos, prioridade etc.)
    
    title: Optional[str] = Field(default=None, min_length=1, max_length=256)
    body: Optional[str] = None
    repo_full_name: Optional[str] = None
    assignee: Optional[str] = None
    points: Optional[int] = Field(default=None, ge=0, le=100)
    priority: Optional[Literal["low", "medium", "high"]] = None


class ConfirmIssuesRequest(BaseModel):
    # confirma rascunhos e os envia ao GitHub como issues reais
    
    issue_ids: List[str] = Field(min_length=1, max_length=100)
