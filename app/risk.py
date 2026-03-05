import pickle
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.db import income_collection, insurance_collection, loan_collection, risk_collection

risk_router = APIRouter()


class MLRiskInput(BaseModel):
    income: float = Field(..., ge=0)
    emi: float = Field(..., ge=0)
    expense: float = Field(..., ge=0)
    savings: float = Field(..., ge=0)
    emergency_fund: float = Field(..., ge=0)
    dependents: int = Field(0, ge=0)
    loans: int = Field(0, ge=0)
    insurance: int = Field(0, ge=0)


ML_ARTIFACT_DIR = Path(__file__).resolve().parent.parent
RISK_MODEL_PATH = ML_ARTIFACT_DIR / "risk_model.pkl"
KMEANS_MODEL_PATH = ML_ARTIFACT_DIR / "kmeans_model.pkl"
SCALER_PATH = ML_ARTIFACT_DIR / "scaler.pkl"

_ml_cache: Dict[str, Any] = {"loaded": False, "risk_model": None, "kmeans_model": None, "scaler": None, "error": None}


def _load_pickle(path: Path) -> Any:
    with path.open("rb") as f:
        return pickle.load(f)


def _load_ml_artifacts() -> None:
    if _ml_cache["loaded"]:
        return

    for required in (RISK_MODEL_PATH, KMEANS_MODEL_PATH, SCALER_PATH):
        if not required.exists():
            _ml_cache["error"] = f"Missing ML artifact: {required.name}"
            _ml_cache["loaded"] = True
            return

    try:
        _ml_cache["risk_model"] = _load_pickle(RISK_MODEL_PATH)
        _ml_cache["kmeans_model"] = _load_pickle(KMEANS_MODEL_PATH)
        _ml_cache["scaler"] = _load_pickle(SCALER_PATH)
    except Exception as exc:
        _ml_cache["error"] = str(exc)
    finally:
        _ml_cache["loaded"] = True


def _build_feature_row(payload: MLRiskInput) -> list:
    return [[
        payload.income,
        payload.emi,
        payload.expense,
        payload.savings,
        payload.emergency_fund,
        payload.dependents,
        payload.loans,
        payload.insurance,
    ]]


def _to_builtin(value: Any) -> Any:
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return value
    return value


def _run_ml_prediction(payload: MLRiskInput) -> Dict[str, Any]:
    _load_ml_artifacts()

    if _ml_cache["error"]:
        raise HTTPException(
            status_code=503,
            detail=f"ML models unavailable: {_ml_cache['error']}. Install dependencies and verify model files.",
        )

    scaler = _ml_cache["scaler"]
    risk_model = _ml_cache["risk_model"]
    kmeans_model = _ml_cache["kmeans_model"]

    row = _build_feature_row(payload)
    scaled = scaler.transform(row)

    risk_pred = risk_model.predict(scaled)[0]
    cluster_pred = kmeans_model.predict(scaled)[0]

    risk_proba = None
    if hasattr(risk_model, "predict_proba"):
        try:
            probs = risk_model.predict_proba(scaled)[0]
            risk_proba = [float(p) for p in probs]
        except Exception:
            risk_proba = None

    return {
        "risk_label": int(_to_builtin(risk_pred)),
        "risk_category": "High" if int(_to_builtin(risk_pred)) == 1 else "Low",
        "cluster": int(_to_builtin(cluster_pred)),
        "probabilities": risk_proba,
    }


@risk_router.post("/calculate")
async def calculate_risk(current_user: dict = Depends(get_current_user)):
    """
    Calculate user's financial risk score 
    based on income, expenses, loans, savings, and dependents.
    """

    # Fetch user financial data
    user = current_user

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get financial fields safely
    monthly_income = user.get("monthly_income", 0)
    monthly_expenses = user.get("monthly_expenses", 0)
    total_emi = user.get("total_emi", 0)
    savings = user.get("savings", 0)
    dependents = user.get("dependents", 0)

    if monthly_income <= 0:
        raise HTTPException(status_code=400, detail="Financial data incomplete")

    # Calculate Ratios
    debt_ratio = total_emi / monthly_income
    emergency_months = (
        savings / monthly_expenses if monthly_expenses > 0 else 0
    )

    # Risk Logic
    risk_score = 0

    # Debt Risk
    if debt_ratio > 0.5:
        risk_score += 40
    elif debt_ratio > 0.3:
        risk_score += 25

    # Emergency Fund Risk
    if emergency_months < 3:
        risk_score += 30
    elif emergency_months < 6:
        risk_score += 15

    # Dependents Risk
    if dependents > 2:
        risk_score += 15
    elif dependents > 0:
        risk_score += 5

    # Risk Category
    if risk_score >= 60:
        category = "High"
    elif risk_score >= 30:
        category = "Moderate"
    else:
        category = "Low"

    # Prepare risk data document
    risk_data = {
        "user_id": user["_id"],
        "email": user["email"],
        "risk_score": round(risk_score, 2),
        "risk_category": category,
        "debt_ratio": round(debt_ratio, 2),
        "emergency_months": round(emergency_months, 2),
        "dependents": dependents,
        "last_updated": datetime.utcnow()
    }

    # Save or update in DB (NO await because using pymongo)
    risk_collection.update_one(
        {"user_id": user["_id"]},
        {"$set": risk_data},
        upsert=True
    )

    return risk_data


@risk_router.get("/ml-status")
async def ml_status():
    _load_ml_artifacts()
    return {
        "loaded": _ml_cache["loaded"] and not _ml_cache["error"],
        "error": _ml_cache["error"],
        "artifacts": {
            "risk_model": str(RISK_MODEL_PATH),
            "kmeans_model": str(KMEANS_MODEL_PATH),
            "scaler": str(SCALER_PATH),
        },
    }


@risk_router.post("/ml-predict")
async def ml_predict(payload: MLRiskInput, current_user: dict = Depends(get_current_user)):
    prediction = _run_ml_prediction(payload)

    risk_collection.update_one(
        {"user_id": current_user["_id"]},
        {
            "$set": {
                "user_id": current_user["_id"],
                "email": current_user["email"],
                "risk_score": 100 if prediction["risk_label"] == 1 else 20,
                "risk_category": prediction["risk_category"],
                "ml_cluster": prediction["cluster"],
                "ml_probabilities": prediction["probabilities"],
                "ml_features": payload.dict(),
                "last_updated": datetime.utcnow(),
                "source": "ml_model",
            }
        },
        upsert=True,
    )

    return prediction


@risk_router.post("/ml-predict-me")
async def ml_predict_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]

    income_doc = income_collection.find_one({"user_id": user_id}) or {}
    loans = list(loan_collection.find({"user_id": user_id}))
    insurance_count = insurance_collection.count_documents({"user_id": user_id})

    monthly_income = float(income_doc.get("monthly_income", 0) or 0)
    other_income = float(income_doc.get("other_income", 0) or 0)
    monthly_expenses = float(income_doc.get("monthly_expenses", 0) or 0)
    savings = float(income_doc.get("current_savings", 0) or 0)
    emergency_fund = float(income_doc.get("emergency_fund", 0) or 0)
    dependents = int(income_doc.get("dependents", 0) or 0)

    if monthly_income <= 0 and other_income <= 0:
        raise HTTPException(status_code=400, detail="Income data missing. Add income details before ML prediction.")

    total_income = monthly_income + other_income
    total_emi = sum(float(loan.get("emi", 0) or 0) for loan in loans)

    payload = MLRiskInput(
        income=total_income,
        emi=total_emi,
        expense=monthly_expenses,
        savings=savings,
        emergency_fund=emergency_fund,
        dependents=dependents,
        loans=len(loans),
        insurance=insurance_count,
    )

    prediction = _run_ml_prediction(payload)

    risk_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "email": current_user["email"],
                "risk_score": 100 if prediction["risk_label"] == 1 else 20,
                "risk_category": prediction["risk_category"],
                "ml_cluster": prediction["cluster"],
                "ml_probabilities": prediction["probabilities"],
                "ml_features": payload.dict(),
                "last_updated": datetime.utcnow(),
                "source": "ml_model",
            }
        },
        upsert=True,
    )

    return prediction
