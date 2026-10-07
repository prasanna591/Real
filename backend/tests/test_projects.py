import pytest


class TestProjectCreate:
    def test_create_project(self, client, auth_headers):
        resp = client.post("/api/v1/projects", json={
            "name": "New Project",
            "slug": "new-project",
            "city": "Delhi",
            "property_type": "villa",
            "status": "draft",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["slug"] == "new-project"
        assert data["city"] == "Delhi"

    def test_create_project_duplicate_slug(self, client, auth_headers, project):
        resp = client.post("/api/v1/projects", json={
            "name": "Another",
            "slug": "test-project",
            "city": "Mumbai",
        }, headers=auth_headers)
        assert resp.status_code == 409

    def test_create_project_unauthenticated(self, client):
        resp = client.post("/api/v1/projects", json={
            "name": "No Auth",
            "slug": "no-auth",
            "city": "Mumbai",
        })
        assert resp.status_code == 401


class TestProjectRead:
    def test_list_projects(self, client, project):
        resp = client.get("/api/v1/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_list_projects_filter_city(self, client, project):
        resp = client.get("/api/v1/projects?city=Mumbai")
        assert resp.status_code == 200
        data = resp.json()
        assert all(p["city"] == "Mumbai" for p in data)

    def test_list_projects_filter_type(self, client, project):
        resp = client.get("/api/v1/projects?property_type=luxury_apartment")
        assert resp.status_code == 200

    def test_get_project(self, client, project):
        resp = client.get(f"/api/v1/projects/{project.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["slug"] == "test-project"

    def test_get_project_not_found(self, client):
        resp = client.get("/api/v1/projects/9999")
        assert resp.status_code == 404


class TestProjectUpdate:
    def test_update_project(self, client, auth_headers, project):
        resp = client.patch(f"/api/v1/projects/{project.id}", json={
            "name": "Updated Name",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated Name"

    def test_update_project_unauthenticated(self, client, project):
        resp = client.patch(f"/api/v1/projects/{project.id}", json={
            "name": "Hacked",
        })
        assert resp.status_code == 401


class TestProjectDelete:
    def test_delete_project(self, client, auth_headers, project):
        resp = client.delete(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert resp.status_code == 204

    def test_delete_project_not_found(self, client, auth_headers):
        resp = client.delete("/api/v1/projects/9999", headers=auth_headers)
        assert resp.status_code == 404


class TestProjectOwnership:
    """A builder must not be able to write to another builder's project."""

    def test_update_other_builders_project_forbidden(self, client, auth_headers, other_auth_headers, project):
        resp = client.patch(f"/api/v1/projects/{project.id}", json={
            "name": "Hijacked",
        }, headers=other_auth_headers)
        assert resp.status_code == 404

    def test_delete_other_builders_project_forbidden(self, client, other_auth_headers, project):
        resp = client.delete(f"/api/v1/projects/{project.id}", headers=other_auth_headers)
        assert resp.status_code == 404

    def test_create_tower_other_builders_project_forbidden(self, client, other_auth_headers, project):
        resp = client.post(f"/api/v1/projects/{project.id}/towers", json={
            "name": "Sneaky Tower",
        }, headers=other_auth_headers)
        assert resp.status_code == 404

    def test_create_unit_other_builders_project_forbidden(self, client, other_auth_headers, project):
        resp = client.post(
            f"/api/v1/projects/{project.id}/towers/999/floors/999/units",
            json={"unit_number": "X1", "bhk": 2, "area_sqft": 1000, "price": 5000000},
            headers=other_auth_headers,
        )
        assert resp.status_code == 404

    def test_upload_media_other_builders_project_forbidden(self, client, other_auth_headers, project):
        resp = client.post(
            f"/api/v1/projects/{project.id}/media/upload",
            headers=other_auth_headers,
            data={"media_type": "photo"},
            files={"file": ("a.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")},
        )
        assert resp.status_code == 404

    def test_owner_can_still_update_after_cross_builder_attempt(self, client, auth_headers, project):
        resp = client.patch(f"/api/v1/projects/{project.id}", json={"name": "Still Mine"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Still Mine"
