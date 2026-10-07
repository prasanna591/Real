import pytest


class TestAuthRegister:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "New Builder",
            "email": "new@test.com",
            "password": "securepass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@test.com"
        assert data["name"] == "New Builder"
        assert "id" in data

    def test_register_duplicate_email(self, client, builder):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Duplicate",
            "email": "builder@test.com",
            "password": "securepass123",
        })
        assert resp.status_code == 409

    def test_register_invalid_email(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Bad Email",
            "email": "not-an-email",
            "password": "securepass123",
        })
        assert resp.status_code == 422

    def test_register_short_password(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "Short Pass",
            "email": "short@test.com",
            "password": "123",
        })
        assert resp.status_code == 422


class TestAuthLogin:
    def test_login_success(self, client, builder):
        resp = client.post("/api/v1/auth/login", json={
            "email": "builder@test.com",
            "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, builder):
        resp = client.post("/api/v1/auth/login", json={
            "email": "builder@test.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "anypassword",
        })
        assert resp.status_code == 401


class TestAuthMe:
    def test_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "builder@test.com"

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401
        assert resp.headers.get("www-authenticate") == "Bearer"

    def test_me_invalid_token(self, client):
        resp = client.get("/api/v1/auth/me", headers={
            "Authorization": "Bearer invalid.token.here"
        })
        assert resp.status_code == 401
