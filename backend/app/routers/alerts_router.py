from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import Alert, User
from app.schemas import AlertResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    mine_id: Optional[UUID] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if mine_id:
        query = query.filter(Alert.mine_id == mine_id)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
        
    return query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: UUID, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.put("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: UUID, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "resolved"
    db.commit()
    db.refresh(alert)
    return alert
