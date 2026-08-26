import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, Date, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="officer")
    assigned_mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assigned_mine = relationship("Mine", back_populates="users")
    inspections = relationship("Inspection", back_populates="inspector")


class Mine(Base):
    __tablename__ = "mines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    state = Column(String(100))
    mine_type = Column(String(50))
    status = Column(String(50), default="active")
    compliance_score = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="assigned_mine")
    inspections = relationship("Inspection", back_populates="mine")
    alerts = relationship("Alert", back_populates="mine")
    iot_readings = relationship("IoTReading", back_populates="mine")
    documents = relationship("Document", back_populates="mine")
    compliance_events = relationship("ComplianceEvent", back_populates="mine")
    corrective_actions = relationship("CorrectiveAction", back_populates="mine")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=False)
    inspector_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    ai_category = Column(String(100), nullable=True)
    ai_severity = Column(String(50), nullable=True)
    ai_recommended_actions = Column(Text, nullable=True)
    ai_risk_score = Column(Float, nullable=True)
    status = Column(String(50), default="submitted")
    doc_filename = Column(String(255), nullable=True)
    doc_file_url = Column(String(500), nullable=True)
    doc_extracted_text = Column(Text, nullable=True)
    doc_extraction_status = Column(String(50), nullable=True)
    doc_uploaded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="inspections")
    inspector = relationship("User", back_populates="inspections")
    observations = relationship("Observation", back_populates="inspection", cascade="all, delete-orphan")
    corrective_actions = relationship("CorrectiveAction", back_populates="inspection")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    severity = Column(String(50), default="medium")
    created_at = Column(DateTime, default=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="observations")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=False)
    type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="alerts")


class IoTReading(Base):
    __tablename__ = "iot_readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=False)
    sensor_type = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20))
    status = Column(String(50), default="normal")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="iot_readings")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    doc_type = Column(String(100), default="other")
    ai_extracted_text = Column(Text, nullable=True)
    ai_expiry_date = Column(Date, nullable=True)
    ai_summary = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="documents")
    uploader = relationship("User")


class ComplianceEvent(Base):
    __tablename__ = "compliance_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=False)
    title = Column(String(255), nullable=False)
    regulation_code = Column(String(100), nullable=True)
    category = Column(String(50), default="safety")
    due_date = Column(Date, nullable=False)
    status = Column(String(50), default="pending")  # pending, completed, overdue
    priority = Column(String(50), default="high")  # critical, high, medium, low
    assigned_to = Column(String(255), nullable=True)
    reminder_days_before = Column(Integer, default=7)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="compliance_events")


class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"), nullable=False)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=True)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_to_name = Column(String(255), nullable=True)
    deadline = Column(Date, nullable=False)
    priority = Column(String(50), default="high")
    status = Column(String(50), default="pending")  # pending, in_progress, escalated, completed
    is_escalated = Column(Boolean, default=False)
    escalation_reason = Column(Text, nullable=True)
    closure_evidence = Column(Text, nullable=True)
    closed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="corrective_actions")
    inspection = relationship("Inspection", back_populates="corrective_actions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user_name = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action_type = Column(String(100), nullable=False)  # CREATE, UPDATE, UPLOAD_OCR, ASSIGN_ACTION, RESOLVE_ALERT, CLOSE_ACTION, ESCALATE
    entity_type = Column(String(100), nullable=False)  # inspection, alert, corrective_action, compliance, mine
    entity_id = Column(String(255), nullable=True)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
