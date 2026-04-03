from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import interview,speech,admin
#from app.edges import graph_builder
#from app.state import InterviewState
#import time

from db.database import engine
from db.models import Base
from app.routes import email


app=FastAPI(title="AI INTERVIEW Backend")

# create tables (handled by migrations)
Base.metadata.create_all(bind=engine)



#allow forntend to connect

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        ], #change later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview.router,prefix="/api")
app.include_router(speech.router,prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(email.router, prefix="/api")
  











