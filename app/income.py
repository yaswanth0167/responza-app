from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.models import IncomeData
from app.db import income_collection
from app.auth import get_current_user

income_router = APIRouter()

# ==============================
# Add / Update Income
# ==============================

@income_router.post("/update")
async def update_income(
    data: IncomeData,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    existing = income_collection.find_one({"user_id": user_id})

    income_dict = data.dict()
    income_dict["user_id"] = user_id
    income_dict["updated_at"] = datetime.utcnow()

    if existing:
        income_collection.update_one(
            {"user_id": user_id},
            {"$set": income_dict}
        )
        return {"message": "Income data updated successfully"}
    else:
        income_collection.insert_one(income_dict)
        return {"message": "Income data added successfully"}


# ==============================
# Get Income
# ==============================

@income_router.get("/me")
async def get_income(
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    data = income_collection.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )

    if not data:
        raise HTTPException(status_code=404, detail="Income data not found")

    return data


# ==============================
# Delete Income
# ==============================

@income_router.delete("/delete")
async def delete_income(
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    result = income_collection.delete_one({"user_id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No income data found")

    return {"message": "Income data deleted successfully"}