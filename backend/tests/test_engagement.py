import pytest


class TestUsers:
    def test_create_user(self, client):
        resp = client.post("/api/v1/users", json={
            "name": "Test User",
            "phone": "+919876543210",
            "email": "user@test.com",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["phone"] == "+919876543210"

    def test_create_user_idempotent(self, client):
        payload = {"name": "Same User", "phone": "+919876543211", "email": ""}
        resp1 = client.post("/api/v1/users", json=payload)
        resp2 = client.post("/api/v1/users", json=payload)
        assert resp1.json()["id"] == resp2.json()["id"]

    def test_create_user_invalid_phone(self, client):
        resp = client.post("/api/v1/users", json={
            "name": "Bad Phone",
            "phone": "abc",
        })
        assert resp.status_code == 422


class TestSavedItems:
    def test_save_project(self, client, project):
        user_resp = client.post("/api/v1/users", json={
            "name": "Saver", "phone": "+919876543212",
        })
        user_id = user_resp.json()["id"]

        resp = client.post("/api/v1/saved", json={
            "user_id": user_id,
            "project_id": project.id,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["project_id"] == project.id

    def test_list_saved(self, client, project):
        user_resp = client.post("/api/v1/users", json={
            "name": "Lister", "phone": "+919876543213",
        })
        user_id = user_resp.json()["id"]
        client.post("/api/v1/saved", json={"user_id": user_id, "project_id": project.id})

        resp = client.get(f"/api/v1/users/{user_id}/saved")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_unsave_item(self, client, project):
        user_resp = client.post("/api/v1/users", json={
            "name": "Unsaver", "phone": "+919876543214",
        })
        user_id = user_resp.json()["id"]
        saved = client.post("/api/v1/saved", json={"user_id": user_id, "project_id": project.id})
        item_id = saved.json()["id"]

        resp = client.delete(f"/api/v1/saved/{item_id}")
        assert resp.status_code == 204


class TestEnquiries:
    def test_create_enquiry(self, client, project):
        resp = client.post("/api/v1/enquiries", json={
            "project_id": project.id,
            "name": "Interested Buyer",
            "phone": "+919876543215",
            "message": "Tell me more",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "new"

    def test_list_enquiries(self, client, project, auth_headers):
        client.post("/api/v1/enquiries", json={
            "project_id": project.id,
            "name": "Buyer 1",
            "phone": "+919876543216",
        })
        resp = client.get("/api/v1/enquiries", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_update_enquiry_status(self, client, project, auth_headers):
        enquiry = client.post("/api/v1/enquiries", json={
            "project_id": project.id,
            "name": "Status Test",
            "phone": "+919876543217",
        }).json()

        resp = client.patch(f"/api/v1/enquiries/{enquiry['id']}", json={
            "status": "contacted",
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "contacted"

    def test_my_enquiries_by_phone(self, client, project):
        client.post("/api/v1/enquiries", json={
            "project_id": project.id,
            "name": "My Buyer",
            "phone": "+919876543220",
        })
        resp = client.get("/api/v1/enquiries/me", params={"phone": "+919876543220"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["project_id"] == project.id
        assert data[0]["project_name"] == project.name
        assert data[0]["status"] == "new"

    def test_my_enquiries_unknown_phone_empty(self, client):
        resp = client.get("/api/v1/enquiries/me", params={"phone": "+919999999999"})
        assert resp.status_code == 200
        assert resp.json() == []


class TestSiteVisits:
    def test_create_site_visit(self, client, project):
        resp = client.post("/api/v1/site-visits", json={
            "project_id": project.id,
            "visitor_name": "Visitor",
            "visitor_phone": "+919876543218",
            "scheduled_at": "2026-01-15T10:00:00",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "scheduled"

    def test_list_site_visits(self, client, project, auth_headers):
        client.post("/api/v1/site-visits", json={
            "project_id": project.id,
            "visitor_name": "Visitor 2",
            "visitor_phone": "+919876543219",
            "scheduled_at": "2026-01-16T10:00:00",
        })
        resp = client.get("/api/v1/site-visits", headers=auth_headers)
        assert resp.status_code == 200


class TestAnalytics:
    def test_track_event(self, client, project):
        resp = client.post("/api/v1/analytics/events", json={
            "event_type": "view",
            "project_id": project.id,
            "session_id": "test-session-123",
        })
        assert resp.status_code == 202

    def test_analytics_summary(self, client, project, auth_headers):
        client.post("/api/v1/analytics/events", json={
            "event_type": "view",
            "project_id": project.id,
            "session_id": "s1",
        })
        resp = client.get(f"/api/v1/projects/{project.id}/analytics/summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["property_views"] >= 1
