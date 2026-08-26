import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models import BuilderRole, BuilderUser, Project, ProjectStatus


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(eng, "connect")
    def _set_sqlite_pragma(dbapi_conn, _rec):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)


@pytest.fixture()
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(engine, db_session):
    def _override_db():
        yield db_session

    app = create_app()
    app.dependency_overrides[get_db] = _override_db

    # Disable rate limiting in tests
    from app.core.rate_limit import limiter
    limiter.enabled = False

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def builder(db_session) -> BuilderUser:
    builder = BuilderUser(
        name="Test Builder",
        email="builder@test.com",
        password_hash=hash_password("testpass123"),
        role=BuilderRole.BUILDER,
    )
    db_session.add(builder)
    db_session.commit()
    db_session.refresh(builder)
    return builder


@pytest.fixture()
def auth_headers(builder) -> dict:
    token = create_access_token(str(builder.id), str(builder.role))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def project(db_session, builder) -> Project:
    project = Project(
        name="Test Project",
        slug="test-project",
        description="A test project",
        property_type="luxury_apartment",
        city="Mumbai",
        locality="Bandra",
        starting_price=10000000,
        status=ProjectStatus.ACTIVE,
        builder_id=builder.id,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project
