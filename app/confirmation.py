from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.db import monthly_confirmation_collection
from datetime import datetime

confirmation_router = APIRouter()

@confirmation_router.post("/confirm")
async def confirm_month(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    monthly_confirmation_collection.update_one(
        {
            "user_id": user_id,   # ✅ changed from email
            "month": month,
            "year": year
        },
        {
            "$set": {
                "financial_data_confirmed": True,
                "confirmed_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return {"message": "Financial data confirmed"}