from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from bson import ObjectId, errors as bson_errors

from app.notification_service import send_sms, send_email
from app.db import emergency_collection
from app.dependencies import require_role, get_current_user

router = APIRouter(prefix="/emergency", tags=["Emergency"])


# =========================
# Emergency Types
# =========================

class EmergencyType(str, Enum):
    medical = "Medical"
    accident = "Accident"
    financial = "Financial"
    threat = "Threat"


# =========================
# Request Model
# =========================

class EmergencyRequest(BaseModel):
    location: str
    emergency_type: EmergencyType


# =========================
# Trigger Emergency
# =========================

@router.post("/trigger", dependencies=[Depends(require_role("user"))])
async def trigger_emergency(
    data: EmergencyRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):

    user_id = str(current_user["_id"])

    # Save emergency
    emergency_id = emergency_collection.insert_one({
        "user_id": user_id,
        "location": data.location,
        "type": data.emergency_type.value,
        "status": "ACTIVE",
        "created_at": datetime.utcnow()
    }).inserted_id

    message = (
        f"🚨 {data.emergency_type.value.upper()} EMERGENCY 🚨\n\n"
        f"User: {current_user.get('name')}\n"
        f"Location: {data.location}\n\n"
        "Immediate assistance required."
    )

    nominee_phone = current_user.get("nominee_phone")
    nominee_email = current_user.get("nominee_email")

    if nominee_phone:
        background_tasks.add_task(send_sms, nominee_phone, message)

    if nominee_email:
        background_tasks.add_task(
            send_email,
            nominee_email,
            f"{data.emergency_type.value} Emergency Alert 🚨",
            message
        )

    return {
        "message": f"{data.emergency_type.value} emergency triggered successfully",
        "emergency_id": str(emergency_id),
        "status": "ACTIVE"
    }


# =========================
# Get Emergency History
# =========================

@router.get("/history", dependencies=[Depends(require_role("user"))])
async def get_emergency_history(
    current_user: dict = Depends(get_current_user)
):

    user_id = str(current_user["_id"])

    emergencies = list(
        emergency_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
    )

    return {
        "total_records": len(emergencies),
        "emergencies": emergencies
    }


# =========================
# Close Emergency
# =========================

@router.put("/close/{emergency_id}", dependencies=[Depends(require_role("user"))])
async def close_emergency(
    emergency_id: str,
    current_user: dict = Depends(get_current_user)
):

    user_id = str(current_user["_id"])

    # Safe ObjectId conversion
    try:
        obj_id = ObjectId(emergency_id)
    except bson_errors.InvalidId:
        raise HTTPException(
            status_code=400,
            detail="Invalid emergency ID"
        )

    result = emergency_collection.update_one(
        {
            "_id": obj_id,
            "user_id": user_id
        },
        {
            "$set": {
                "status": "CLOSED",
                "closed_at": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency not found or already closed"
        )

    return {
        "message": "Emergency closed successfully",
        "status": "CLOSED"
    }