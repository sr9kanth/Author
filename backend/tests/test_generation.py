"""Smoke tests for generation job creation.

Verifies a job can be created (status pending) and dispatched without error.
The Celery task is enqueued via Redis (available in CI); no worker is needed
for the create path to return 201.
"""

import pytest
from httpx import AsyncClient


async def _auth_headers(client: AsyncClient, email: str) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "full_name": "Gen Tester",
            "role": "author",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SecurePass123!"},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_create_generation_job(client: AsyncClient) -> None:
    headers = await _auth_headers(client, "gen@example.com")

    created = await client.post(
        "/api/v1/generation/jobs",
        json={"knowledge_asset_ids": [], "prompt_version": "1.0"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    job = created.json()
    assert job["status"] == "pending"
    # Defaults applied from settings when not supplied.
    assert job["ai_provider"]
    assert job["ai_model"]
    job_id = job["id"]

    fetched = await client.get(f"/api/v1/generation/jobs/{job_id}", headers=headers)
    assert fetched.status_code == 200

    listed = await client.get("/api/v1/generation/jobs", headers=headers)
    assert listed.status_code == 200
    assert any(j["id"] == job_id for j in listed.json()["items"])


@pytest.mark.asyncio
async def test_create_job_requires_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/generation/jobs",
        json={"knowledge_asset_ids": []},
    )
    assert response.status_code in (401, 403)
