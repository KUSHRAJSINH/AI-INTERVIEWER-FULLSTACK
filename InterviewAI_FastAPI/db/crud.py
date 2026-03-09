from sqlalchemy.orm import Session
from .models import Interview, QuestionAnswer, InterviewReport


def create_interview(db: Session, session_id, candidate_name, resume_path):
    interview = Interview(
        session_id=session_id,
        candidate_name=candidate_name,
        resume_path=resume_path
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return interview


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