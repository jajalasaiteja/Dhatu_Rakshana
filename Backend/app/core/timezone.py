"""Centralized Indian Standard Time (IST) utility module for Project Dhatu Rakshana.

Standardizes all timestamp creation, conversion, storage serialization, and formatting
to Indian Standard Time (IST, Asia/Kolkata, UTC+05:30) across the entire platform.
"""

from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
    try:
        IST = ZoneInfo("Asia/Kolkata")
    except Exception:
        IST = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")
except ImportError:
    IST = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")

from typing import Optional, Union, Any
import sqlalchemy as sa
from sqlalchemy.types import TypeDecorator

# Canonical IST Timezone identifier (Asia/Kolkata, UTC+05:30)
IST_TIMEZONE_STR = "Asia/Kolkata"
IST_OFFSET_STR = "+05:30"
IST_LABEL = "IST"

def get_ist_now() -> datetime:
    """Return the current instant as a timezone-aware datetime in Asia/Kolkata (IST).

    Guarantees no naive datetimes are created and does not depend on the host OS timezone.
    """
    return datetime.now(IST)

def to_ist(dt_val: Optional[Union[datetime, str, int, float]]) -> Optional[datetime]:
    """Convert any datetime, ISO timestamp string, or numeric epoch to a timezone-aware IST datetime.

    Handles:
    - Aware datetime: converted via astimezone(IST)
    - Naive datetime: assumes UTC (standard storage format of historical SQLite records) and converts to IST
    - ISO timestamp string: parsed with datetime.fromisoformat; if naive, treated as UTC then converted to IST
    - Numeric timestamp (epoch seconds): converted to UTC instant then to IST
    - None or invalid: returns None safely without raising exceptions
    """
    if dt_val is None:
        return None

    if isinstance(dt_val, (int, float)):
        try:
            return datetime.fromtimestamp(dt_val, tz=timezone.utc).astimezone(IST)
        except Exception:
            return None

    if isinstance(dt_val, str):
        val = dt_val.strip()
        if not val or val.lower() in ("null", "none", "n/a", "undefined", "invalid date"):
            return None
        # Try fromisoformat first
        try:
            parsed = datetime.fromisoformat(val)
            if parsed.tzinfo is None:
                # Historical database records stored naive UTC string
                return parsed.replace(tzinfo=timezone.utc).astimezone(IST)
            return parsed.astimezone(IST)
        except Exception:
            pass

        # Fallback formats
        for fmt in (
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                parsed = datetime.strptime(val, fmt)
                return parsed.replace(tzinfo=timezone.utc).astimezone(IST)
            except ValueError:
                continue
        return None

    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            # Naive datetime from legacy database retrieval: represents UTC instant
            return dt_val.replace(tzinfo=timezone.utc).astimezone(IST)
        return dt_val.astimezone(IST)

    return None

def format_ist_iso(dt_val: Optional[Union[datetime, str]]) -> Optional[str]:
    """Return an ISO 8601 string in IST with explicit +05:30 offset.

    Example: '2026-10-23T09:30:00.123456+05:30'
    """
    ist_dt = to_ist(dt_val)
    if ist_dt is None:
        return None
    return ist_dt.isoformat()

def format_ist_display(
    dt_val: Optional[Union[datetime, str]],
    include_seconds: bool = False,
    include_tz: bool = True
) -> str:
    """Format datetime for human display in IST (e.g. for PDF reports, UI text).

    Example: '23 Oct 2026, 02:30 PM IST' or '23 Oct 2026, 02:30:15 PM IST'
    """
    ist_dt = to_ist(dt_val)
    if ist_dt is None:
        return "N/A"

    time_fmt = "%I:%M:%S %p" if include_seconds else "%I:%M %p"
    base_str = ist_dt.strftime(f"%d %b %Y, {time_fmt}")
    if include_tz:
        return f"{base_str} {IST_LABEL}"
    return base_str

class ISTDateTime(TypeDecorator):
    """SQLAlchemy TypeDecorator for seamless, consistent IST timestamp persistence.

    Storage Policy:
    - Internal SQLite storage: Stored as naive UTC datetimes, maintaining 100% compatibility
      with all existing legacy records in the SQLite database.
    - Application & API boundary: Always loaded and surfaced as timezone-aware datetimes in
      Asia/Kolkata (IST, UTC+05:30).
    - Prevents accidental timezone loss and double conversion.
    """
    impl = sa.DateTime
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: sa.Dialect) -> Any:
        if value is None:
            return None
        ist_dt = to_ist(value)
        if ist_dt is None:
            return None
        # Convert to UTC instant for SQLite storage compatibility
        utc_dt = ist_dt.astimezone(timezone.utc)
        if dialect and dialect.name == "sqlite":
            return utc_dt.replace(tzinfo=None)
        return utc_dt

    def process_result_value(self, value: Any, dialect: sa.Dialect) -> Optional[datetime]:
        if value is None:
            return None
        return to_ist(value)
