import os
import random
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.db import otp_collection, users_collection

router = APIRouter(tags=["OTP"])

# =========================
# Twilio Setup
# =========================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE = os.getenv("TWILIO_PHONE")

twilio_client = None

if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
else:
    logging.warning("Twilio environment variables not set properly")

# =========================
# Request Models
# =========================
class SendOTPRequest(BaseModel):
    mobile_number: str
    purpose: str = "registration"  # registration | login


class VerifyOTPRequest(BaseModel):
    mobile_number: str
    otp_code: str


# =========================
# OTP Generator
# =========================
def generate_otp():
    return str(random.randint(100000, 999999))


# =========================
# Reusable SMS Function
# =========================
def send_sms(mobile_number: str, message: str):
    if not twilio_client:
        logging.error("Twilio client not configured")
        return False

    try:
        twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=mobile_number
        )
        logging.info(f"SMS sent to {mobile_number}")
        return True

    except Exception as e:
        logging.error(f"Failed to send SMS: {e}")
        return False


def send_sms_with_error(mobile_number: str, message: str):

    if not twilio_client:
        return False, "Twilio client not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."

    try:
        twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=mobile_number
        )
        return True, None

    except TwilioRestException as e:
        return False, f"Twilio error {e.code}: {e.msg}"

    except Exception as e:
        return False, f"SMS send failed: {str(e)}"


# =========================
# Send OTP Endpoint
# =========================
@router.post("/send-otp")
async def send_otp(data: SendOTPRequest):

    purpose = (data.purpose or "registration").strip().lower()
    mobile = data.mobile_number.strip()

    user = users_collection.find_one({"mobile_number": mobile})

    if purpose == "login" and not user:
        raise HTTPException(status_code=404, detail="User not found")

    if purpose == "registration" and user:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    otp_code = generate_otp()

    # Delete old OTP
    otp_collection.delete_many({"mobile_number": mobile})

    otp_collection.insert_one({
        "mobile_number": mobile,
        "otp_code": otp_code,
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
        "created_at": datetime.utcnow()
    })

    sent, error_detail = send_sms_with_error(
        mobile,
        f"Your OTP code is: {otp_code}"
    )

    if not sent:
        raise HTTPException(
            status_code=500,
            detail=error_detail or "Failed to send OTP"
        )

    return {"message": "OTP sent successfully"}


# =========================
# Verify OTP Endpoint
# =========================
@router.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):

    mobile = data.mobile_number.strip()
    otp_code = data.otp_code.strip()

    otp_record = otp_collection.find_one({
        "mobile_number": mobile,
        "otp_code": otp_code
    })

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > otp_record["expires_at"]:
        otp_collection.delete_many({"mobile_number": mobile})
        raise HTTPException(status_code=400, detail="OTP expired")

    # Mark user as verified
    users_collection.update_one(
        {"mobile_number": mobile},
        {"$set": {"mobile_verified": True}}
    )

    # Delete OTP after success
    otp_collection.delete_many({"mobile_number": mobile})

    return {"message": "Mobile verified successfully"}