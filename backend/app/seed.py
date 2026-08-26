import uuid
import random
from datetime import datetime, timedelta
from app.database import engine, SessionLocal, Base
from app.auth import get_password_hash
from app.models import User, Mine, Inspection, Observation, Alert


def seed_data():
    """Seed the database with demo data for SIH presentation."""
    # 1. Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 2. Check if data exists
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        print("🌱 Seeding database...")

        # 3. Create users
        admin_id = uuid.uuid4()
        officer_id = uuid.uuid4()

        admin_user = User(
            id=admin_id,
            email="admin@mineguard.com",
            password_hash=get_password_hash("admin123"),
            full_name="Rajesh Kumar",
            role="admin",
        )

        officer_user = User(
            id=officer_id,
            email="officer@mineguard.com",
            password_hash=get_password_hash("officer123"),
            full_name="Priya Sharma",
            role="officer",
        )

        db.add_all([admin_user, officer_user])

        # 4. Create mines
        mine1_id = uuid.uuid4()
        mine2_id = uuid.uuid4()
        mine3_id = uuid.uuid4()

        mine1 = Mine(
            id=mine1_id,
            name="Jharia Coal Mine",
            location="Jharia, Dhanbad",
            latitude=23.7465,
            longitude=86.4142,
            state="Jharkhand",
            mine_type="underground",
            status="active",
            compliance_score=78.5,
        )

        mine2 = Mine(
            id=mine2_id,
            name="Talcher Coal Mine",
            location="Talcher, Angul",
            latitude=20.9517,
            longitude=85.2297,
            state="Odisha",
            mine_type="opencast",
            status="active",
            compliance_score=85.2,
        )

        mine3 = Mine(
            id=mine3_id,
            name="Korba Coal Mine",
            location="Korba",
            latitude=22.3595,
            longitude=82.7501,
            state="Chhattisgarh",
            mine_type="opencast",
            status="active",
            compliance_score=62.0,
        )

        db.add_all([mine1, mine2, mine3])

        # 5. Assign officer to mine 1
        officer_user.assigned_mine_id = mine1_id

        # 6. Create 10 sample inspections
        mine_ids = [mine1_id, mine2_id, mine3_id]

        inspection_data = [
            {"type": "safety", "title": "Underground Ventilation Check", "description": "Ventilation shaft in Zone B showing reduced airflow. Methane buildup risk detected near coal face.", "ai_category": "safety_hazard", "ai_severity": "high", "ai_risk_score": 82.5},
            {"type": "safety", "title": "Roof Support Inspection", "description": "Multiple roof bolts missing in Gallery 4. Timber supports showing signs of decay and cracking.", "ai_category": "safety_hazard", "ai_severity": "critical", "ai_risk_score": 91.0},
            {"type": "environment", "title": "Dust Level Assessment", "description": "Coal dust concentration exceeding permissible limits near crusher area. Water sprinkler system partially non-functional.", "ai_category": "environmental", "ai_severity": "high", "ai_risk_score": 75.3},
            {"type": "equipment", "title": "Conveyor Belt Inspection", "description": "Main conveyor belt showing signs of wear. Belt alignment off by 3 inches. Emergency stop buttons tested and functional.", "ai_category": "equipment_failure", "ai_severity": "medium", "ai_risk_score": 55.0},
            {"type": "safety", "title": "Emergency Exit Route Check", "description": "Emergency exit signage in Section C faded and not clearly visible. Fire extinguishers last serviced 8 months ago.", "ai_category": "safety_hazard", "ai_severity": "medium", "ai_risk_score": 60.2},
            {"type": "environment", "title": "Water Drainage Inspection", "description": "Drainage pumps in lower gallery operating at 60% capacity. Water accumulation observed at sump area.", "ai_category": "environmental", "ai_severity": "medium", "ai_risk_score": 52.8},
            {"type": "equipment", "title": "Heavy Machinery Check", "description": "Hydraulic excavator HE-03 leaking hydraulic fluid. Braking system on dump truck DT-07 requires immediate attention.", "ai_category": "equipment_failure", "ai_severity": "high", "ai_risk_score": 78.0},
            {"type": "safety", "title": "Gas Detection System Audit", "description": "3 out of 12 methane sensors showing calibration drift. Last calibration done 45 days ago, exceeding 30-day protocol.", "ai_category": "safety_hazard", "ai_severity": "critical", "ai_risk_score": 88.5},
            {"type": "environment", "title": "Noise Level Survey", "description": "Noise levels at blasting site exceeding 115 dB. Workers in adjacent zone without proper ear protection.", "ai_category": "environmental", "ai_severity": "medium", "ai_risk_score": 48.0},
            {"type": "equipment", "title": "Electrical System Inspection", "description": "Electrical panel EP-05 showing signs of overheating. Cable insulation damaged in two locations near water seepage area.", "ai_category": "equipment_failure", "ai_severity": "high", "ai_risk_score": 73.5},
        ]

        inspections = []
        for i, data in enumerate(inspection_data):
            ins = Inspection(
                id=uuid.uuid4(),
                mine_id=mine_ids[i % 3],
                inspector_id=officer_id,
                type=data["type"],
                title=data["title"],
                description=data["description"],
                latitude=mine1.latitude + random.uniform(-0.01, 0.01),
                longitude=mine1.longitude + random.uniform(-0.01, 0.01),
                ai_category=data["ai_category"],
                ai_severity=data["ai_severity"],
                ai_risk_score=data["ai_risk_score"],
                ai_recommended_actions="1. Immediately address the identified issue\n2. Deploy inspection team for detailed assessment\n3. File report with DGMS as per regulation",
                status="submitted" if i < 7 else "reviewed",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            )
            inspections.append(ins)

        db.add_all(inspections)

        # 7. Create 5 sample alerts
        alert_data = [
            {"type": "high_methane", "severity": "critical", "title": "High Methane Level Detected", "message": "Methane concentration at 2.8% in Gallery 4, Zone B. Exceeds safe limit of 1.5%. Immediate evacuation recommended."},
            {"type": "safety_violation", "severity": "high", "title": "Missing Safety Equipment", "message": "Workers in Section C reported without self-rescue devices. Violation of DGMS Safety Regulation 2017 Clause 15."},
            {"type": "equipment_failure", "severity": "high", "title": "Conveyor Belt Breakdown", "message": "Main conveyor belt CB-02 stopped due to motor overheating. Production halted in Zone A."},
            {"type": "overdue_compliance", "severity": "medium", "title": "Overdue Safety Audit", "message": "Quarterly safety audit for Jharia Coal Mine overdue by 15 days. DGMS compliance deadline exceeded."},
            {"type": "safety_violation", "severity": "critical", "title": "Roof Fall Warning", "message": "Geological survey indicates unstable roof conditions in newly excavated Gallery 6. Support installation incomplete."},
        ]

        alerts = []
        for i, data in enumerate(alert_data):
            alert = Alert(
                id=uuid.uuid4(),
                mine_id=mine_ids[i % 3],
                type=data["type"],
                severity=data["severity"],
                title=data["title"],
                message=data["message"],
                status="active" if i < 3 else "resolved",
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
            )
            alerts.append(alert)

        db.add_all(alerts)
        db.commit()

        print(f"✅ Seeded 2 users (admin@mineguard.com / officer@mineguard.com)")
        print(f"✅ Seeded 3 mines (Jharia, Talcher, Korba)")
        print(f"✅ Seeded 10 inspections with AI analysis results")
        print(f"✅ Seeded 5 alerts")
        print(f"\n🔑 Login credentials:")
        print(f"   Admin:   admin@mineguard.com / admin123")
        print(f"   Officer: officer@mineguard.com / officer123")

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
