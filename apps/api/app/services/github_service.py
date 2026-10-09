from __future__ import annotations

from typing import List, Dict, Any, Optional

from github import Github
from github.AuthenticatedUser import AuthenticatedUser
from github.GithubException import GithubException
from github.Issue import Issue
from github.NamedUser import NamedUser, NamedUserSearchResult
from github.PaginatedList import PaginatedList
from github.Repository import Repository


class GithubService:
    """Translate application operations into authenticated PyGithub calls.

    The service returns JSON-compatible dictionaries so routes do not expose
    PyGithub objects to FastAPI or the persistence layer. GitHub failures are
    converted to ``RuntimeError`` with an actionable message for the caller.
    """

    def __init__(self, access_token: str) -> None:
        """Create a client scoped to a user's OAuth access token."""
        self._gh = Github(login_or_token=access_token)

    def create_issues(
        self,
        repo_full_name: str,
        tasks: List[Dict[str, Any]],
        assignees: List[str],
    ) -> List[Dict[str, Any]]:
        """Create several issues and return their public identifiers."""
        repo: Repository = self._gh.get_repo(repo_full_name)

        created: List[Dict[str, Any]] = []

        for t in tasks:
            title: Any | str = t.get("title") or "Untitled task"
            body: Any | str = t.get("body") or ""

            issue_assignees: Any | None = t.get("assignees")
            if issue_assignees is None:
                issue_assignees: List[str] = assignees

            # assinaturas do GitHub são logins; se vazio, deixa vazio.
            issue: Issue = repo.create_issue(
                title=title,
                body=body,
                assignees=issue_assignees or [],
            )
            created.append(
                {
                    "number": issue.number,
                    "id": issue.id,
                    "html_url": issue.html_url,
                }
            )

        return created

    def create_issue_in_repo(
        self,
        repo_full_name: str,
        title: str,
        body: str = "",
        assignee: Optional[str] = None,
        labels: Optional[List[str]] = None,
        milestone_number: Optional[int] = None,
        project_number: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create one issue, optionally assigning labels or a milestone."""
        # cria uma única issue em um repositório específico com assignee opcional,
        # além de labels, milestone e projeto (adiciona um card no projeto clássico).
        from github import GithubException
        try:
            repo: Repository = self._gh.get_repo(repo_full_name)
            assignees: List[str] = [assignee] if assignee else []

            create_kwargs: Dict[str, Any] = {
                "title": title,
                "body": body,
                "assignees": assignees,
            }
            if labels:
                create_kwargs["labels"] = labels
            if milestone_number is not None:
                create_kwargs["milestone"] = repo.get_milestone(milestone_number)

            issue: Issue = repo.create_issue(**create_kwargs)

            project_name = None
            if project_number is not None:
                try:
                    project_name: str | None = self._add_issue_to_project(
                        repo, project_number, issue.id
                    )
                except Exception:
                    # uma falha ao mover para o projeto não deve derrubar a issue
                    project_name = None

            result = {
                "number": issue.number,
                "id": issue.id,
                "html_url": issue.html_url,
                "repo_full_name": repo_full_name,
            }
            if labels:
                result["labels"] = [label.name for label in (issue.labels or [])]
            if milestone_number is not None:
                result["milestone"] = milestone_number
            if project_name:
                result["project_name"] = project_name
            return result
        except GithubException as e:
            status: int = e.status if hasattr(e, 'status') else 0
            data = e.data if hasattr(e, 'data') else {}
            error_msg = str(e)

            if status == 403:
                # resource not accessible by integration indica que o github app não está instalado na conta ou organização
                if "resource not accessible" in error_msg.lower() or "integration" in error_msg.lower():
                    raise RuntimeError(
                        f"O Anota Aí (GitHub App) não tem permissão para criar issues em '{repo_full_name}'. "
                        f"O app precisa ser instalado na sua conta ou organização. "
                        f"Acesse: https://github.com/apps/anota-ai/installations/new e instale o app "
                        f"na conta/organização que possui o repositório '{repo_full_name.split('/')[0]}'."
                    )
                # escopo ausente
                if "scope" in error_msg.lower() or "insufficient" in error_msg.lower():
                    raise RuntimeError(
                        f"Token sem permissão 'repo'. Faça login novamente para atualizar as permissões."
                    )
            raise RuntimeError(f"Erro do GitHub ao criar issue em '{repo_full_name}': {error_msg}")

    def get_repo(self, repo_full_name: str) -> Dict[str, Any]:
        """Fetch and normalize metadata for a repository."""
        
        repo: Repository = self._gh.get_repo(repo_full_name)
        return {
            "id": repo.id,
            "full_name": repo.full_name,
            "name": repo.name,
            "owner": repo.owner.login,
            "private": repo.private,
            "description": repo.description or "",
            "html_url": repo.html_url,
            "default_branch": repo.default_branch,
        }

    def list_user_repos(self) -> List[Dict[str, Any]]:
        """List repositories visible to the authenticated GitHub user."""
        user: AuthenticatedUser = self._gh.get_user()
        repos: PaginatedList[Repository] = user.get_repos(type="all", sort="updated", direction="desc")
        result = []
        for repo in repos:
            result.append({
                "id": repo.id,
                "full_name": repo.full_name,
                "name": repo.name,
                "owner": repo.owner.login,
                "private": repo.private,
                "description": repo.description or "",
                "html_url": repo.html_url,
                "default_branch": repo.default_branch,
            })
        return result

    def list_repo_issues(
        self, repo_full_name: str, state: str = "all"
    ) -> List[Dict[str, Any]]:
        """List repository issues, excluding pull requests."""
        # lista as issues de um repositório
        # e ignora pull requests, já que são issues para a api do github
        # depois vou fazer para prs também, mas por enquanto só issues

        repo: Repository = self._gh.get_repo(repo_full_name)
        issues: PaginatedList[Issue] = repo.get_issues(state=state)
        result = []
        for issue in issues:
            if getattr(issue, "pull_request", None):
                continue
            result.append({
                "id": issue.id,
                "number": issue.number,
                "title": issue.title,
                "body": issue.body or "",
                "html_url": issue.html_url,
                "state": issue.state,
                "repo_full_name": repo_full_name,
                "assignees": [a.login for a in (issue.assignees or [])],
                "labels": [l.name for l in (issue.labels or [])],
                "created_at": (
                    issue.created_at.isoformat() if issue.created_at else None
                ),
            })
        return result

    def get_repo_meta(self, repo_full_name: str) -> Dict[str, Any]:
        """Return assignees, labels, milestones, and projects for issue forms."""
        repo: Repository = self._gh.get_repo(repo_full_name)

        assignees: List[Dict[str, Any]] = []
        try:
            collaborators: PaginatedList[NamedUser] = repo.get_collaborators(affiliation="all")
            for user in collaborators:
                if user.login not in {item["login"] for item in assignees}:
                    assignees.append(
                        {
                            "login": user.login,
                            "name": getattr(user, "name", None),
                            "avatar_url": getattr(user, "avatar_url", None),
                        }
                    )
        except Exception:
            # sem permissão para listar colaboradores; segue com o dono apenas
            pass

        owner: NamedUser = repo.owner
        if owner is not None and owner.login not in {item["login"] for item in assignees}:
            assignees.insert(
                0,
                {
                    "login": owner.login,
                    "name": getattr(owner, "name", None),
                    "avatar_url": getattr(owner, "avatar_url", None),
                },
            )

        labels: List[Dict[str, Any]] = []
        for label in repo.get_labels():
            labels.append(
                {
                    "name": label.name,
                    "color": getattr(label, "color", None) or "808080",
                    "description": getattr(label, "description", None),
                }
            )

        milestones: List[Dict[str, Any]] = []
        for milestone in repo.get_milestones(state="open"):
            milestones.append(
                {
                    "number": getattr(milestone, "number", None),
                    "title": milestone.title,
                    "state": getattr(milestone, "state", "open"),
                    "description": getattr(milestone, "description", None),
                    "open_issues": getattr(milestone, "open_issues", 0),
                    "closed_issues": getattr(milestone, "closed_issues", 0),
                }
            )

        projects: List[Dict[str, Any]] = []
        try:
            for project in repo.get_projects(state="open"):
                columns: List[str] = []
                try:
                    columns = [
                        getattr(column, "name", "")
                        for column in project.get_columns()
                    ]
                except Exception:
                    columns = []
                projects.append(
                    {
                        "id": getattr(project, "id", None),
                        "number": getattr(project, "number", None),
                        "name": project.name,
                        "state": getattr(project, "state", "open"),
                        "html_url": getattr(project, "html_url", None),
                        "columns": columns,
                    }
                )
        except Exception:
            # projetos podem exigir permissão extra; não bloqueia os demais campos
            pass

        return {
            "assignees": assignees,
            "labels": labels,
            "milestones": milestones,
            "projects": projects,
        }

    def search_users(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        # busca usuários do GitHub por login ou nome (para agregar membros).
        per_page: int = max(1, min(int(limit or 8), 20))
        try:
            matches: PaginatedList[NamedUserSearchResult] = self._gh.search_users(query, per_page=per_page)
        except AttributeError:
            matches = self._gh.get_users(query, per_page=per_page)
        results: List[Dict[str, Any]] = []
        seen: set[str] = set()
        for user in matches:
            login: Any | None = getattr(user, "login", None)
            if not login or login in seen:
                continue
            seen.add(login)
            results.append(
                {
                    "github_login": login,
                    "name": getattr(user, "name", None) or login,
                    "avatar_url": getattr(user, "avatar_url", None),
                }
            )
            if len(results) >= limit:
                break
        return results

    def _add_issue_to_project(
        self,
        repo,
        project_number: int,
        content_id: int,
    ) -> Optional[str]:
        # adiciona a issue recém-criada como card em um projeto clássico do
        # repositório, na coluna padrão de "a fazer" quando existir.
        project = None
        for candidate in repo.get_projects(state="open"):
            if getattr(candidate, "number", None) == project_number:
                project = candidate
                break

        if project is None:
            return None

        columns = list(project.get_columns())
        if not columns:
            return None

        column = self._pick_default_column(columns)
        column.create_card(content_id=content_id, content_type="Issue")
        return project.name

    def _pick_default_column(self, columns):
        # dá preferência para colunas típicas de backlog/inbox dos projetos.
        for expected in ("a fazer", "to do", "backlog", "open", "novo", "no status"):
            for column in columns:
                name: str | Any = (getattr(column, "name", "") or "").strip().lower()
                if name == expected:
                    return column
        return columns[0]
