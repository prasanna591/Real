"""social follows feed

Revision ID: a1b9c21d3e4f
Revises: fb6fb9e8211e
Create Date: 2026-09-05 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b9c21d3e4f'
down_revision: Union[str, Sequence[str], None] = 'fb6fb9e8211e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Written manually (neither plain op.create_table nor ALTER additions work
    # cleanly here): SQLite can't reflect check constraints (so autogen keeps
    # guessing ck_saved_item_single_target is "new"), and the dev app's
    # create_all already creates tables at startup. IF NOT EXISTS keeps the
    # migration runnable against both fresh and create_all-seeded databases.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_builder_follows (
            id INTEGER NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            user_id INTEGER NOT NULL,
            builder_id INTEGER NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY(user_id) REFERENCES customer_users (id) ON DELETE CASCADE,
            FOREIGN KEY(builder_id) REFERENCES builder_users (id) ON DELETE CASCADE,
            CONSTRAINT uq_follow_user_builder UNIQUE (user_id, builder_id)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_customer_builder_follows_user_id "
        "ON customer_builder_follows (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_customer_builder_follows_builder_id "
        "ON customer_builder_follows (builder_id)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS customer_builder_follows")