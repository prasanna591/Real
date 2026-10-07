"""Phase 2 — social feed: follow/unfollow, suggestions, follower counts, feed."""
from app.models import CustomerBuilderFollow
from sqlalchemy import select


def _make_user(client, phone="+919876543230", name="Feed Buyer"):
    return client.post("/api/v1/users", json={"name": name, "phone": phone}).json()["id"]


class TestFollow:
    def test_follow_creates_row(self, client, builder):
        user_id = _make_user(client)
        resp = client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        assert resp.status_code == 201
        assert resp.json()["user_id"] == user_id
        assert resp.json()["builder_id"] == builder.id

    def test_follow_is_idempotent(self, client, builder):
        user_id = _make_user(client)
        first = client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        second = client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        assert second.status_code == 201
        assert second.json()["id"] == first.json()["id"]

    def test_follow_unknown_user_404(self, client, builder):
        resp = client.post("/api/v1/social/follows", json={"user_id": 99999, "builder_id": builder.id})
        assert resp.status_code == 404

    def test_follow_unknown_builder_404(self, client):
        user_id = _make_user(client)
        resp = client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": 99999})
        assert resp.status_code == 404

    def test_unfollow_removes_row(self, client, builder):
        user_id = _make_user(client)
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        resp = client.delete(f"/api/v1/social/follows?user_id={user_id}&builder_id={builder.id}")
        assert resp.status_code == 204
        assert client.get(f"/api/v1/social/users/{user_id}/following").json() == []

    def test_unfollow_when_not_following_404(self, client, builder):
        user_id = _make_user(client)
        resp = client.delete(f"/api/v1/social/follows?user_id={user_id}&builder_id={builder.id}")
        assert resp.status_code == 404


class TestFollowing:
    def test_following_lists_builders_with_counts(self, client, builder, project, other_builder, db_session):
        user_id = _make_user(client)
        # Another user follows the fixture builder too, so follower_count is 2.
        other_user = _make_user(client, "+919876543231")
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        client.post("/api/v1/social/follows", json={"user_id": other_user, "builder_id": builder.id})

        following = client.get(f"/api/v1/social/users/{user_id}/following").json()
        assert len(following) == 1
        entry = following[0]
        assert entry["id"] == builder.id
        assert entry["name"] == builder.name
        assert entry["project_count"] >= 1  # the `project` fixture
        assert entry["follower_count"] == 2

    def test_following_unknown_user_404(self, client):
        assert client.get("/api/v1/social/users/99999/following").status_code == 404


class TestSuggestions:
    def test_builders_sorted_by_followers(self, client, builder, other_builder):
        user_id = _make_user(client)
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        data = client.get("/api/v1/social/builders").json()
        count_by_id = {b["id"]: b["follower_count"] for b in data}
        assert count_by_id[builder.id] == 1
        assert count_by_id[other_builder.id] == 0
        counts = [b["follower_count"] for b in data]
        assert counts == sorted(counts, reverse=True)

    def test_suggestions_include_project_count(self, client, builder, project):
        data = client.get("/api/v1/social/builders?limit=5").json()
        entry = next(b for b in data if b["id"] == builder.id)
        assert entry["project_count"] >= 1


class TestFeed:
    def test_discover_feed_has_projects(self, client, project, builder):
        data = client.get("/api/v1/social/feed").json()
        assert data["mode"] == "discover"
        ids = [item["project"]["id"] for item in data["items"]]
        assert project.id in ids
        item = next(i for i in data["items"] if i["project"]["id"] == project.id)
        assert item["builder_id"] == builder.id
        assert item["builder_name"] == builder.name

    def test_following_feed_is_personalised(self, client, project, builder, other_builder):
        user_id = _make_user(client)
        # Following a builder with no active projects → empty personalised feed.
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": other_builder.id})
        empty = client.get(f"/api/v1/social/feed?user_id={user_id}").json()
        assert empty["mode"] == "following"
        assert empty["items"] == []
        # Following a builder with projects surfaces them in the feed.
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        data = client.get(f"/api/v1/social/feed?user_id={user_id}").json()
        assert data["mode"] == "following"
        assert any(i["project"]["id"] == project.id for i in data["items"])

    def test_feed_unit_headline(self, client, project, builder, auth_headers):
        user_id = _make_user(client)
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        tower = client.post(f"/api/v1/projects/{project.id}/towers", headers=auth_headers,
                            json={"name": "T1"}).json()
        floor = client.post(f"/api/v1/projects/{project.id}/towers/{tower['id']}/floors",
                            headers=auth_headers, json={"number": 1}).json()
        client.post(
            f"/api/v1/projects/{project.id}/towers/{tower['id']}/floors/{floor['id']}/units",
            headers=auth_headers,
            json={"unit_number": "A101", "bhk": 2, "area_sqft": 1000, "price": 7500000},
        ).json()

        data = client.get(f"/api/v1/social/feed?user_id={user_id}").json()
        item = next(i for i in data["items"] if i["project"]["id"] == project.id)
        assert item["kind"] == "units"
        assert item["headline"] == "1 new unit just listed"


class TestFeedPersistence:
    def test_follow_survives_db_roundtrip(self, db_session, client, builder):
        user_id = _make_user(client)
        client.post("/api/v1/social/follows", json={"user_id": user_id, "builder_id": builder.id})
        db_session.expire_all()
        rows = list(db_session.scalars(select(CustomerBuilderFollow)))
        assert len(rows) == 1
        assert rows[0].builder_id == builder.id