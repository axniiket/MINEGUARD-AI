from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_admin
from app.models import Mine, Inspection, Alert, ComplianceEvent, CorrectiveAction, Document, User
from app.schemas import MineCreate, MineResponse, MineDashboard
from app.routers.governance_router import record_audit

router = APIRouter(prefix="/api/v1/mines", tags=["Mines"])


@router.get("/", response_model=List[MineResponse])
def get_mines(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Mine)
    if status:
        query = query.filter(Mine.status == status)
    return query.order_by(Mine.name.asc()).all()


@router.post("/", response_model=MineResponse)
def create_mine(mine_data: MineCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    new_mine = Mine(**mine_data.model_dump())
    db.add(new_mine)
    db.commit()
    db.refresh(new_mine)

    record_audit(
        db=db,
        user=current_user,
        action_type="CREATE",
        entity_type="mine",
        entity_id=str(new_mine.id),
        mine_id=new_mine.id,
        details=f"Admin created new mine site '{new_mine.name}' in {new_mine.state}.",
    )
    return new_mine


@router.get("/{mine_id}", response_model=MineResponse)
def get_mine(mine_id: UUID, db: Session = Depends(get_db)):
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")
    return mine


@router.get("/{mine_id}/linked-counts")
def get_mine_linked_counts(mine_id: UUID, db: Session = Depends(get_db)):
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")

    inspections_count = db.query(Inspection).filter(Inspection.mine_id == mine_id).count()
    alerts_count = db.query(Alert).filter(Alert.mine_id == mine_id).count()
    compliance_count = db.query(ComplianceEvent).filter(ComplianceEvent.mine_id == mine_id).count()
    actions_count = db.query(CorrectiveAction).filter(CorrectiveAction.mine_id == mine_id).count()
    documents_count = db.query(Document).filter(Document.mine_id == mine_id).count()

    total_linked = inspections_count + alerts_count + compliance_count + actions_count + documents_count

    return {
        "mine_id": str(mine.id),
        "mine_name": mine.name,
        "status": mine.status,
        "inspections_count": inspections_count,
        "alerts_count": alerts_count,
        "compliance_events_count": compliance_count,
        "corrective_actions_count": actions_count,
        "documents_count": documents_count,
        "total_linked": total_linked,
        "can_delete": total_linked == 0,
    }


@router.get("/{mine_id}/dashboard", response_model=MineDashboard)
def get_mine_dashboard(mine_id: UUID, db: Session = Depends(get_db)):
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")
    
    inspections_count = db.query(Inspection).filter(Inspection.mine_id == mine_id).count()
    active_alerts_count = db.query(Alert).filter(Alert.mine_id == mine_id, Alert.status != "resolved").count()
    recent_inspections = db.query(Inspection).filter(Inspection.mine_id == mine_id).order_by(Inspection.created_at.desc()).limit(5).all()
    
    return MineDashboard(
        mine=mine,
        total_inspections=inspections_count,
        open_alerts=active_alerts_count,
        recent_inspections=recent_inspections,
        compliance_score=mine.compliance_score,
    )


@router.put("/{mine_id}/archive", response_model=MineResponse)
def archive_mine(
    mine_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")

    inspections_count = db.query(Inspection).filter(Inspection.mine_id == mine_id).count()
    alerts_count = db.query(Alert).filter(Alert.mine_id == mine_id).count()
    total_linked = inspections_count + alerts_count

    mine.status = "archived"
    db.commit()
    db.refresh(mine)

    record_audit(
        db=db,
        user=current_user,
        action_type="UPDATE",
        entity_type="mine",
        entity_id=str(mine.id),
        mine_id=mine.id,
        details=f"Admin archived mine '{mine.name}'. Hidden from active operational feeds while preserving {total_linked}+ linked historical records.",
    )
    return mine


@router.put("/{mine_id}/unarchive", response_model=MineResponse)
def unarchive_mine(
    mine_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")

    mine.status = "active"
    db.commit()
    db.refresh(mine)

    record_audit(
        db=db,
        user=current_user,
        action_type="UPDATE",
        entity_type="mine",
        entity_id=str(mine.id),
        mine_id=mine.id,
        details=f"Admin restored archived mine '{mine.name}' to active status.",
    )
    return mine


@router.delete("/{mine_id}")
def delete_mine(
    mine_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found")

    inspections_count = db.query(Inspection).filter(Inspection.mine_id == mine_id).count()
    alerts_count = db.query(Alert).filter(Alert.mine_id == mine_id).count()
    compliance_count = db.query(ComplianceEvent).filter(ComplianceEvent.mine_id == mine_id).count()
    actions_count = db.query(CorrectiveAction).filter(CorrectiveAction.mine_id == mine_id).count()
    documents_count = db.query(Document).filter(Document.mine_id == mine_id).count()

    total_linked = inspections_count + alerts_count + compliance_count + actions_count + documents_count

    if total_linked > 0:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Cannot permanently delete '{mine.name}' because it has {total_linked} linked historical records. To protect compliance history, please Archive the mine instead.",
                "total_linked": total_linked,
                "inspections": inspections_count,
                "alerts": alerts_count,
                "compliance_events": compliance_count,
                "corrective_actions": actions_count,
                "documents": documents_count,
            },
        )

    # If zero linked records, safe to hard delete
    mine_name = mine.name
    db.delete(mine)
    db.commit()

    record_audit(
        db=db,
        user=current_user,
        action_type="DELETE",
        entity_type="mine",
        entity_id=str(mine_id),
        details=f"Admin permanently deleted empty mine leasehold record '{mine_name}'.",
    )

    return {"message": f"Mine '{mine_name}' successfully deleted.", "deleted": True}
