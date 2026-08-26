from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid


# ------------------ AUTH SCHEMAS ------------------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: str = "officer"  # officer, admin, regulator


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    assigned_mine_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ------------------ MINE SCHEMAS ------------------

class MineCreate(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    state: str
    mine_type: str = "underground"  # underground, opencast
    status: str = "active"


class MineResponse(BaseModel):
    id: uuid.UUID
    name: str
    location: str
    latitude: float
    longitude: float
    state: str
    mine_type: str
    status: str
    compliance_score: float
    created_at: datetime
    
    model_config = {"from_attributes": True}


# --------------- OBSERVATION SCHEMAS ---------------

class ObservationCreate(BaseModel):
    inspection_id: uuid.UUID
    description: str
    image_url: Optional[str] = None
    severity: str = "medium"


class ObservationResponse(BaseModel):
    id: uuid.UUID
    inspection_id: uuid.UUID
    description: str
    image_url: Optional[str] = None
    severity: str
    created_at: datetime
    
    model_config = {"from_attributes": True}


# --------------- INSPECTION SCHEMAS ---------------

class InspectionCreate(BaseModel):
    mine_id: uuid.UUID
    type: str
    title: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None


class InspectionResponse(BaseModel):
    id: uuid.UUID
    mine_id: uuid.UUID
    inspector_id: uuid.UUID
    type: str
    title: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    ai_category: Optional[str] = None
    ai_severity: Optional[str] = None
    ai_recommended_actions: Optional[str] = None
    ai_risk_score: Optional[float] = None
    status: str
    doc_filename: Optional[str] = None
    doc_file_url: Optional[str] = None
    doc_extracted_text: Optional[str] = None
    doc_extraction_status: Optional[str] = None
    doc_uploaded_at: Optional[datetime] = None
    created_at: datetime
    observations: List[ObservationResponse] = []
    
    model_config = {"from_attributes": True}


class MineDashboard(BaseModel):
    mine: MineResponse
    total_inspections: int
    open_alerts: int
    recent_inspections: List[InspectionResponse]
    compliance_score: float


# ----------------- ALERT SCHEMAS -----------------

class AlertResponse(BaseModel):
    id: uuid.UUID
    mine_id: uuid.UUID
    type: str
    severity: str
    title: str
    message: Optional[str] = None
    status: str
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ----------- COMPLIANCE CALENDAR SCHEMAS -----------

class ComplianceEventCreate(BaseModel):
    mine_id: uuid.UUID
    title: str
    regulation_code: Optional[str] = None
    category: str = "safety"
    due_date: date
    priority: str = "high"
    assigned_to: Optional[str] = None
    reminder_days_before: int = 7


class ComplianceEventResponse(BaseModel):
    id: uuid.UUID
    mine_id: uuid.UUID
    title: str
    regulation_code: Optional[str] = None
    category: str
    due_date: date
    status: str
    priority: str
    assigned_to: Optional[str] = None
    reminder_days_before: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ----------- CORRECTIVE ACTION SCHEMAS -----------

class CorrectiveActionCreate(BaseModel):
    mine_id: uuid.UUID
    inspection_id: Optional[uuid.UUID] = None
    alert_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    assigned_to_name: Optional[str] = None
    deadline: date
    priority: str = "high"


class CorrectiveActionUpdate(BaseModel):
    status: Optional[str] = None  # pending, in_progress, escalated, completed
    is_escalated: Optional[bool] = None
    escalation_reason: Optional[str] = None
    closure_evidence: Optional[str] = None


class CorrectiveActionResponse(BaseModel):
    id: uuid.UUID
    mine_id: uuid.UUID
    inspection_id: Optional[uuid.UUID] = None
    alert_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    assigned_to_name: Optional[str] = None
    deadline: date
    priority: str
    status: str
    is_escalated: bool
    escalation_reason: Optional[str] = None
    closure_evidence: Optional[str] = None
    closed_by_id: Optional[uuid.UUID] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# --------------- AUDIT LOG SCHEMAS ---------------

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action_type: str
    entity_type: str
    entity_id: Optional[str] = None
    mine_id: Optional[uuid.UUID] = None
    details: Optional[str] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# --------------- ANALYTICS SCHEMAS ---------------

class RiskAnalyticsResponse(BaseModel):
    high_risk_mines: List[Dict[str, Any]]
    recurring_violations: List[Dict[str, Any]]
    overdue_actions_count: int
    overdue_compliance_count: int
    compliance_breakdown: Dict[str, float]
    status_summary: Dict[str, int]


class OverviewStats(BaseModel):
    total_mines: int
    total_inspections: int
    active_alerts: int
    avg_compliance_score: float
    critical_alerts: int
    pending_actions: int = 0
