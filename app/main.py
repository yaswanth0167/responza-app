from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import logging
import os

from app.db import init_db, reminders_collection, DB_NAME
from app.auth import auth_router
from app.admin import admin_router
from app.loan import loan_router
from app.income import income_router
from app.lending import lending_router
from app.risk import risk_router
from app import otp, security, nominee
from app import documents, banking, insurance, health
from app import emergency
from app.dashboard import dashboard_router
from app.reminder import router as reminder_router
from app.otp import send_sms
from app.email_service import send_email  # async email function
from app.expense import expense_router
from app.confirmation import confirmation_router

# Load env vars
load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)


def normalize_origin(url: str) -> str:
    return url.rstrip("/")

# =========================
# Create FastAPI App
# =========================
app = FastAPI(
    title="Responza API",
    description="AI Emergency Risk Intelligence Backend",
    version="1.0.0"
)

# =========================
# CORS Configuration
# =========================
frontend_url = normalize_origin(
    os.getenv("FRONTEND_URL")
    or os.getenv("LOVABLE_FRONTEND_URL")
    or "https://id-preview--1dc632eb-1214-4f8b-ac8d-82f7f14aa696.lovable.app"
)

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8000",
    frontend_url,
    "https://lovable.app",
    "https://beta.lovable.dev",
    "https://lovable.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://([a-z0-9-]+\.)*lovable\.(app|dev)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Reminder Scheduler
# =========================
async def reminder_scheduler():
    while True:
        try:
            now = datetime.utcnow()
            pending = reminders_collection.find({"sent": False, "send_at": {"$lte": now}})
            for r in pending:
                try:
                    if r["type"] == "sms":
                        await send_sms(r["user_id"], r["message"])
                    else:
                        await send_email(r["user_id"], r["message"])
                    reminders_collection.update_one({"_id": r["_id"]}, {"$set": {"sent": True}})
                except Exception as e:
                    logging.error(f"Failed to send reminder {r['_id']}: {e}")
        except Exception as e:
            logging.error(f"Reminder Scheduler Error: {e}")
        await asyncio.sleep(60)  # every minute

# =========================
# Startup Event
# =========================
@app.on_event("startup")
async def startup_event():
    init_db()
    asyncio.create_task(reminder_scheduler())
    logging.info(f"Frontend URL configured: {frontend_url}")
    logging.info("Backend started and reminder scheduler running...")

# =========================
# Include Routers
# =========================
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router)
app.include_router(loan_router, prefix="/loans", tags=["Loans"])
app.include_router(income_router, prefix="/income", tags=["Income"])
app.include_router(lending_router, prefix="/lending", tags=["Lending"])
app.include_router(risk_router, prefix="/risk", tags=["Risk"])
app.include_router(otp.router, prefix="/otp", tags=["OTP"])
app.include_router(security.router, prefix="/security", tags=["Security"])
app.include_router(nominee.router, prefix="/nominee", tags=["Nominee"])
app.include_router(documents.router)
app.include_router(banking.router)
app.include_router(insurance.router)
app.include_router(health.router)
app.include_router(emergency.router)
app.include_router(reminder_router, prefix="/reminders", tags=["Reminders"])
app.include_router(expense_router, prefix="/expense", tags=["Expense"])
app.include_router(confirmation_router, prefix="/monthly", tags=["Monthly Confirmation"])

# =========================
# Static Files
# =========================
app.mount("/files", StaticFiles(directory="uploads"), name="files")

# =========================
# Root & Health Routes
# =========================
@app.get("/")
async def root():
    return {
        "message": "Welcome to Responza API",
        "status": "Backend Running Successfully",
        "frontend_url": frontend_url,
        "database": DB_NAME
    }

@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "Responza Backend",
        "frontend_url": frontend_url,
        "database": DB_NAME
    }

#models.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from typing import Optional


# ==============================
# User Registration Model
# ==============================

class User(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    dob: str
    gender: str
    email: EmailStr
    mobile_number: str
    password: str = Field(..., min_length=6)

    class Config:
        from_attributes = True


# ==============================
# User Login Model
# ==============================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ==============================
# User Response Model
# (Used for returning user data safely)
# ==============================

class UserResponse(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    mobile_number: str
    created_at: Optional[datetime]


# ==============================
# Loan Model (Future Use)
# ==============================

class Loan(BaseModel):
    loan_type: str
    emi: float
    outstanding_amount: float
    interest_rate: float
    remaining_tenure: int
    due_date: Optional[datetime]


# ==============================
# Finance Model (For AI Risk Engine)
# ==============================

class Finance(BaseModel):
    monthly_income: float
    other_income: Optional[float] = 0
    monthly_expenses: float
    current_savings: float
    emergency_fund: Optional[float] = 0
    dependents: Optional[int] = 0

class IncomeData(BaseModel):
    monthly_income: float
    other_income: Optional[float] = 0
    monthly_expenses: float
    current_savings: float
    emergency_fund: float
    dependents: int
