"""Create a builder account for the dashboard.

Usage:
    python scripts/create_builder.py <name> <email> <password>
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import BuilderUser  # noqa: E402


def main() -> None:
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    name, email, password = sys.argv[1:4]

    if len(password) < 8:
        print("Password must be at least 8 characters")
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        existing = db.scalar(select(BuilderUser).where(BuilderUser.email == email.lower()))
        if existing:
            print(f"Builder already exists: {email}")
            return
        db.add(BuilderUser(name=name, email=email.lower(), password_hash=hash_password(password)))
        db.commit()
    print(f"Created builder account for {email}")


if __name__ == "__main__":
    main()
