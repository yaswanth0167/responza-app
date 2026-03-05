from pymongo import MongoClient
import os
import logging
from dotenv import load_dotenv

# ==========================
# Load Environment Variables
# ==========================
load_dotenv()

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://appresponza_db_user:9346724367@responza.frfxhhp.mongodb.net/?appName=Responza"
)

if not MONGO_URI:
    raise Exception("MONGO_URI not found in .env file")

# ==========================
# MongoDB Client
# ==========================
client = MongoClient(MONGO_URI)

# ==========================
# Databases
# ==========================
DB_NAME = os.getenv("MONGO_DB_NAME", "responza_db")
PRIMARY_DB_NAME = os.getenv("PRIMARY_MONGO_DB_NAME", DB_NAME)
SECONDARY_DB_NAME = os.getenv("SECONDARY_MONGO_DB_NAME")
MIRROR_WRITES = os.getenv("MIRROR_WRITES", "false").strip().lower() in {"1", "true", "yes", "on"}
READ_FALLBACK_SECONDARY = os.getenv("READ_FALLBACK_SECONDARY", "false").strip().lower() in {"1", "true", "yes", "on"}

primary_db = client[PRIMARY_DB_NAME]
secondary_db = client[SECONDARY_DB_NAME] if SECONDARY_DB_NAME else None

# Backward-compatible alias used by some modules.
db = primary_db


class DualCollection:
    def __init__(self, primary, secondary=None, mirror_writes=False, read_fallback=False):
        self._primary = primary
        self._secondary = secondary
        self._mirror_writes = mirror_writes and secondary is not None
        self._read_fallback = read_fallback and secondary is not None

    def _mirror_call(self, fn_name, *args, **kwargs):
        if not self._mirror_writes:
            return
        try:
            getattr(self._secondary, fn_name)(*args, **kwargs)
        except Exception as e:
            logging.error(f"Secondary DB write failed for {fn_name}: {e}")

    # ---------- Write operations ----------
    def insert_one(self, *args, **kwargs):
        result = self._primary.insert_one(*args, **kwargs)
        self._mirror_call("insert_one", *args, **kwargs)
        return result

    def update_one(self, *args, **kwargs):
        result = self._primary.update_one(*args, **kwargs)
        self._mirror_call("update_one", *args, **kwargs)
        return result

    def update_many(self, *args, **kwargs):
        result = self._primary.update_many(*args, **kwargs)
        self._mirror_call("update_many", *args, **kwargs)
        return result

    def replace_one(self, *args, **kwargs):
        result = self._primary.replace_one(*args, **kwargs)
        self._mirror_call("replace_one", *args, **kwargs)
        return result

    def delete_one(self, *args, **kwargs):
        result = self._primary.delete_one(*args, **kwargs)
        self._mirror_call("delete_one", *args, **kwargs)
        return result

    def delete_many(self, *args, **kwargs):
        result = self._primary.delete_many(*args, **kwargs)
        self._mirror_call("delete_many", *args, **kwargs)
        return result

    # ---------- Read operations ----------
    def find_one(self, *args, **kwargs):
        result = self._primary.find_one(*args, **kwargs)
        if result is None and self._read_fallback:
            return self._secondary.find_one(*args, **kwargs)
        return result

    def find(self, *args, **kwargs):
        # For cursor operations, return primary cursor for predictable behavior.
        return self._primary.find(*args, **kwargs)

    def count_documents(self, *args, **kwargs):
        result = self._primary.count_documents(*args, **kwargs)
        if result == 0 and self._read_fallback:
            return self._secondary.count_documents(*args, **kwargs)
        return result

    def aggregate(self, *args, **kwargs):
        return self._primary.aggregate(*args, **kwargs)

    def __getattr__(self, item):
        # Fallback for collection methods not explicitly wrapped.
        return getattr(self._primary, item)


def _get_collection(name: str):
    primary = primary_db[name]
    secondary = secondary_db[name] if secondary_db is not None else None
    return DualCollection(
        primary=primary,
        secondary=secondary,
        mirror_writes=MIRROR_WRITES,
        read_fallback=READ_FALLBACK_SECONDARY,
    )

# ==========================
# Collections
# ==========================
users_collection = _get_collection("users")
loan_collection = _get_collection("loans")
risk_collection = _get_collection("risk_profiles")
income_collection = _get_collection("income")
documents_collection = _get_collection("documents")
bank_collection = _get_collection("bank_details")
insurance_collection = _get_collection("insurance")
health_collection = _get_collection("health_records")
emergency_collection = _get_collection("emergency")
audit_collection = _get_collection("audit_logs")
reminders_collection = _get_collection("reminders")
expense_collection = _get_collection("expenses")

lending_collection = _get_collection("lending")
monthly_confirmation_collection = _get_collection("monthly_confirmation")

# Phase 1 collections
security_collection = _get_collection("security_questions")
otp_collection = _get_collection("otp_verifications")
nominee_collection = _get_collection("nominees")

# ==========================
# Init DB Connection
# ==========================
def init_db():
    try:
        client.admin.command("ping")
        print(f"MongoDB connected successfully. Active primary database: {PRIMARY_DB_NAME}")
        if secondary_db is not None:
            # Ensure secondary DB is resolvable on startup.
            secondary_db.command("ping")
            print(
                "Secondary database connected successfully. "
                f"Secondary: {SECONDARY_DB_NAME}, mirror_writes={MIRROR_WRITES}, "
                f"read_fallback_secondary={READ_FALLBACK_SECONDARY}"
            )
    except Exception as e:
        print("MongoDB connection error:", e)
