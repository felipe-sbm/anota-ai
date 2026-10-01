from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from ..models.database import (
    _clamp_points,
    build_burndown,
    create_sprint,
    create_sprint_task,
    delete_user_sprint,
    delete_user_sprint_task,
    get_user_sprint,
    get_user_sprint_task,
    list_sprint_tasks,
    list_user_sprints,
    update_sprint_fields,
    update_sprint_task_fields,
)
from ..models.schemas import (
    SprintCreateRequest,
    SprintTaskCreateRequest,
    SprintTaskUpdateRequest,
    SprintUpdateRequest,
)
from .issues import require_auth

app_router = APIRouter(prefix="/api", tags=["sprints"])


def _summarize_sprint(sprint: dict, tasks: list[dict]) -> dict:
    # completa a sprint com as métricas exibidas na página (pontos e contagem).
    task_count = len(tasks)
    done_count = sum(1 for t in tasks if t.get("status") == "done")
    total_points = sum(_clamp_points(t.get("points")) for t in tasks)
    done_points = sum(
        _clamp_points(t.get("points")) for t in tasks if t.get("status") == "done"
    )
    linked_issues = sum(1 for t in tasks if t.get("issue_id"))
    return {
        **sprint,
        "task_count": task_count,
        "done_task_count": done_count,
        "total_points": total_points,
        "done_points": done_points,
        "linked_issues": linked_issues,
    }


@app_router.get("/sprints", status_code=200)
async def list_sprints(auth=Depends(require_auth)):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    sprints = list_user_sprints(github_login)
    return {
        "sprints": [
            _summarize_sprint(sprint, list_sprint_tasks(sprint["id"], github_login))
            for sprint in sprints
        ]
    }


@app_router.post("/sprints", status_code=201)
async def create_sprint_endpoint(
    req: SprintCreateRequest,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    if req.start_date > req.end_date:
        raise HTTPException(
            status_code=400, detail="A data de início não pode ser depois da data final."
        )

    sprint = create_sprint(
        sprint_id=str(uuid.uuid4()),
        github_login=github_login,
        name=req.name.strip(),
        goal=req.goal,
        start_date=req.start_date,
        end_date=req.end_date,
        status=req.status,
    )
    return {"sprint": _summarize_sprint(sprint, [])}


@app_router.get("/projetos/{sprint_id}", status_code=200)
async def get_sprint(sprint_id: str, auth=Depends(require_auth)):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    sprint = get_user_sprint(sprint_id, github_login)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint não encontrada.")

    tasks = list_sprint_tasks(sprint_id, github_login)
    summarized = _summarize_sprint(sprint, tasks)
    return {
        "sprint": {
            **summarized,
            "tasks": tasks,
            "burndown": build_burndown(sprint, tasks),
        }
    }


@app_router.patch("/projetos/{sprint_id}", status_code=200)
async def update_sprint(
    sprint_id: str,
    req: SprintUpdateRequest,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    if get_user_sprint(sprint_id, github_login) is None:
        raise HTTPException(status_code=404, detail="Sprint não encontrada.")

    payload = req.model_dump(exclude_none=True)
    if (
        "start_date" in payload
        and "end_date" in payload
        and payload["start_date"] > payload["end_date"]
    ):
        raise HTTPException(
            status_code=400, detail="A data de início não pode ser depois da data final."
        )

    updated = update_sprint_fields(sprint_id, github_login, **payload)
    tasks = list_sprint_tasks(sprint_id, github_login)
    return {"sprint": _summarize_sprint(updated or {}, tasks)}


@app_router.delete("/projetos/{sprint_id}", status_code=200)
async def delete_sprint(sprint_id: str, auth=Depends(require_auth)):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    removed = delete_user_sprint(sprint_id, github_login)
    if not removed:
        raise HTTPException(status_code=404, detail="Sprint não encontrada.")
    return {"ok": True}


@app_router.post("/projetos/{sprint_id}/tasks", status_code=201)
async def create_sprint_task_endpoint(
    sprint_id: str,
    req: SprintTaskCreateRequest,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    task = create_sprint_task(
        task_id=str(uuid.uuid4()),
        sprint_id=sprint_id,
        github_login=github_login,
        title=req.title.strip(),
        description=req.description,
        assignee=req.assignee,
        points=req.points,
        status=req.status,
        origin=req.origin,
        record_id=req.record_id,
        issue_id=req.issue_id,
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Sprint não encontrada.")
    return {"task": task}


@app_router.patch("/projetos/tasks/{task_id}", status_code=200)
async def update_sprint_task(
    task_id: str,
    req: SprintTaskUpdateRequest,
    auth=Depends(require_auth),
):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    if get_user_sprint_task(task_id, github_login) is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")

    updated = update_sprint_task_fields(
        task_id, github_login, **req.model_dump(exclude_none=True)
    )
    return {"task": updated}


@app_router.delete("/projetos/tasks/{task_id}", status_code=200)
async def delete_sprint_task(task_id: str, auth=Depends(require_auth)):
    github_login = auth.get("github_login")
    if not github_login:
        raise HTTPException(status_code=401, detail="github_login faltando no JWT")

    removed = delete_user_sprint_task(task_id, github_login)
    if not removed:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return {"ok": True}