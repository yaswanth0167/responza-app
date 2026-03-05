import os
import re
import uuid
from jose import JWTError, jwt
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field

from app.db import users_collection, security_collection, DB_NAME

# ==============================
# LOAD ENV VARIABLES
# ==============================
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ==============================
# PASSWORD HASHING
# ==============================
# using bcrypt library directly to avoid passlib wrap-bug detection issues
import bcrypt


def normalize_email(email: str) -> str:
    return str(email).strip().lower()


def email_query(email: str) -> dict:
    return {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}


def username_query(username: str) -> dict:
    return {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}

def hash_password(password: str):
    # bcrypt limits to 72 bytes; ensure string is encoded to utf-8
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

# ==============================
# JWT TOKEN FUNCTIONS
# ==============================
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

# ==============================
# REQUEST MODELS
# ==============================

class RegisterUser(BaseModel):
    first_name: str
    last_name: str
    dob: str = ""
    gender: str = ""
    address: str = ""
    email: EmailStr
    mobile_number: str = ""
    username: str = ""
    password: str
    preferred_language: str = "English"
    father_name: str = ""
    favourite_colour: str = ""
    favourite_place: str = ""
    nominee: dict = Field(default_factory=dict)


class LoginUser(BaseModel):
    email: str
    password: str


# ==============================
# AUTH ROUTER
# ==============================
auth_router = APIRouter()
security = HTTPBearer()

# ==============================
# REGISTER USER
# ==============================
@auth_router.post("/register")
async def register(user: RegisterUser):
    normalized_email = normalize_email(user.email)
    username = user.username.strip()
    if not username:
        base = normalized_email.split("@")[0]
        username = f"{base}_{uuid.uuid4().hex[:6]}"
    mobile_number = user.mobile_number.strip()

    if users_collection.find_one(email_query(normalized_email)):
        raise HTTPException(status_code=400, detail="Email already registered")

    if users_collection.find_one({"username": username}):
        username = f"{username}_{uuid.uuid4().hex[:4]}"

    if mobile_number and users_collection.find_one({"mobile_number": mobile_number}):
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    hashed_password = hash_password(user.password)

    user_data = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "dob": user.dob,
        "gender": user.gender,
        "address": user.address,
        "email": normalized_email,
        "mobile_number": mobile_number,
        "username": username,
        "password": hashed_password,
        "preferred_language": user.preferred_language,
        "father_name": user.father_name,
        "favourite_colour": user.favourite_colour,
        "favourite_place": user.favourite_place,
        "nominee": user.nominee or {},
        "role": "user",
        "mobile_verified": False,
        "created_at": datetime.utcnow()
    }

    result = users_collection.insert_one(user_data)
    if not result.acknowledged:
        raise HTTPException(status_code=500, detail="User registration write not acknowledged")

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id),
        "database": DB_NAME
    }


# ==============================
# LOGIN USER
# ==============================
@auth_router.post("/login")
async def login(user: LoginUser):
    identifier = str(user.email).strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or username is required")

    db_user = None

    # If identifier looks like an email, search by email first.
    if "@" in identifier:
        normalized_email = normalize_email(identifier)
        db_user = users_collection.find_one(email_query(normalized_email))
    else:
        # Support login with username (case-insensitive).
        db_user = users_collection.find_one(username_query(identifier))
        # Fallback: in case user entered email without @ by mistake, try normalized query too.
        if not db_user:
            db_user = users_collection.find_one(email_query(normalize_email(identifier)))

    stored_password = db_user.get("password") if db_user else None

    # Backward compatibility for accounts created with "password_hash".
    if not stored_password and db_user:
        stored_password = db_user.get("password_hash")

    if not db_user or not stored_password or not verify_password(user.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    subject_email = normalize_email(db_user["email"])

    access_token = create_access_token(
        data={
            "sub": subject_email,
            "role": db_user["role"]
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ==============================
# ADMIN CHECK DEPENDENCY
# ==============================
def admin_required(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = verify_token(token)

    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return payload


@auth_router.get("/admin-only")
async def admin_route(user=Depends(admin_required)):
    return {"message": "Welcome Admin 🔥"}


# ==============================
# GET CURRENT USER (IMPORTANT FIX)
# ==============================
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = verify_token(token)

    db_user = users_collection.find_one(email_query(payload["sub"]))

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 🔥 RETURN FULL USER INCLUDING _id
    db_user["_id"] = str(db_user["_id"])
    return db_user


# ==============================
# GET PROFILE
# ==============================
@auth_router.get("/me")
async def get_profile(current_user: dict = Depends(get_current_user)):

    return {
        "user_id": str(current_user["_id"]),
        "email": current_user["email"],
        "username": current_user["username"],
        "first_name": current_user["first_name"],
        "last_name": current_user["last_name"],
        "dob": current_user["dob"],
        "gender": current_user["gender"],
        "address": current_user["address"],
        "mobile_number": current_user["mobile_number"],
        "preferred_language": current_user["preferred_language"],
        "father_name": current_user.get("father_name", ""),
        "favourite_colour": current_user.get("favourite_colour", ""),
        "favourite_place": current_user.get("favourite_place", ""),
        "nominee": current_user.get("nominee", {})
    }


# ==============================
# FORGOT PASSWORD
# ==============================
@auth_router.post("/forgot-password")
async def forgot_password(
    email: str,
    favorite_color: str,
    favorite_place: str,
    father_name: str
):
    normalized_email = normalize_email(email)

    user = users_collection.find_one(email_query(normalized_email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    security_data = security_collection.find_one({
        "user_id": str(user["_id"]),
        "favorite_color": favorite_color,
        "favorite_place": favorite_place,
        "father_name_answer": father_name
    })

    if not security_data:
        raise HTTPException(status_code=400, detail="Security answers incorrect")

    return {"message": "Security verified. You can reset password now."}


# ==============================
# RESET PASSWORD
# ==============================
@auth_router.post("/reset-password")
async def reset_password(email: str, new_password: str):
    normalized_email = normalize_email(email)

    hashed = hash_password(new_password)

    users_collection.update_one(
        email_query(normalized_email),
        {"$set": {"password": hashed}}
    )

    return {"message": "Password updated successfully"}
