from fastapi import APIRouter, Depends, HTTPException
from app.db import bank_collection
from pydantic import BaseModel
from app.security_utils import encrypt_data, decrypt_data
from app.dependencies import require_role, get_current_user

router = APIRouter(prefix="/bank", tags=["Banking"])

class BankModel(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str


# 🔐 ADD BANK DETAILS (Encrypted)
@router.post("/add", dependencies=[Depends(require_role("user"))])
async def add_bank(
    data: BankModel,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]

    encrypted_account = encrypt_data(data.account_number)
    encrypted_ifsc = encrypt_data(data.ifsc_code)

    bank_collection.insert_one({
        "user_id": user_id,
        "bank_name": data.bank_name,
        "account_number": encrypted_account,
        "ifsc_code": encrypted_ifsc
    })

    return {"message": "Bank details encrypted & saved securely"}


# 🔓 GET BANK DETAILS (Decrypt while fetching)
@router.get("/user/{user_id}", dependencies=[Depends(require_role("user"))])
async def get_bank(user_id: str):

    records = list(bank_collection.find({"user_id": user_id}))

    if not records:
        raise HTTPException(status_code=404, detail="No bank details found")

    result = []

    for record in records:
        result.append({
            "user_id": record["user_id"],
            "bank_name": record["bank_name"],
            "account_number": decrypt_data(record["account_number"]),
            "ifsc_code": decrypt_data(record["ifsc_code"])
        })

    return {"bank_details": result}
