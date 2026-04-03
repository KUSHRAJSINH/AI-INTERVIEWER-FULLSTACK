from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.sql import func
from .database import Base

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True)
    candidate_name = Column(String)
    resume_path = Column(String)
    start_time = Column(DateTime, server_default=func.now())
    status = Column(String, default="active")
    invite_id = Column(Integer, ForeignKey("interview_invites.id"), nullable=True)
    state_data = Column(JSON, nullable=True)


class QuestionAnswer(Base):
    __tablename__ = "question_answers"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    question = Column(Text)
    answer = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    report_text = Column(Text)   


class Candidate(Base):
    __tablename__="candidates"

    id=Column(Integer,primary_key=True,index=True)
    email=Column(String, unique=True)
    created_at=Column(DateTime, server_default=func.now())


class InterviewInvite(Base):
    __tablename__ = "interview_invites"


    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    token = Column(String, unique=True)
    status = Column(String, default="pending")
    email_sent = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())



