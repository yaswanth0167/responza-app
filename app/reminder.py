# app/reminder.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import reminders_collection, users_collection
from datetime import datetime
import asyncio
import logging
from bson import ObjectId
from app.otp import send_sms
from app.email_service import send_email  # async email sender

router = APIRouter()

# =========================
# Request Model
# =========================
class ReminderCreate(BaseModel):
    user_id: str
    message: str
    type: str  # "sms" or "email"
    send_at: datetime

# =========================
# API to Create Reminder
# =========================
@router.post("/create")
async def create_reminder(reminder: ReminderCreate):
    # Validate type
    if reminder.type not in ["sms", "email"]:
        raise HTTPException(status_code=400, detail="type must be 'sms' or 'email'")

    # Check if user exists
    user = None
    try:
        user = users_collection.find_one({"_id": ObjectId(reminder.user_id)})
    except Exception:
        user = users_collection.find_one({"_id": reminder.user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Insert reminder into DB
    reminder_data = reminder.dict()
    reminder_data["sent"] = False
    reminder_data["created_at"] = datetime.utcnow()
    reminders_collection.insert_one(reminder_data)

    logging.info(f"Reminder scheduled for user {reminder.user_id} at {reminder.send_at}")
    return {"message": "Reminder scheduled successfully"}

# =========================
# Background Reminder Scheduler
# =========================
