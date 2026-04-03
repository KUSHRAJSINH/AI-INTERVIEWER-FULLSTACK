from sqlalchemy.orm import Session
from .models import Interview, QuestionAnswer, InterviewReport
from .models import Candidate, InterviewInvite
from datetime import datetime
import uuid


def create_interview(db: Session, session_id, candidate_name, resume_path, invite_id=None):
    interview = Interview(
        session_id=session_id,
        candidate_name=candidate_name,
        resume_path=resume_path,
        invite_id=invite_id
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return interview


def update_interview_status(db: Session, session_id: str, status: str):
    interview = db.query(Interview).filter(Interview.session_id == session_id).first()
    if interview:
        interview.status = status
        db.commit()
        db.refresh(interview)
    return interview

def update_interview_state(db: Session, session_id: str, state_data: dict):
    interview = db.query(Interview).filter(Interview.session_id == session_id).first()
    if interview:
        interview.state_data = state_data
        # only keep track of what's serializable if we have non-serializable stuff
        db.commit()
        db.refresh(interview)
    return interview


def update_invite_status(db: Session, invite_id: int, status: str):
    invite = db.query(InterviewInvite).filter(InterviewInvite.id == invite_id).first()
    if invite:
        invite.status = status
        db.commit()
        db.refresh(invite)
    return invite


def save_question_answer(db: Session, interview_id, question, answer):
    qa = QuestionAnswer(
        interview_id=interview_id,
        question=question,
        answer=answer
    )

    db.add(qa)
    db.commit()


def save_report(db: Session, interview_id, report):
    r = InterviewReport(
        interview_id=interview_id,
        report_text=report
    )

    db.add(r)
    db.commit()




def create_candidate(db:Session, email:str):
    candidate=Candidate(email=email)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def create_invite(db:Session, candidate_id:int, expires_at=None):
    token=str(uuid.uuid4())
    invite=InterviewInvite(
        candidate_id=candidate_id,
        token=token,
        expires_at=expires_at
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    return invite


def update_invite_delivery_status(db: Session, invite_id: int, status: bool):
    invite = db.query(InterviewInvite).filter(InterviewInvite.id == invite_id).first()
    if invite:
        invite.email_sent = status
        db.commit()
        db.refresh(invite)
    return invite


def get_candidate_by_email(db: Session, email: str):
    return db.query(Candidate).filter(Candidate.email == email).first()


def get_invite_by_token(db: Session, token: str):
    invite = db.query(InterviewInvite).filter(
        InterviewInvite.token == token
    ).first()
    # Reject expired invites
    if invite and invite.expires_at and invite.expires_at < datetime.utcnow():
        return None
    return invite


def delete_invite_all_data(db: Session, invite_id: int) -> bool:
    """
    Cascade-delete all data for an invite in FK-safe order:
    QuestionAnswers → InterviewReport → Interview → InterviewInvite → Candidate
    Returns True if the invite was found and deleted, False otherwise.
    """
    invite = db.query(InterviewInvite).filter(InterviewInvite.id == invite_id).first()
    if not invite:
        return False

    # Find linked interview (if any)
    interview = db.query(Interview).filter(Interview.invite_id == invite_id).first()

    if interview:
        # 1. Delete Q&A rows
        db.query(QuestionAnswer).filter(
            QuestionAnswer.interview_id == interview.id
        ).delete(synchronize_session=False)

        # 2. Delete report rows
        db.query(InterviewReport).filter(
            InterviewReport.interview_id == interview.id
        ).delete(synchronize_session=False)

        # 3. Delete the interview itself
        db.delete(interview)

    # 4. Delete the invite
    candidate_id = invite.candidate_id
    db.delete(invite)

    # 5. Delete the candidate if they have no other invites
    remaining = db.query(InterviewInvite).filter(
        InterviewInvite.candidate_id == candidate_id,
        InterviewInvite.id != invite_id
    ).count()
    if remaining == 0:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if candidate:
            db.delete(candidate)

    db.commit()
    return True