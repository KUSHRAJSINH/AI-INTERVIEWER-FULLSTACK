from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db import crud
import smtplib
from db.models import *
from app.auth import verify_token, create_access_token, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta


router = APIRouter()




from app.utils.email_service import send_interview_email
from datetime import datetime, timedelta

@router.post("/admin/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Hardcoded admin credentials as requested for this MVP scope
    ADMIN_EMAIL = "kushraj@logicrays.com"
    ADMIN_PASSWORD_HASH = "$2b$12$/SyVIRe5TK3q4dEOOzBkjeLey1IPNtDddn4tt.5ECOe9g7lnafsJW" # admin1234
    
    if form_data.username != ADMIN_EMAIL or not verify_password(form_data.password, ADMIN_PASSWORD_HASH):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": ADMIN_EMAIL, "role": "admin"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/admin/create-interview")
async def create_interview(email: str, db: Session = Depends(get_db), token: str = Depends(verify_token)):

    # Check if candidate exists
    candidate = crud.get_candidate_by_email(db, email)
    if not candidate:
        candidate = crud.create_candidate(db, email)

    # Set expiry for 24 hours
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    # Create invite in DB
    invite = crud.create_invite(db, candidate.id, expires_at=expires_at)

    interview_link = f"http://localhost:8080/interview/{invite.token}"

    # Send email
    try:
        await send_interview_email(email, interview_link)
        crud.update_invite_delivery_status(db, invite.id, True)
        email_status = "sent"
    except Exception as e:
        print(f"Error sending email: {e}")
        email_status = "failed"

    return {
        "message": "Interview invitation processed",
        "link": interview_link,
        "email_status": email_status
    }


@router.get("/admin/interviews")
def get_all_interviews(db: Session = Depends(get_db), token: str = Depends(verify_token)):

    invites = db.query(InterviewInvite).all()
    results = []

    for invite in invites:
        # Try to find an associated interview record
        interview = db.query(Interview).filter(Interview.invite_id == invite.id).first()
        
        results.append({
            "id": invite.id,
            "session_id": interview.session_id if interview else None,
            "candidate_name": interview.candidate_name if interview else f"Candidate ({invite.id})",
            "resume": interview.resume_path if interview else None,
            "status": invite.status
        })

    return results


@router.delete("/admin/interviews/{invite_id}")
def delete_interview(
    invite_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(verify_token)
):
    """Delete all data associated with an invite: Q&As, report, interview, invite, candidate."""
    from fastapi import HTTPException
    deleted = crud.delete_invite_all_data(db, invite_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Interview invite not found")
    return {"message": "Candidate and all associated data deleted successfully"}