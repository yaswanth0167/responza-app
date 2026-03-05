from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.db import expense_collection
from datetime import datetime

expense_router = APIRouter()

@expense_router.post("/add")
async def add_expense(
    data: dict,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    month = data.get("month")
    year = data.get("year")
    categories = data.get("categories", {})

    if not month or not year:
        return {"status": "error", "message": "Month and Year required"}

    if not isinstance(categories, dict):
        return {"status": "error", "message": "Categories must be dictionary"}

    total_expense = sum(categories.values())

    expense_data = {
        "user_id": user_id,   # ✅ changed from email
        "month": month,
        "year": year,
        "categories": categories,
        "total_expense": total_expense,
        "created_at": datetime.utcnow()
    }

    # Upsert → if month exists update, else create
    expense_collection.update_one(
        {
            "user_id": user_id,  # ✅ changed
            "month": month,
            "year": year
        },
        {"$set": expense_data},
        upsert=True
    )

    return {
        "status": "success",
        "message": "Expense saved successfully",
        "total_expense": total_expense
    }