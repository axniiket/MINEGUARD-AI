import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth_router, mines_router, inspections_router, alerts_router, governance_router

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created & verified")
    yield
    print("👋 Shutting down")

app = FastAPI(
    title="MineGuard AI",
    description="AI-Based Smart Governance and Compliance Monitoring System for Coal Mines",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded inspection documents statically
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth_router.router)
app.include_router(mines_router.router)
app.include_router(inspections_router.router)
app.include_router(alerts_router.router)
app.include_router(governance_router.router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "MineGuard AI API", "version": "1.0.0"}
