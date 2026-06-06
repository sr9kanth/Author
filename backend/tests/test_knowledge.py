"""Smoke tests for knowledge asset CRUD (excludes S3 upload, which needs MinIO).

Guards the create/list/get/delete contract and the empty-string collection
route (no 307 redirect that broke CORS preflight).
"""

import pytest
from httpx import AsyncClient


async def _auth_headers(client: AsyncClient, email: str) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "full_name": "KB Tester",
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
async def test_create_list_get_delete_asset(client: AsyncClient) -> None:
    headers = await _auth_headers(client, "kb@example.com")

    created = await client.post(
        "/api/v1/knowledge",
        json={"title": "NCC 2022", "description": "Building code", "content_type": "pdf"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    asset = created.json()
    assert asset["title"] == "NCC 2022"
    assert asset["content_type"] == "pdf"
    assert asset["status"] == "uploaded"
    asset_id = asset["id"]

    listed = await client.get("/api/v1/knowledge", headers=headers)
    assert listed.status_code == 200
    assert any(a["id"] == asset_id for a in listed.json()["items"])

    fetched = await client.get(f"/api/v1/knowledge/{asset_id}", headers=headers)
    assert fetched.status_code == 200

    deleted = await client.delete(f"/api/v1/knowledge/{asset_id}", headers=headers)
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/knowledge/{asset_id}", headers=headers)
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_create_asset_requires_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/knowledge",
        json={"title": "x", "content_type": "pdf"},
    )
    assert response.status_code in (401, 403)
