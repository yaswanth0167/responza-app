from fastapi import APIRouter, Depends
from app.db import health_collection
from pydantic import BaseModel
from app.dependencies import require_role, get_current_user

router = APIRouter(prefix="/health", tags=["Health"])

class HealthModel(BaseModel):
    blood_group: str
    allergies: str
    medical_conditions: str


@router.post("/add", dependencies=[Depends(require_role("user"))])
async def add_health(
    data: HealthModel,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]

    health_collection.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, **data.dict()}},
        upsert=True
    )

    return {"message": "Health record saved"}

@router.get("/my", dependencies=[Depends(require_role("user"))])
async def get_health(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    data = health_collection.find_one({"user_id": user_id}, {"_id": 0})
    return {"health_record": data}
