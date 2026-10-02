"""Artifact download and streaming API routes."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from app.db.session import get_session
from app.models.artifact import ProcessingArtifact
from app.storage.local import storage

router = APIRouter(prefix="/artifacts", tags=["artifacts"])

@router.get("/{artifact_id}/download")
def download_artifact(artifact_id: int, session: Session = Depends(get_session)):
    """Streams binary artifact content with verified MIME type."""
    artifact = session.get(ProcessingArtifact, artifact_id)
    if not artifact:
        raise HTTPException(status_code=404, detail=f"Artifact {artifact_id} not found.")

    if not storage.exists(artifact.storage_key):
        raise HTTPException(status_code=404, detail="Artifact file missing from storage.")

    content = storage.read_bytes(artifact.storage_key)
    filename = artifact.storage_key.split("/")[-1]

    return Response(
        content=content,
        media_type=artifact.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Content-Length": str(len(content))
        }
    )
