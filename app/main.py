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
from app.email_service import send_email
from app.expense import expense_router
from app.confirmation import confirmation_router


# =========================
# Load Environment
# =========================

load_dotenv()

logging.basicConfig(level=logging.INFO)


# =========================
# FastAPI App
# =========================

app = FastAPI(
    title="Responza API",
    description="AI Emergency Risk Intelligence Backend",
    version="1.0.0"
)


# =========================
# CORS Configuration
# =========================

frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8000",
]

# Add deployed frontend if exists
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*",
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

            pending = reminders_collection.find(
                {"sent": False, "send_at": {"$lte": now}}
            )

            for r in pending:

                try:

                    if r["type"] == "sms":
                        await send_sms(r["user_id"], r["message"])

                    else:
                        await send_email(r["user_id"], r["message"])

                    reminders_collection.update_one(
                        {"_id": r["_id"]},
                        {"$set": {"sent": True}}
                    )

                except Exception as e:
                    logging.error(f"Reminder failed {r['_id']} : {e}")

        except Exception as e:
            logging.error(f"Scheduler error: {e}")

        await asyncio.sleep(60)


# =========================
# Startup
# =========================

@app.on_event("startup")
async def startup_event():

    init_db()

    asyncio.create_task(reminder_scheduler())

    logging.info("Backend Started Successfully")
    logging.info(f"Frontend URL: {frontend_url}")


# =========================
# Routers
# =========================

app.include_router(auth_router, prefix="/auth", tags=["Auth"])

app.include_router(admin_router)

app.include_router(dashboard_router, prefix="/dashboard")

app.include_router(loan_router, prefix="/loans")

app.include_router(income_router, prefix="/income")

app.include_router(lending_router, prefix="/lending")

app.include_router(risk_router, prefix="/risk")

app.include_router(otp.router, prefix="/otp")

app.include_router(security.router, prefix="/security")

app.include_router(nominee.router, prefix="/nominee")

app.include_router(documents.router)

app.include_router(banking.router)

app.include_router(insurance.router)

app.include_router(health.router)

app.include_router(emergency.router)

app.include_router(reminder_router, prefix="/reminders")

app.include_router(expense_router, prefix="/expense")

app.include_router(confirmation_router, prefix="/monthly")


# =========================
# Static Files
# =========================

if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/files", StaticFiles(directory="uploads"), name="files")


# =========================
# Root Route
# =========================

@app.get("/")
async def root():

    return {
        "message": "Welcome to Responza API",
        "status": "Backend Running",
        "database": DB_NAME
    }


# =========================
# Health Check
# =========================

@app.get("/health")
async def health():

    return {
        "status": "OK",
        "service": "Responza Backend",
        "database": DB_NAME
    }