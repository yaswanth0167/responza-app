import os
from twilio.rest import Client
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

# =========================
# TWILIO CONFIG
# =========================

twilio_client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

TWILIO_PHONE = os.getenv("TWILIO_PHONE")

# =========================
# EMAIL CONFIG
# =========================

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")


def send_sms(to_number: str, message: str):
    try:
        twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=to_number
        )
        print("SMS sent successfully")
    except Exception as e:
        print("SMS failed:", str(e))


def send_email(to_email: str, subject: str, body: str):
    try:
        msg = EmailMessage()
        msg["From"] = EMAIL_USER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(msg)

        print("Email sent successfully")

    except Exception as e:
        print("Email failed:", str(e))