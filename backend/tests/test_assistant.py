import pytest


class TestAssistantChat:
    def test_chat_greeting(self, client, project):
        resp = client.post("/api/v1/assistant/chat", json={
            "messages": [{"role": "user", "content": "hello"}],
            "project_id": project.id,
            "session_id": "test-session",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert data["engine"] in ("llm", "grounded")

    def test_chat_budget_query(self, client, project):
        resp = client.post("/api/v1/assistant/chat", json={
            "messages": [{"role": "user", "content": "Show me apartments under 1.5 crore"}],
            "project_id": project.id,
        })
        assert resp.status_code == 200

    def test_chat_empty_messages(self, client):
        resp = client.post("/api/v1/assistant/chat", json={
            "messages": [],
        })
        assert resp.status_code == 422

    def test_chat_no_user_message(self, client):
        resp = client.post("/api/v1/assistant/chat", json={
            "messages": [{"role": "assistant", "content": "Hi"}],
        })
        assert resp.status_code == 422

    def test_chat_nonexistent_project(self, client):
        resp = client.post("/api/v1/assistant/chat", json={
            "messages": [{"role": "user", "content": "hello"}],
            "project_id": 9999,
        })
        assert resp.status_code == 404


class TestAssistantStatus:
    def test_status(self, client):
        resp = client.get("/api/v1/assistant/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "llm_enabled" in data


class TestFallbackEngine:
    def test_greeting_response(self):
        from app.ai.fallback import answer
        from sqlalchemy.orm import Session

        class FakeSession:
            pass

        result = answer(FakeSession(), "hello")
        assert "property assistant" in result.lower() or "assistant" in result.lower()

    def test_emi_calculation(self):
        from app.ai.grounding import calculate_emi
        result = calculate_emi(10000000, 8.5, 20)
        assert result["monthly_emi"] > 0
        assert result["total_payable"] > result["principal"]

    def test_format_inr(self):
        from app.ai.grounding import format_inr
        assert format_inr(15000000) == "₹1.5 Cr"
        assert format_inr(500000) == "₹5 L"
