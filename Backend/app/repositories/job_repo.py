"""ProcessingJob and Artifact repositories."""

from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import Session, select

from app.models.job import ProcessingJob
from app.models.artifact import ProcessingArtifact
from app.repositories.base import BaseRepository

class JobRepository(BaseRepository[ProcessingJob]):
    def __init__(self, session: Session):
        super().__init__(ProcessingJob, session)

    def get_by_job_id(self, job_id: str) -> Optional[ProcessingJob]:
        return self.session.exec(select(ProcessingJob).where(ProcessingJob.job_id == job_id)).first()

    def get_latest_for_inspection(self, inspection_id: int) -> Optional[ProcessingJob]:
        statement = (
            select(ProcessingJob)
            .where(ProcessingJob.inspection_id == inspection_id)
            .order_by(ProcessingJob.started_at.desc())
        )
        return self.session.exec(statement).first()

    def update_stage(
        self,
        job: ProcessingJob,
        stage: str,
        progress_pct: int,
        status: Optional[str] = None
    ) -> ProcessingJob:
        job.current_stage = stage
        job.progress_pct = progress_pct
        if status:
            job.status = status
            if status in ("COMPLETED", "FAILED", "CANCELLED"):
                job.completed_at = datetime.now(timezone.utc)
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job

class ArtifactRepository(BaseRepository[ProcessingArtifact]):
    def __init__(self, session: Session):
        super().__init__(ProcessingArtifact, session)

    def get_by_inspection(self, inspection_id: int) -> List[ProcessingArtifact]:
        statement = select(ProcessingArtifact).where(ProcessingArtifact.inspection_id == inspection_id)
        return self.session.exec(statement).all()
