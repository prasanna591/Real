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
