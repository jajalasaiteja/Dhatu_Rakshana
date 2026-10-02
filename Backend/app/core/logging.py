"""Structured logging setup for Dhatu Rakshana backend and ML subsystems."""

import logging
import sys
import time
from typing import Optional
from contextlib import contextmanager

from app.core.config import settings

def setup_logging():
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    logging.basicConfig(
        level=log_level,
        format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout
    )

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)
    logging.getLogger("ultralytics").setLevel(logging.WARNING)

logger = logging.getLogger("dhatu_rakshana")

@contextmanager
def log_stage_timing(stage_name: str, inspection_id: Optional[int] = None, metadata: Optional[dict] = None):
    """Context manager to measure and log execution duration of processing stages."""
    start_time = time.perf_counter()
    meta_str = f" meta={metadata}" if metadata else ""
    insp_str = f" inspection_id={inspection_id}" if inspection_id is not None else ""
    logger.info(f"Stage '{stage_name}' STARTED{insp_str}{meta_str}")
    try:
        yield
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Stage '{stage_name}' COMPLETED in {duration_ms:.2f}ms{insp_str}")
    except Exception as exc:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(f"Stage '{stage_name}' FAILED in {duration_ms:.2f}ms{insp_str} - error={exc}")
        raise
