import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_workflow(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/workflows",
        headers=auth_headers,
        json={
            "name": "Test Workflow",
            "description": "A test workflow",
            "data": {"nodes": [], "edges": []},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Workflow"
    assert data["version"] == 1


@pytest.mark.asyncio
async def test_list_workflows(client: AsyncClient, auth_headers):
    # Create a workflow first
    await client.post(
        "/api/workflows",
        headers=auth_headers,
        json={"name": "Workflow 1", "data": {}},
    )

    response = await client.get("/api/workflows", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_update_workflow(client: AsyncClient, auth_headers):
    # Create a workflow first
    create_response = await client.post(
        "/api/workflows",
        headers=auth_headers,
        json={"name": "Original", "data": {}},
    )
    workflow_id = create_response.json()["id"]

    response = await client.patch(
        f"/api/workflows/{workflow_id}",
        headers=auth_headers,
        json={"name": "Updated"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"
    assert response.json()["version"] == 2  # Version should increment


@pytest.mark.asyncio
async def test_delete_workflow(client: AsyncClient, auth_headers):
    # Create a workflow first
    create_response = await client.post(
        "/api/workflows",
        headers=auth_headers,
        json={"name": "To Delete", "data": {}},
    )
    workflow_id = create_response.json()["id"]

    response = await client.delete(f"/api/workflows/{workflow_id}", headers=auth_headers)
    assert response.status_code == 200

    # Verify it's deleted
    get_response = await client.get(f"/api/workflows/{workflow_id}", headers=auth_headers)
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_save_and_list_versions(client: AsyncClient, auth_headers):
    # Create a workflow
    create_response = await client.post(
        "/api/workflows",
        headers=auth_headers,
        json={"name": "Versioned Workflow", "data": {"key": "value1"}},
    )
    workflow_id = create_response.json()["id"]

    # Save a version
    await client.post(
        f"/api/workflows/{workflow_id}/versions",
        headers=auth_headers,
        json={"description": "First save"},
    )

    # Update workflow
    await client.patch(
        f"/api/workflows/{workflow_id}",
        headers=auth_headers,
        json={"data": {"key": "value2"}},
    )

    # List versions
    response = await client.get(f"/api/workflows/{workflow_id}/versions", headers=auth_headers)
    assert response.status_code == 200
    versions = response.json()
    assert len(versions) >= 1