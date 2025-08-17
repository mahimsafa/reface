from __future__ import annotations

from .session import engine, Base
from . import models  # noqa: F401  # Ensure models are imported so tables are registered


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("Database initialized.")
