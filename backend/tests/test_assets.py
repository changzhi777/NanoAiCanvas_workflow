import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_asset(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/assets",
        headers=auth_headers,
        json={
            "type": "image",
            "name": "Test Image",
            "url": "https://example.com/image.png",
            "metadata": {"prompt": "a beautiful sunset"},
            "category": "general",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Image"
    assert data["type"] == "image"
    assert data["url"] == "https://example.com/image.png"


@pytest.mark.asyncio
async def test_list_assets(client: AsyncClient, auth_headers):
    # Create an asset first
    await client.post(
        "/api/assets",
        headers=auth_headers,
        json={
            "type": "image",
            "name": "Test Image",
            "url": "https://example.com/image.png",
        },
    )

    response = await client.get("/api/assets", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_asset(client: AsyncClient, auth_headers):
    # Create an asset first
    create_response = await client.post(
        "/api/assets",
        headers=auth_headers,
        json={
            "type": "video",
            "name": "Test Video",
            "url": "https://example.com/video.mp4",
        },
    )
    asset_id = create_response.json()["id"]

    response = await client.get(f"/api/assets/{asset_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Video"
    assert data["type"] == "video"


@pytest.mark.asyncio
async def test_update_asset(client: AsyncClient, auth_headers):
    # Create an asset first
    create_response = await client.post(
        "/api/assets",
        headers=auth_headers,
        json={
            "type": "image",
            "name": "Original Name",
            "url": "https://example.com/image.png",
        },
    )
    asset_id = create_response.json()["id"]

    response = await client.patch(
        f"/api/assets/{asset_id}",
        headers=auth_headers,
        json={"name": "Updated Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_toggle_star(client: AsyncClient, auth_headers):
    # Create an asset first
    create_response = await client.post(
        "/api/assets",
        headers=auth_headers,
        json={
            "type": "image",
            "name": "Star Test",
            "url": "https://example.com/image.png",
        },
    )
    asset_id = create_response.json()["id"]

    # Toggle star on
    response = await client.post(f"/api/assets/{asset_id}/star", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["is_starred"] == True

    # Toggle star off
    response = await client.post(f"/api/assets/{asset_id}/star", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["is_starred"] == False


@pytest.mark.asyncio
async def test_delete_asset(client: AsyncClient, auth_headers):
    # Create an asset first
    create_response = await client.post(
        "/api/assets",
        headers=auth_headers,
        json={
            "type": "image",
            "name": "To Delete",
            "url": "https://example.com/image.png",
        },
    )
    asset_id = create_response.json()["id"]

    response = await client.delete(f"/api/assets/{asset_id}", headers=auth_headers)
    assert response.status_code == 200

    # Verify it's deleted (should return 404)
    get_response = await client.get(f"/api/assets/{asset_id}", headers=auth_headers)
    assert get_response.status_code == 404