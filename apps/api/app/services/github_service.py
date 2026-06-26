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

