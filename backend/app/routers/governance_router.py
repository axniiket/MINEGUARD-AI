import io
import csv
from datetime import datetime, date, timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User,
    Mine,
    Inspection,
    Alert,
    ComplianceEvent,
    CorrectiveAction,
    AuditLog,
)
from app.schemas import (
    ComplianceEventCreate,
    ComplianceEventResponse,
    CorrectiveActionCreate,
    CorrectiveActionUpdate,
    CorrectiveActionResponse,
    AuditLogResponse,
    RiskAnalyticsResponse,
)

router = APIRouter(prefix="/api/v1", tags=["Governance"])


def record_audit(
    db: Session,
    user: Optional[User],
    action_type: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    mine_id: Optional[UUID] = None,
    details: Optional[str] = None,
):
    """Helper to record audit trail entries."""
    log = AuditLog(
        user_id=user.id if user else None,
        user_name=user.full_name if user else "System",
        user_role=user.role if user else "system",
        action_type=action_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        mine_id=mine_id,
        details=details,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()


# ============================================================================
# COMPLIANCE CALENDAR ENDPOINTS
# ============================================================================

@router.get("/compliance/", response_model=List[ComplianceEventResponse])
def get_compliance_events(
    mine_id: Optional[UUID] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ComplianceEvent)
    if mine_id:
        query = query.filter(ComplianceEvent.mine_id == mine_id)
    if status:
        query = query.filter(ComplianceEvent.status == status)
    if category:
        query = query.filter(ComplianceEvent.category == category)
    
    events = query.order_by(ComplianceEvent.due_date.asc()).all()

    # Dynamic status update for overdue items
    today = date.today()
    for ev in events:
        if ev.status == "pending" and ev.due_date < today:
            ev.status = "overdue"
    
    return events


@router.post("/compliance/", response_model=ComplianceEventResponse)
def create_compliance_event(
    event_data: ComplianceEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = ComplianceEvent(
        **event_data.model_dump(),
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    record_audit(
        db=db,
        user=current_user,
        action_type="CREATE",
        entity_type="compliance",
        entity_id=str(event.id),
        mine_id=event.mine_id,
        details=f"Created compliance deadline: '{event.title}' due on {event.due_date}",
    )
    return event


@router.put("/compliance/{event_id}/complete", response_model=ComplianceEventResponse)
def complete_compliance_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(ComplianceEvent).filter(ComplianceEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Compliance event not found")
    
    event.status = "completed"
    event.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(event)

    record_audit(
        db=db,
        user=current_user,
        action_type="UPDATE",
        entity_type="compliance",
        entity_id=str(event.id),
        mine_id=event.mine_id,
        details=f"Marked compliance '{event.title}' as completed",
    )
    return event


# ============================================================================
# CORRECTIVE ACTIONS ENDPOINTS
# ============================================================================

@router.get("/actions/", response_model=List[CorrectiveActionResponse])
def get_corrective_actions(
    mine_id: Optional[UUID] = None,
    status: Optional[str] = None,
    is_escalated: Optional[bool] = None,
    inspection_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
):
    query = db.query(CorrectiveAction)
    if mine_id:
        query = query.filter(CorrectiveAction.mine_id == mine_id)
    if status:
        query = query.filter(CorrectiveAction.status == status)
    if is_escalated is not None:
        query = query.filter(CorrectiveAction.is_escalated == is_escalated)
    if inspection_id:
        query = query.filter(CorrectiveAction.inspection_id == inspection_id)

    return query.order_by(CorrectiveAction.deadline.asc()).all()


@router.post("/actions/", response_model=CorrectiveActionResponse)
def create_corrective_action(
    action_data: CorrectiveActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action = CorrectiveAction(
        **action_data.model_dump(),
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    record_audit(
        db=db,
        user=current_user,
        action_type="ASSIGN_ACTION",
        entity_type="corrective_action",
        entity_id=str(action.id),
        mine_id=action.mine_id,
        details=f"Assigned action '{action.title}' to {action.assigned_to_name or 'unassigned'}, deadline: {action.deadline}",
    )
    return action


@router.put("/actions/{action_id}", response_model=CorrectiveActionResponse)
def update_corrective_action(
    action_id: UUID,
    update_data: CorrectiveActionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action = db.query(CorrectiveAction).filter(CorrectiveAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Corrective action not found")

    details_list = []
    if update_data.status is not None:
        action.status = update_data.status
        details_list.append(f"Status changed to '{update_data.status}'")
        if update_data.status == "completed":
            action.closed_by_id = current_user.id
            action.closed_at = datetime.utcnow()

    if update_data.is_escalated is not None:
        action.is_escalated = update_data.is_escalated
        if update_data.is_escalated:
            action.status = "escalated"
            action.escalation_reason = update_data.escalation_reason or "Escalated due to deadline risk"
            details_list.append(f"Escalated: {action.escalation_reason}")

    if update_data.closure_evidence is not None:
        action.closure_evidence = update_data.closure_evidence
        details_list.append("Added closure evidence")

    db.commit()
    db.refresh(action)

    record_audit(
        db=db,
        user=current_user,
        action_type="UPDATE",
        entity_type="corrective_action",
        entity_id=str(action.id),
        mine_id=action.mine_id,
        details="; ".join(details_list) or "Updated action",
    )
    return action


# ============================================================================
# AUDIT LOG ENDPOINTS
# ============================================================================

@router.get("/audit/", response_model=List[AuditLogResponse])
def get_audit_logs(
    mine_id: Optional[UUID] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if mine_id:
        query = query.filter(AuditLog.mine_id == mine_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


# ============================================================================
# RULE-BASED RISK ANALYTICS ENDPOINT
# ============================================================================

@router.get("/analytics/risk", response_model=RiskAnalyticsResponse)
def get_risk_analytics(db: Session = Depends(get_db)):
    today = date.today()

    # 1. High-risk mines calculation
    mines = db.query(Mine).all()
    high_risk_list = []
    for m in mines:
        open_alerts = db.query(Alert).filter(Alert.mine_id == m.id, Alert.status == "active").count()
        critical_alerts = db.query(Alert).filter(Alert.mine_id == m.id, Alert.status == "active", Alert.severity == "critical").count()
        overdue_comp = db.query(ComplianceEvent).filter(ComplianceEvent.mine_id == m.id, ComplianceEvent.status != "completed", ComplianceEvent.due_date < today).count()
        overdue_acts = db.query(CorrectiveAction).filter(CorrectiveAction.mine_id == m.id, CorrectiveAction.status != "completed", CorrectiveAction.deadline < today).count()

        # Weighted risk index
        risk_index = round(
            (100.0 - m.compliance_score) * 0.4
            + (critical_alerts * 20.0)
            + (open_alerts * 8.0)
            + (overdue_comp * 10.0)
            + (overdue_acts * 6.0),
            1
        )
        high_risk_list.append({
            "mine_id": str(m.id),
            "mine_name": m.name,
            "location": m.location,
            "state": m.state,
            "compliance_score": m.compliance_score,
            "open_alerts": open_alerts,
            "critical_alerts": critical_alerts,
            "overdue_items": overdue_comp + overdue_acts,
            "calculated_risk_index": min(100.0, max(0.0, risk_index)),
            "risk_tier": "CRITICAL" if risk_index >= 60 else "HIGH" if risk_index >= 35 else "MODERATE" if risk_index >= 15 else "LOW",
        })

    # Sort descending by risk index
    high_risk_list.sort(key=lambda x: x["calculated_risk_index"], reverse=True)

    # 2. Recurring violations detection
    alerts = db.query(Alert).all()
    type_counts = {}
    for a in alerts:
        type_counts[a.type] = type_counts.get(a.type, 0) + 1

    recurring = [
        {
            "violation_type": k,
            "occurrences": v,
            "severity": "CRITICAL" if "methane" in k or "violation" in k else "HIGH",
            "recommended_policy": "Mandate daily DGMS pre-shift calibration and independent safety audits.",
        }
        for k, v in sorted(type_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    # 3. Overall counts
    overdue_actions = db.query(CorrectiveAction).filter(CorrectiveAction.status != "completed", CorrectiveAction.deadline < today).count()
    overdue_events = db.query(ComplianceEvent).filter(ComplianceEvent.status != "completed", ComplianceEvent.due_date < today).count()

    # 4. Compliance Breakdown
    avg_score = db.query(func.avg(Mine.compliance_score)).scalar() or 80.0
    breakdown = {
        "Ventilation & Gas Safety": round(avg_score * 0.95, 1),
        "Roof Support & Geomechanics": round(avg_score * 0.92, 1),
        "Heavy Machinery & Electrical": round(avg_score * 0.88, 1),
        "Environmental & Dust Control": round(avg_score * 1.02, 1),
        "Statutory DGMS Filings": round(avg_score * 0.98, 1),
    }

    return RiskAnalyticsResponse(
        high_risk_mines=high_risk_list,
        recurring_violations=recurring,
        overdue_actions_count=overdue_actions,
        overdue_compliance_count=overdue_events,
        compliance_breakdown=breakdown,
        status_summary={
            "total_mines": len(mines),
            "total_alerts": len(alerts),
            "active_alerts": sum(1 for a in alerts if a.status == "active"),
            "overdue_actions": overdue_actions,
        },
    )


# ============================================================================
# CSV REPORT EXPORT ENDPOINT
# ============================================================================

@router.get("/reports/export-csv")
def export_csv_report(
    mine_id: Optional[UUID] = None,
    report_type: str = "inspections",  # inspections, alerts, actions, compliance
    db: Session = Depends(get_db),
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "alerts":
        query = db.query(Alert)
        if mine_id:
            query = query.filter(Alert.mine_id == mine_id)
        alerts = query.order_by(Alert.created_at.desc()).all()

        writer.writerow(["Alert ID", "Mine ID", "Type", "Severity", "Title", "Message", "Status", "Created At"])
        for a in alerts:
            writer.writerow([a.id, a.mine_id, a.type, a.severity, a.title, a.message, a.status, a.created_at])
        filename = f"mineguard_alerts_{date.today()}.csv"

    elif report_type == "actions":
        query = db.query(CorrectiveAction)
        if mine_id:
            query = query.filter(CorrectiveAction.mine_id == mine_id)
        actions = query.order_by(CorrectiveAction.deadline.asc()).all()

        writer.writerow(["Action ID", "Mine ID", "Title", "Description", "Assigned To", "Deadline", "Priority", "Status", "Is Escalated", "Closure Evidence", "Created At"])
        for act in actions:
            writer.writerow([act.id, act.mine_id, act.title, act.description, act.assigned_to_name, act.deadline, act.priority, act.status, act.is_escalated, act.closure_evidence, act.created_at])
        filename = f"mineguard_corrective_actions_{date.today()}.csv"

    elif report_type == "compliance":
        query = db.query(ComplianceEvent)
        if mine_id:
            query = query.filter(ComplianceEvent.mine_id == mine_id)
        events = query.order_by(ComplianceEvent.due_date.asc()).all()

        writer.writerow(["Event ID", "Mine ID", "Title", "Regulation Code", "Category", "Due Date", "Status", "Priority", "Assigned To", "Completed At"])
        for ev in events:
            writer.writerow([ev.id, ev.mine_id, ev.title, ev.regulation_code, ev.category, ev.due_date, ev.status, ev.priority, ev.assigned_to, ev.completed_at])
        filename = f"mineguard_compliance_calendar_{date.today()}.csv"

    else:  # inspections
        query = db.query(Inspection)
        if mine_id:
            query = query.filter(Inspection.mine_id == mine_id)
        inspections = query.order_by(Inspection.created_at.desc()).all()

        writer.writerow(["Inspection ID", "Mine ID", "Inspector ID", "Type", "Title", "Description", "Latitude", "Longitude", "AI Category", "AI Severity", "AI Risk Score", "OCR Doc Status", "Status", "Created At"])
        for ins in inspections:
            writer.writerow([
                ins.id,
                ins.mine_id,
                ins.inspector_id,
                ins.type,
                ins.title,
                ins.description,
                ins.latitude,
                ins.longitude,
                ins.ai_category,
                ins.ai_severity,
                ins.ai_risk_score,
                ins.doc_extraction_status,
                ins.status,
                ins.created_at,
            ])
        filename = f"mineguard_inspections_{date.today()}.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
