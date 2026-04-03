from fastapi import APIRouter
from app.utils.email_service import send_interview_email

router = APIRouter()

@router.post("/send-interview-invite")
async def send_invite(email: str):

    result = await send_interview_email(email)

    return {
        "status": "email sent",
        "token": result["token"],
        "expires": result["expiry"]
    }