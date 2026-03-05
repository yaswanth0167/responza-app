from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.db import users_collection
from bson import ObjectId
from typing import List

admin_router = APIRouter(prefix="/admin", tags=["Admin"])


# ✅ Helper Function to Convert Mongo Document
def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "is_admin": user.get("is_admin", False)
    }


# ✅ Get All Users (Admin Only)
@admin_router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if not (current_user.get("is_admin", False) or current_user.get("role") == "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    users = list(users_collection.find({}))

    return {
        "total_users": len(users),
        "users": [serialize_user(user) for user in users]
    }


# ✅ Update User Role (Admin Only)
@admin_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    current_user: dict = Depends(get_current_user)
):
    if not (current_user.get("is_admin", False) or current_user.get("role") == "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        object_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = users_collection.update_one(
        {"_id": object_id},
        {"$set": {"role": role}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Role updated successfully"}
