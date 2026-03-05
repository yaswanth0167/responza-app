from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.db import insurance_collection
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/insurance", tags=["Insurance"])

class InsuranceModel(BaseModel):
    provider: str
    policy_number: str
    coverage_amount: float


# =========================
# Add Insurance
# =========================
@router.post("/add")
async def add_insurance(
    data: InsuranceModel,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    user_email = current_user["email"]

    insurance_collection.insert_one({
        "user_id": user_id,
        "email": user_email,
        "provider": data.provider,
        "policy_number": data.policy_number,
        "coverage_amount": data.coverage_amount,
        "created_at": datetime.utcnow()
    })

    return {"message": "Insurance added successfully"}


# =========================
# Get Insurance (Logged-in User Only)
# =========================
@router.get("/my")
async def get_my_insurance(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]

    data = list(
        insurance_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
    )

    return {"insurance": data}
