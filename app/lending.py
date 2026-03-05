from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.db import lending_collection
from datetime import datetime
from pydantic import BaseModel

lending_router = APIRouter()

class LendingModel(BaseModel):
    type: str  # "given" or "taken"
    amount: float
    person: str
    expected_return_date: str


# ============================
# Add Lending
# ============================

@lending_router.post("/add")
async def add_lending(
    data: LendingModel,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    lending_collection.insert_one({
        "user_id": user_id,   # ✅ changed
        "type": data.type,
        "amount": data.amount,
        "person": data.person,
        "expected_return_date": data.expected_return_date,
        "status": "pending",
        "created_at": datetime.utcnow()
    })

    return {"message": "Lending record added successfully"}


# ============================
# Get All Lending
# ============================

@lending_router.get("/all")
async def get_lending(
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    records = list(
        lending_collection.find(
            {"user_id": user_id},   # ✅ changed
            {"_id": 0}
        )
    )

    return records


# ============================
# Mark Returned
# ============================

@lending_router.put("/mark-returned/{person}")
async def mark_returned(
    person: str,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    lending_collection.update_one(
        {"user_id": user_id, "person": person},  # ✅ changed
        {"$set": {"status": "returned"}}
    )

    return {"message": "Marked as returned"}