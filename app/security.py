from fastapi import APIRouter, HTTPException, Depends
from app.db import security_collection
from app.security_utils import encrypt_data, decrypt_data
from app.auth import get_current_user

router = APIRouter()


# ============================
# Add Security Questions
# ============================

@router.post("/add")
async def add_security(
    data: dict,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    if security_collection.find_one({"user_id": user_id}):
        raise HTTPException(status_code=400, detail="Security already added")

    security_collection.insert_one({
        "user_id": user_id,
        "favorite_color": encrypt_data(data["favorite_color"]),
        "favorite_place": encrypt_data(data["favorite_place"]),
        "father_name_answer": encrypt_data(data["father_name_answer"])
    })

    return {"message": "Security questions saved securely"}


# ============================
# Verify Security Questions
# ============================

@router.post("/verify")
async def verify_security(
    data: dict,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["_id"]

    record = security_collection.find_one({"user_id": user_id})

    if not record:
        raise HTTPException(status_code=400, detail="Security not found")

    if decrypt_data(record["favorite_color"]) != data["favorite_color"]:
        raise HTTPException(status_code=400, detail="Wrong favorite color")

    if decrypt_data(record["favorite_place"]) != data["favorite_place"]:
        raise HTTPException(status_code=400, detail="Wrong favorite place")

    if decrypt_data(record["father_name_answer"]) != data["father_name_answer"]:
        raise HTTPException(status_code=400, detail="Wrong father name")

    return {"message": "Security verified"}