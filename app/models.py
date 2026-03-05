from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from typing import Optional


# ==============================
# User Registration Model
# ==============================

class User(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    dob: str
    gender: str
    email: EmailStr
    mobile_number: str
    password: str = Field(..., min_length=6)

    class Config:
        from_attributes = True


# ==============================
# User Login Model
# ==============================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ==============================
# User Response Model
# (Used for returning user data safely)
# ==============================

class UserResponse(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    mobile_number: str
    created_at: Optional[datetime]


# ==============================
# Loan Model (Future Use)
# ==============================

class Loan(BaseModel):
    loan_type: str
    emi: float
    outstanding_amount: float
    interest_rate: float
    remaining_tenure: int
    due_date: Optional[datetime]


# ==============================
# Finance Model (For AI Risk Engine)
# ==============================

class Finance(BaseModel):
    monthly_income: float
    other_income: Optional[float] = 0
    monthly_expenses: float
    current_savings: float
    emergency_fund: Optional[float] = 0
    dependents: Optional[int] = 0

class IncomeData(BaseModel):
    monthly_income: float
    other_income: Optional[float] = 0
    monthly_expenses: float
    current_savings: float
    emergency_fund: float
    dependents: int
