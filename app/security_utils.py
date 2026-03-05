from cryptography.fernet import Fernet
import os

SECRET_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY")

if not SECRET_ENCRYPTION_KEY:
    raise ValueError("FIELD_ENCRYPTION_KEY not set in .env file")

cipher = Fernet(SECRET_ENCRYPTION_KEY.encode())

def encrypt_data(data: str):
    return cipher.encrypt(data.encode()).decode()

def decrypt_data(data: str):
    return cipher.decrypt(data.encode()).decode()