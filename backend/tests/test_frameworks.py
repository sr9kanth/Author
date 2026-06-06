"""Smoke tests for framework CRUD.

Guards against the async lazy-load regression where create_framework returned
500 because FrameworkRead.model_validate read the unloaded `domains`
relationship outside the async greenlet context.
"""

import pytest
from httpx import AsyncClient


async def _auth_headers(client: AsyncClient, email: str) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "full_name": "FW Tester",
            "role": "administrator",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "SecurePass123!"},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_create_framework(client: AsyncClient) -> None:
    headers = await _auth_headers(client, "fw_create@example.com")
    response = await client.post(
        "/api/v1/frameworks",
        json={"name": "Building", "description": "NCC", "version": "1.0", "domain": "Building"},
        headers=headers,
    )
    # The lazy-load bug surfaced here as a 500 — assert a clean 201.
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "Building"
    assert data["domain"] == "Building"
    # Enriched fields must be present and serialize without lazy-loading.
    assert data["outcomes_count"] == 0
    assert data["items_count"] == 0
    assert data["domains"] == []


@pytest.mark.asyncio
async def test_list_and_get_framework(client: AsyncClient) -> None:
    headers = await _auth_headers(client, "fw_list@example.com")
    created = await client.post(
        "/api/v1/frameworks",
        json={"name": "Plumbing", "version": "2.0"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    fw_id = created.json()["id"]

    listed = await client.get("/api/v1/frameworks", headers=headers)
    assert listed.status_code == 200
    assert any(f["id"] == fw_id for f in listed.json()["items"])

    fetched = await client.get(f"/api/v1/frameworks/{fw_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Plumbing"


@pytest.mark.asyncio
async def test_create_framework_requires_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/frameworks",
        json={"name": "Unauthorized", "version": "1.0"},
    )
    assert response.status_code in (401, 403)
