from fastapi import APIRouter, HTTPException
from app.db import users_collection
from datetime import datetime, timedelta
from pydantic import BaseModel
import jwt
import os

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60  # 1 hour expiry

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY not set in environment variables")

# =========================
# Request Model
# =========================
class NomineeLoginModel(BaseModel):
    mobile_number: str
    dob: str
    father_name: str = ""


def normalize_mobile(value: str) -> str:
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if str(value).startswith("+"):
        return str(value).strip()
    return f"+{digits}" if digits else str(value).strip()


def mobile_candidates(value: str) -> list[str]:
    raw = str(value).strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    out = {raw}
    if digits:
        out.add(digits)
        if len(digits) == 10:
            out.add(f"+91{digits}")
            out.add(f"91{digits}")
        if len(digits) == 12 and digits.startswith("91"):
            out.add(f"+{digits}")
            out.add(digits[2:])
    return [x for x in out if x]

# =========================
# Nominee Login
# =========================
@router.post("/login")
async def nominee_login(data: NomineeLoginModel):
    normalized_mobile = normalize_mobile(data.mobile_number)
    mobile_values = mobile_candidates(data.mobile_number)
    if normalized_mobile not in mobile_values:
        mobile_values.append(normalized_mobile)
    father = (data.father_name or "").strip().lower()

    # Path 1: main user details
    user = users_collection.find_one({
        "mobile_number": {"$in": mobile_values},
        "dob": data.dob,
    })

    if user and father:
        stored_father = str(user.get("father_name", "")).strip().lower()
        # Backward compatible: for old users father_name may be missing in DB.
        if stored_father and stored_father != father:
            user = None

    # Path 2: nominee contact-based fallback
    if not user:
        user = users_collection.find_one({
            "nominee.contactNumber": {"$in": mobile_values},
            "dob": data.dob,
        })

    if not user:
        raise HTTPException(status_code=401, detail="Invalid details")

    # Create token with expiry
    payload = {
        "sub": user["email"],
        "role": "nominee",
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "message": "Nominee login successful",
        "access_token": token,
        "token_type": "bearer"
    }
