import pytest


class TestBuilderProjects:
    def test_list_builder_projects(self, client, auth_headers, project):
        resp = client.get("/api/v1/builder/projects", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert "unit_count" in data[0]

    def test_list_builder_projects_unauthenticated(self, client):
        resp = client.get("/api/v1/builder/projects")
        assert resp.status_code == 401


class TestBuilderAnalytics:
    def test_portfolio_analytics(self, client, auth_headers, project):
        resp = client.get("/api/v1/builder/analytics", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "property_views" in data
        assert "enquiries" in data


class TestBuilderPipeline:
    def test_project_pipeline(self, client, auth_headers, project):
        resp = client.get(f"/api/v1/builder/projects/{project.id}/pipeline", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "enquiries" in data
        assert "site_visits" in data

    def test_project_pipeline_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/builder/projects/9999/pipeline", headers=auth_headers)
        assert resp.status_code == 404
