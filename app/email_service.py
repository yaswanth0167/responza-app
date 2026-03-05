import os
import aiosmtplib
from email.message import EmailMessage
from app.db import users_collection

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

async def send_email(user_id: str, message: str):
    user = users_collection.find_one({"_id": user_id})
    if not user or not user.get("email"):
        return

    msg = EmailMessage()
    msg["From"] = EMAIL_USER
    msg["To"] = user["email"]
    msg["Subject"] = "Responza Notification"
    msg.set_content(message)

    await aiosmtplib.send(
        msg,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=EMAIL_USER,
        password=EMAIL_PASS,
    )