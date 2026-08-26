import os
import uuid
import shutil
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.auth import get_current_user
from app.models import Inspection, Observation, User
from app.schemas import InspectionCreate, InspectionResponse, ObservationCreate, ObservationResponse
from app.services.ocr_service import extract_text_from_file

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/v1/inspections", tags=["Inspections"])


@router.get("/", response_model=List[InspectionResponse])
def get_inspections(
    mine_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Inspection)
    if mine_id:
        query = query.filter(Inspection.mine_id == mine_id)
    if status:
        query = query.filter(Inspection.status == status)
    
    return query.order_by(Inspection.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=InspectionResponse)
def create_inspection(
    inspection_data: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_inspection = Inspection(
        **inspection_data.model_dump(),
        inspector_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(new_inspection)
    db.commit()
    db.refresh(new_inspection)
    return new_inspection


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(inspection_id: UUID, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).options(selectinload(Inspection.observations)).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


@router.post("/{inspection_id}/upload-doc", response_model=InspectionResponse)
async def upload_inspection_document(
    inspection_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).options(selectinload(Inspection.observations)).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    # Sanitize and create unique file path
    orig_filename = file.filename or "uploaded_document"
    ext = os.path.splitext(orig_filename)[1]
    saved_filename = f"insp_{inspection_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")
    finally:
        file.file.close()

    # Perform OCR / Text Extraction
    extracted_text, status = extract_text_from_file(file_path, file.content_type or "")

    # Update inspection record
    inspection.doc_filename = orig_filename
    inspection.doc_file_url = f"/uploads/{saved_filename}"
    inspection.doc_extracted_text = extracted_text
    inspection.doc_extraction_status = status
    inspection.doc_uploaded_at = datetime.utcnow()

    db.commit()
    db.refresh(inspection)
    return inspection


@router.post("/{inspection_id}/observations", response_model=ObservationResponse)
def add_observation(
    inspection_id: UUID,
    observation_data: ObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    
    new_observation = Observation(
        **observation_data.model_dump(exclude={'inspection_id'}),
        inspection_id=inspection_id,
        created_at=datetime.utcnow()
    )
    db.add(new_observation)
    db.commit()
    db.refresh(new_observation)
    return new_observation
