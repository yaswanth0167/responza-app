from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from app.auth import get_current_user as auth_get_current_user

security = HTTPBearer()

def get_current_user(user=Depends(auth_get_current_user)):
    return user

def require_role(required_role: str):
    def role_checker(user=Depends(get_current_user)):
        if user.get("role") != required_role:
            raise HTTPException(status_code=403, detail="Access denied")
        return user
    return role_checker
