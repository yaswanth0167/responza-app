from pydantic import BaseModel
from datetime import date

class Loan(BaseModel):
    loan_type: str
    emi: float
    outstanding_amount: float
    interest_rate: float
    remaining_tenure: int
    due_date: date