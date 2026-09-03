from fastapi.testclient import TestClient


def test_upload_room_scan_creates_scan(client: TestClient, project):
    files = [
        ("photos", ("frame_0.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")),
        ("photos", ("frame_1.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg")),
    ]
    data = {
        "project_id": str(project.id),
        "client_scan_id": "scan_test_1",
        "name": "Living Room",
        "keyframe_count": "2",
        "coverage_percent": "88.0",
        "duration_ms": "42000",
    }
    resp = client.post("/api/v1/room-scans", data=data, files=files)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["client_scan_id"] == "scan_test_1"
    assert body["project_id"] == project.id
    assert body["keyframe_count"] == 2
    assert len(body["photo_urls"]) == 2
    assert all(url.startswith("/media/room-scans/") for url in body["photo_urls"])


def test_upload_room_scan_is_idempotent(client: TestClient, project):
    files = [("photos", ("f.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg"))]
    data = {
        "project_id": str(project.id),
        "client_scan_id": "scan_idem",
    }
    first = client.post("/api/v1/room-scans", data=data, files=files)
    second = client.post("/api/v1/room-scans", data=data, files=files)
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_upload_room_scan_unknown_project(client: TestClient):
    files = [("photos", ("f.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg"))]
    data = {"project_id": "9999", "client_scan_id": "scan_unknown"}
    resp = client.post("/api/v1/room-scans", data=data, files=files)
    assert resp.status_code == 404


def test_list_room_scans_by_project(client: TestClient, project):
    client.post(
        "/api/v1/room-scans",
        data={
            "project_id": str(project.id),
            "client_scan_id": "scan_list_1",
            "name": "Kitchen",
        },
        files=[("photos", ("f.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg"))],
    )
    resp = client.get(f"/api/v1/room-scans?project_id={project.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "Kitchen"
