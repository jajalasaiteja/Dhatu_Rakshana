"""Unit tests verifying PostgreSQL-only database configuration and SQLite rejection."""

import pytest
from app.core.config import resolve_db_url, build_default_postgres_url
from app.db.session import create_db_engine


def test_sqlite_url_is_strictly_rejected():
    """Verify that any SQLite URL raises a ValueError instead of falling back."""
    test_urls = [
        "sqlite:///./data/dhatu_rakshana.db",
        "sqlite:////tmp/test.db",
        "sqlite://",
        "sqlite+pysqlite:///relative/path.db",
        "SQLITE:///caps.db",
    ]
    for url in test_urls:
        with pytest.raises(ValueError) as excinfo:
            resolve_db_url(url)
        assert "SQLite is not supported" in str(excinfo.value)


def test_sqlite_in_create_db_engine_is_strictly_rejected():
    """Verify create_db_engine refuses to construct an engine for SQLite."""
    with pytest.raises(ValueError) as excinfo:
        create_db_engine("sqlite:///./data/dhatu_rakshana.db")
    assert "SQLite is not supported" in str(excinfo.value)


def test_valid_postgres_url_accepted():
    """Verify that valid PostgreSQL URLs are accepted and formatted properly."""
    url = "postgresql://myuser:mypass@dbhost:5433/marine_db"
    resolved = resolve_db_url(url)
    assert resolved == "postgresql+psycopg2://myuser:mypass@dbhost:5433/marine_db"

    psycopg2_url = "postgresql+psycopg2://user:pass@localhost:5432/marine_defect_db"
    assert resolve_db_url(psycopg2_url) == psycopg2_url


def test_default_postgres_url_builder():
    """Verify build_default_postgres_url constructs a valid postgresql+psycopg2 URL."""
    built = build_default_postgres_url()
    assert built.startswith("postgresql+psycopg2://")
    assert "marine_defect_db" in built
