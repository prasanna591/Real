"""Social-proof layer: counters, trending sort, view bumps, share attribution."""

from sqlalchemy import select

from app.models import AnalyticsEvent, EventType, Project, ProjectStatus


def _make_user(client, phone="+919876543220"):
    return client.post("/api/v1/users", json={"name": "Buyer", "phone": phone}).json()["id"]


class TestCounters:
    def test_new_project_has_zero_counters(self, client, auth_headers):
        resp = client.post("/api/v1/projects", headers=auth_headers, json={
            "name": "Fresh",
            "slug": "fresh-project",
            "city": "Mumbai",
            "property_type": "villa",
            "status": "active",
        })
        assert resp.status_code == 201
        assert resp.json()["save_count"] == 0
        assert resp.json()["view_count"] == 0

    def test_save_increments_save_count(self, client, project):
        user_id = _make_user(client)
        client.post("/api/v1/saved", json={"user_id": user_id, "project_id": project.id})
        resp = client.get(f"/api/v1/projects/{project.id}")
        assert resp.json()["save_count"] == 1

    def test_duplicate_save_does_not_double_count(self, client, project):
        user_id = _make_user(client)
        client.post("/api/v1/saved", json={"user_id": user_id, "project_id": project.id})
        client.post("/api/v1/saved", json={"user_id": user_id, "project_id": project.id})
        resp = client.get(f"/api/v1/projects/{project.id}")
        assert resp.json()["save_count"] == 1

    def test_unsave_decrements_save_count(self, client, project):
        user_id = _make_user(client)
        saved = client.post("/api/v1/saved", json={"user_id": user_id, "project_id": project.id})
        client.delete(f"/api/v1/saved/{saved.json()['id']}")
        resp = client.get(f"/api/v1/projects/{project.id}")
        assert resp.json()["save_count"] == 0

    def test_unit_save_increments_project_save_count(self, client, project, auth_headers):
        user_id = _make_user(client)
        tower = client.post(f"/api/v1/projects/{project.id}/towers", headers=auth_headers,
                            json={"name": "T1"}).json()
        floor = client.post(f"/api/v1/projects/{project.id}/towers/{tower['id']}/floors",
                            headers=auth_headers, json={"number": 1}).json()
        unit = client.post(
            f"/api/v1/projects/{project.id}/towers/{tower['id']}/floors/{floor['id']}/units",
            headers=auth_headers,
            json={"unit_number": "A101", "bhk": 2, "area_sqft": 1000, "price": 7500000,
                  "facing": "east", "status": "available"},
        ).json()

        saved = client.post("/api/v1/saved", json={
            "user_id": user_id, "project_id": project.id, "unit_id": unit["id"],
        })
        assert saved.status_code == 201
        # The row must hold exactly one target (unit_id), matching the check constraint.
        assert saved.json()["unit_id"] == unit["id"]
        assert saved.json()["project_id"] is None

        resp = client.get(f"/api/v1/projects/{project.id}")
        assert resp.json()["save_count"] == 1


class TestViews:
    def test_get_project_bumps_view_count(self, client, project):
        assert client.get(f"/api/v1/projects/{project.id}").json()["view_count"] == 1
        assert client.get(f"/api/v1/projects/{project.id}").json()["view_count"] == 2

    def test_feed_list_does_not_bump_views(self, client, project):
        client.get(f"/api/v1/projects/{project.id}")
        before = client.get("/api/v1/projects").json()[0]["view_count"]
        client.get("/api/v1/projects")
        after = client.get("/api/v1/projects").json()[0]["view_count"]
        assert before == after


class TestSort:
    def _seed_projects(self, client, builder, db_session):
        specs = [
            ("high-views", 40, 5),
            ("high-saves", 10, 30),
            ("balanced", 20, 20),
            ("quiet", 1, 1),
        ]
        for idx, (slug, views, saves) in enumerate(specs):
            project = Project(
                name=f"Sort {idx}",
                slug=slug,
                city="Pune",
                property_type="luxury_apartment",
                status=ProjectStatus.ACTIVE,
                builder_id=builder.id,
                view_count=views,
                save_count=saves,
            )
            db_session.add(project)
        db_session.commit()

    def test_sort_views(self, client, builder, db_session):
        self._seed_projects(client, builder, db_session)
        data = client.get("/api/v1/projects?sort=views").json()
        views = [p["view_count"] for p in data]
        assert views[0] > views[-1]

    def test_sort_saves(self, client, builder, db_session):
        self._seed_projects(client, builder, db_session)
        data = client.get("/api/v1/projects?sort=saves").json()
        saves = [p["save_count"] for p in data]
        assert saves[0] > saves[-1]

    def test_sort_trending_sums_counters(self, client, builder, db_session):
        self._seed_projects(client, builder, db_session)
        data = client.get("/api/v1/projects?sort=trending").json()
        summed = [p["view_count"] + p["save_count"] for p in data]
        assert summed == sorted(summed, reverse=True)
        # "high-views" (40+5=45) should edge out "high-saves" (10+30=40) under trending.
        assert data[0]["slug"] == "high-views"


class TestShareAttribution:
    def test_share_event_records_referrer(self, client, project, db_session):
        referrer = _make_user(client, "+919876543221")
        resp = client.post("/api/v1/analytics/events", json={
            "event_type": "share",
            "project_id": project.id,
            "session_id": "s-share",
            "ref_user_id": referrer,
        })
        assert resp.status_code == 202
        event = db_session.scalar(
            select(AnalyticsEvent).where(AnalyticsEvent.event_type == EventType.SHARE)
        )
        assert event.ref_user_id == referrer