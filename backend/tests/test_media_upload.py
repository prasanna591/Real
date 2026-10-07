from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import get_settings


def test_upload_media_creates_asset(client: TestClient, project, auth_headers):
    resp = client.post(
        f"/api/v1/projects/{project.id}/media/upload",
        headers=auth_headers,
        data={"media_type": "photo", "title": "Tower facade"},
        files={"file": ("facade.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["project_id"] == project.id
    assert body["media_type"] == "photo"
    assert body["title"] == "Tower facade"
    assert body["url"].startswith("/media/project-media/")

    # the file must exist on disk under the media dir
    relative = body["url"].removeprefix("/media/")
    assert (get_settings().media_dir / relative).exists()


def test_upload_media_rejects_invalid_type(client: TestClient, project, auth_headers):
    resp = client.post(
        f"/api/v1/projects/{project.id}/media/upload",
        headers=auth_headers,
        data={"media_type": "bogus"},
        files={"file": ("x.glb", b"\x00\x01", "model/gltf-binary")},
    )
    assert resp.status_code == 400


def test_upload_media_unknown_project(client: TestClient, auth_headers):
    resp = client.post(
        "/api/v1/projects/9999/media/upload",
        headers=auth_headers,
        data={"media_type": "photo"},
        files={"file": ("a.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")},
    )
    assert resp.status_code == 404


def test_upload_media_requires_auth(client: TestClient, project):
    resp = client.post(
        f"/api/v1/projects/{project.id}/media/upload",
        data={"media_type": "photo"},
        files={"file": ("a.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")},
    )
    assert resp.status_code == 401


def test_upload_media_rejects_mismatched_extension(client: TestClient, project, auth_headers):
    # A jpeg uploaded with an .html name must be rejected so served files can't
    # be sniffed as executable content.
    resp = client.post(
        f"/api/v1/projects/{project.id}/media/upload",
        headers=auth_headers,
        data={"media_type": "photo"},
        files={"file": ("evil.html", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")},
    )
    assert resp.status_code == 400


def test_media_responses_have_nosniff_header(client: TestClient, project, auth_headers):
    resp = client.post(
        f"/api/v1/projects/{project.id}/media/upload",
        headers=auth_headers,
        data={"media_type": "photo"},
        files={"file": ("facade.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    url = resp.json()["url"]
    fetch = client.get(url)
    assert fetch.status_code == 200
    assert fetch.headers.get("x-content-type-options") == "nosniff"
