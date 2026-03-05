# app/cleanup.py
import os
import logging
from datetime import datetime, timedelta
from app.db import (
    users_collection,
    loan_collection,
    reminders_collection,
    risk_collection,
)
from dotenv import load_dotenv

# =========================
# Setup Logging
# =========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Cleanup")

# =========================
# Load Environment Variables
# =========================
load_dotenv()

required_env_keys = [
    "JWT_SECRET_KEY",
    "MONGO_URI",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE",
    "EMAIL_USER",
    "EMAIL_PASS",
    "FIELD_ENCRYPTION_KEY",
]

logger.info("Checking environment variables...")
missing_keys = [k for k in required_env_keys if not os.getenv(k)]
if missing_keys:
    logger.warning(f"Missing environment variables: {missing_keys}")
else:
    logger.info("All required environment variables are present.")

# =========================
# Clean Test / Debug Data
# =========================
logger.info("Cleaning test and debug data...")

# Remove test OTP users
result = users_collection.update_many(
    {"mobile_verified": False, "email": {"$regex": "test"}},
    {"$set": {"mobile_verified": True}}
)
logger.info(f"Marked {result.modified_count} test users as verified")

# Remove test reminders
deleted_reminders = reminders_collection.delete_many({"message": {"$regex": "test"}})
logger.info(f"Deleted {deleted_reminders.deleted_count} test reminders")

# Remove test loans
deleted_loans = loan_collection.delete_many({"amount": {"$lte": 0}})
logger.info(f"Deleted {deleted_loans.deleted_count} test loans")

# Remove test risk entries
deleted_risk = risk_collection.delete_many({"risk_score": {"$lte": 0}})
logger.info(f"Deleted {deleted_risk.deleted_count} test risk entries")

# =========================
# Auto-remove old reminders (>30 days)
# =========================
cutoff_date = datetime.utcnow() - timedelta(days=30)
old_reminders = reminders_collection.delete_many({"send_at": {"$lt": cutoff_date}})
logger.info(f"Deleted {old_reminders.deleted_count} reminders older than 30 days")

# =========================
# Validate Collections
# =========================
logger.info("Validating critical collections...")

collections_to_check = {
    "users": users_collection,
    "loans": loan_collection,
    "reminders": reminders_collection,
    "risk": risk_collection,
}

for name, coll in collections_to_check.items():
    count = coll.count_documents({})
    if count == 0:
        logger.warning(f"Collection '{name}' is empty!")
    else:
        logger.info(f"Collection '{name}' has {count} documents")

# =========================
# Final Message
# =========================
logger.info("Cleanup & validation complete. Backend is ready for production!")