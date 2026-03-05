from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId

from app.db import loan_collection
from app.loan_model import Loan
from app.auth import get_current_user

loan_router = APIRouter()

# ============================
# Add Loan
# ============================

@loan_router.post("/add")
async def add_loan(
    loan: Loan,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    loan_dict = loan.dict()
    # Mongo/BSON cannot directly store datetime.date objects.
    loan_dict["due_date"] = loan.due_date.isoformat()
    loan_dict["user_id"] = user_id
    loan_dict["created_at"] = datetime.utcnow()

    result = loan_collection.insert_one(loan_dict)

    return {
        "message": "Loan added successfully",
        "loan_id": str(result.inserted_id)
    }


# ============================
# Get My Loans
# ============================

@loan_router.get("/my-loans")
async def get_loans(
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    loans = list(loan_collection.find({"user_id": user_id}))

    for loan in loans:
        loan["_id"] = str(loan["_id"])

    return loans


# ============================
# Delete Loan
# ============================

@loan_router.delete("/delete/{loan_id}")
async def delete_loan(
    loan_id: str,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    result = loan_collection.delete_one({
        "_id": ObjectId(loan_id),
        "user_id": user_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loan not found")

    return {"message": "Loan deleted successfully"}
