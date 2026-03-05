from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
from app.db import (
    users_collection,
    loan_collection,
    income_collection,
    insurance_collection,
    risk_collection,
    documents_collection,
    emergency_collection,
    expense_collection,
    lending_collection
)
from datetime import datetime

dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@dashboard_router.get("/summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):

    # -------------------------
    # GET USER
    # -------------------------
    user_id = current_user["_id"]
    user_email = current_user["email"]
    user = users_collection.find_one({"_id": current_user["_id"]}) or current_user

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # -------------------------
    # BASIC COUNTS (STANDARDIZED USING user_id)
    # -------------------------

    total_loans = loan_collection.count_documents({"user_id": user_id})

    active_loans = loan_collection.count_documents({
        "user_id": user_id,
        "status": "active"
    })

    total_income_records = income_collection.count_documents({"user_id": user_id})
    total_insurance = insurance_collection.count_documents({"user_id": user_id})
    total_documents = documents_collection.count_documents({"user_id": user_id})
    total_emergencies = emergency_collection.count_documents({"user_id": user_id})

    # -------------------------
    # LATEST RISK SCORE
    # -------------------------

    latest_risk = risk_collection.find_one(
        {"email": user_email},
        sort=[("last_updated", -1)]
    )

    risk_score = latest_risk["risk_score"] if latest_risk else 0

    # -------------------------
    # EXPENSE TREND
    # -------------------------

    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year

    current_expense = expense_collection.find_one({
        "user_id": user_id,
        "month": current_month,
        "year": current_year
    })

    # Previous month calculation
    if current_month == 1:
        prev_month = 12
        prev_year = current_year - 1
    else:
        prev_month = current_month - 1
        prev_year = current_year

    previous_expense = expense_collection.find_one({
        "user_id": user_id,
        "month": prev_month,
        "year": prev_year
    })

    trend = "No Data"

    if current_expense and previous_expense:
        current_total = current_expense.get("total_expense", 0)
        previous_total = previous_expense.get("total_expense", 0)

        if current_total > previous_total:
            trend = "Increased 📈"
        elif current_total < previous_total:
            trend = "Decreased 📉"
        else:
            trend = "No Change"

    # -------------------------
    # SURVIVAL MONTHS
    # -------------------------

    latest_income = income_collection.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )

    survival_months = 0
    emergency_zone = "No Data"

    if latest_income and current_expense:

        savings = latest_income.get("savings", 0)
        total_expense = current_expense.get("total_expense", 0)

        if total_expense > 0:
            survival_months = round(savings / total_expense, 1)

        if survival_months < 3:
            emergency_zone = "🔴 Danger"
        elif 3 <= survival_months <= 6:
            emergency_zone = "🟡 Moderate"
        else:
            emergency_zone = "🟢 Stable"

    # -------------------------
    # FINANCIAL HEALTH SCORE
    # -------------------------

    financial_health_score = 100

    if survival_months < 3:
        financial_health_score -= 40
    elif 3 <= survival_months <= 6:
        financial_health_score -= 20

    if trend == "Increased 📈":
        financial_health_score -= 15

    if active_loans > 2:
        financial_health_score -= 20

    financial_health_score = max(financial_health_score, 0)

    if financial_health_score >= 75:
        health_status = "🟢 Excellent"
    elif 50 <= financial_health_score < 75:
        health_status = "🟡 Good"
    elif 30 <= financial_health_score < 50:
        health_status = "🟠 Risky"
    else:
        health_status = "🔴 Critical"

    # -------------------------
    # UNTRACKED MONEY LOGIC
    # -------------------------

    income_total = sum(
        i.get("amount", 0)
        for i in income_collection.find({"user_id": user_id})
    )

    expense_total = sum(
        e.get("total_expense", 0)
        for e in expense_collection.find({"user_id": user_id})
    )

    given_total = sum(
        l.get("amount", 0)
        for l in lending_collection.find(
            {"user_id": user_id, "type": "given", "status": "pending"}
        )
    )

    taken_total = sum(
        l.get("amount", 0)
        for l in lending_collection.find(
            {"user_id": user_id, "type": "taken", "status": "pending"}
        )
    )

    expected_balance = income_total - expense_total - given_total + taken_total

    actual_savings = user.get("savings", 0)

    untracked_amount = round(expected_balance - actual_savings, 2)

    # -------------------------
    # FINAL RESPONSE
    # -------------------------

    return {
        "status": "success",
        "data": {
            "total_loans": total_loans,
            "active_loans": active_loans,
            "income_records": total_income_records,
            "insurance_count": total_insurance,
            "documents_count": total_documents,
            "total_emergencies": total_emergencies,
            "latest_risk_score": risk_score,
            "expense_trend": trend,
            "survival_months": survival_months,
            "emergency_zone": emergency_zone,
            "financial_health_score": financial_health_score,
            "health_status": health_status,
            "untracked_amount": untracked_amount,
            "generated_at": datetime.utcnow()
        }
    }
