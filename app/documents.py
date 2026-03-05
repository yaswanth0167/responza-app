from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.db import documents_collection
from app.dependencies import require_role, get_current_user
from datetime import datetime
import shutil
import os

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = "uploads"


# =========================
# Upload Document
# =========================

@router.post("/upload", dependencies=[Depends(require_role("user"))])
async def upload_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):

    user_id = str(current_user["_id"])

    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    # Safe filename
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_filename = f"{user_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    documents_collection.insert_one({
        "user_id": user_id,
        "doc_type": doc_type,
        "file_path": file_path,
        "uploaded_at": datetime.utcnow()
    })

    return {"message": "Document uploaded successfully"}


# =========================
# Get My Documents
# =========================

@router.get("/my", dependencies=[Depends(require_role("user"))])
async def get_my_documents(
    current_user: dict = Depends(get_current_user)
):

    user_id = str(current_user["_id"])

    docs = list(
        documents_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
    )

    if not docs:
        raise HTTPException(status_code=404, detail="No documents found")

    result = []

    for doc in docs:
        result.append({
            "doc_type": doc["doc_type"],
            "file_url": f"/files/{os.path.basename(doc['file_path'])}",
            "uploaded_at": doc.get("uploaded_at")
        })

    return {"documents": result}