from fastapi_mail import FastMail,MessageSchema, ConnectionConfig
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, timedelta

load_dotenv()

conf=ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT")),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)


def generate_interview_link():
    token = str(uuid.uuid4())   
    expiry = datetime.utcnow() + timedelta(hours=24)

    link = f"http://localhost:8080/interview/{token}"

    return link, token, expiry


async def send_interview_email(candidate_email: str, invite_link: str):
    html = f"""
    <h2>AI Interview Invitation</h2>

    <p>You have been invited to complete an AI technical interview.</p>

    <p>
    <b>Interview Link:</b><br>
    <a href="{invite_link}">{invite_link}</a>
    </p>

    <p><b>This link will expire in 24 hours.</b></p>

    <h3>Important Instructions</h3>

    <ul>
    <li>Please sit in a quiet environment</li>
    <li>Ensure stable internet connection</li>
    <li>Do not switch tabs during interview</li>
    <li>Our AI proctoring system monitors suspicious activity</li>
    </ul>

    <p>Good luck!</p>

    <p>AI Interview System</p>
    """

    message = MessageSchema(
        subject="AI Interview Invitation",
        recipients=[candidate_email],
        body=html,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    return True