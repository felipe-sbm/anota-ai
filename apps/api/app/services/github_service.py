from __future__ import annotations

from typing import List, Dict, Any, Optional

from github import Github


class GithubService:
    def __init__(self, access_token: str):
        self._gh = Github(login_or_token=access_token)

    def create_issues(
        self,
        repo_full_name: str,
        tasks: List[Dict[str, Any]],
        assignees: List[str],
    ) -> List[Dict[str, Any]]:
        repo = self._gh.get_repo(repo_full_name)

        created: List[Dict[str, Any]] = []

        for t in tasks:
            title = t.get("title") or "Untitled task"
            body = t.get("body") or ""

            issue_assignees = t.get("assignees")
            if issue_assignees is None:
                issue_assignees = assignees

            # assinaturas do GitHub são logins; se vazio, deixa vazio.
            issue = repo.create_issue(
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
    ) -> Dict[str, Any]:
        # cria uma única issue em um repositório específico com assignee opcional.
        from github import GithubException
        try:
            repo = self._gh.get_repo(repo_full_name)
            assignees = [assignee] if assignee else []
            issue = repo.create_issue(
                title=title,
                body=body,
                assignees=assignees,
            )
            return {
                "number": issue.number,
                "id": issue.id,
                "html_url": issue.html_url,
                "repo_full_name": repo_full_name,
            }
        except GithubException as e:
            status = e.status if hasattr(e, 'status') else 0
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
        # busca um repositório específico e normaliza no mesmo formato de list_user_repos
        
        repo = self._gh.get_repo(repo_full_name)
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
        # lista os repositórios que o usuário autenticado tem acesso.
        user = self._gh.get_user()
        repos = user.get_repos(type="all", sort="updated", direction="desc")
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
        # lista as issues de um repositório
        # e ignora pull requests, já que são issues para a api do github
        # depois vou fazer para prs também, mas por enquanto só issues

        repo = self._gh.get_repo(repo_full_name)
        issues = repo.get_issues(state=state)
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