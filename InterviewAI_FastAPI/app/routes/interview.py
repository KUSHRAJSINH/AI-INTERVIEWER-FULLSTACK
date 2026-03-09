from fastapi import APIRouter,UploadFile,File, Form
#from app.edges import question_graph, final_graph
import shutil
import os
import time 
import uuid
from app.edges import init_interview_graph,final_graph      
from app.node import (
    evaluate_answer_quality,
    adjust_difficulty,
    generate_question
)
from app.vision.proctor import analyze_frame
from sqlalchemy.orm import Session
from fastapi import Depends
from db import models


from db.database import get_db
from db import crud



MAX_CHEAT_SCORE = 100

router=APIRouter()

#simple in memory session storage 


sessions={}

def record_violation(session_id: str, violation_type: str, weight: int):
    state = sessions.get(session_id)
    if not state:
        return None, False

    now = time.time()
    if "last_violation_time" not in state:
        state["last_violation_time"] = {}
    last_time = state["last_violation_time"].get(violation_type, 0)
    
    # Apply cooldown: 5 seconds for the same violation type
    if now - last_time < 5:
        return state, False

    state.setdefault("cheat_score", 0)
    state.setdefault("cheat_flags", [])
    state.setdefault("tab_switch_count", 0)
    state.setdefault("copy_paste_count", 0)
    state.setdefault("looking_away_count", 0)
    state.setdefault("phone_detection_count", 0)

    state["cheat_score"] += weight
    state["cheat_flags"].append(f"{violation_type} at {time.strftime('%H:%M:%S')}")
    state["last_violation_time"][violation_type] = now

    # Update specific counters
    v_lower = violation_type.lower()
    if "tab" in v_lower or "window" in v_lower:
        state["tab_switch_count"] += 1
    elif "paste" in v_lower:
        state["copy_paste_count"] += 1
    elif "look" in v_lower or "face" in v_lower:
        state["looking_away_count"] += 1
    elif "phone" in v_lower:
        state["phone_detection_count"] += 1

    sessions[session_id] = state
    return state, True

@router.post("/start-interview")
async def start_interview(file: UploadFile=File(...),db: Session = Depends(get_db)):
    os.makedirs("data",exist_ok=True)
    file_path=f"data/{uuid.uuid4()}.pdf"

    with open(file_path,"wb") as buffer:
        shutil.copyfileobj(file.file,buffer)

    state={
        "resume_path":file_path,
        "candidate_name":"",
        "resume_vectorstore":None,

        "current_question":"",
        "current_answer":"",

        "question_history": [],
        "answer_history": [],

        "current_topic": "",
        "depth_level": 0,

        "interview_start_time": time.time(),
        "max_duration_seconds": 900,

        "question_count": 0,
        "max_questions": 5,

        "phase": "question",
        "final_report": "",

        "cheat_flags": [],
        "cheat_score": 0,
        "tab_switch_count": 0,
        "copy_paste_count": 0,
        "looking_away_count": 0,
        "phone_detection_count": 0,
        "last_violation_time": {}, # {type: timestamp}
        "interview_closed": False,
    }


    graph=init_interview_graph()
    state=graph.invoke(state)


    session_id=str(uuid.uuid4())
    sessions[session_id]=state

    #save interview in database

    crud.create_interview(
        db=db,
        session_id=session_id,
        candidate_name=state['candidate_name'],
        resume_path=file_path
    )


    return{
        "session_id":session_id,
        "question":state['current_question']
    }

@router.post("/vision-check")
async def vision_check(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    state = sessions.get(session_id)

    if not state:
        return {"error": "Invalid session"}

    image_bytes = await file.read()

    result = analyze_frame(image_bytes)

    new_v = []
    # Multi-person detection
    if result["person_count"] > 1:
        state, recorded = record_violation(session_id, "Multiple persons detected", 3)
        if recorded: new_v.append("Multiple persons detected")

    # Phone detection
    if result["phone_detected"]:
        state, recorded = record_violation(session_id, "Phone detected", 5)
        if recorded: new_v.append("Phone detected")

    # Looking away
    if result["looking_away"]:
        state, recorded = record_violation(session_id, "Looking away", 2)
        if recorded: new_v.append("Looking away")

    return {
        **result,
        "cheat_score": state["cheat_score"] if state else 0,
        "cheat_flags": state["cheat_flags"] if state else [],
        "new_violations": new_v
    }



@router.post("/submit-answer")
async def submit_answer(
    session_id: str = Form(...),
    answer: str = Form(...),
    db: Session= Depends(get_db)
):
    state = sessions.get(session_id)

    if not state:
        return {"error": "Invalid session"}

    if state.get("interview_closed"):
        return {"error": "Interview already closed"}

    # Store answer
    state["answer_history"].append(answer)
    state["question_history"].append(state["current_question"])
    state["question_count"] += 1

    #find interview id

    interview=db.query(models.Interview).filter(models.Interview.session_id==session_id).first()

    if interview:
        crud.save_question_answer(
            db=db,
            interview_id=interview.id,
            question=state['current_question'],
            answer=answer
        )

    # -----------------------------
    # TIME CHECK
    # -----------------------------
    elapsed_time = time.time() - state["interview_start_time"]

    if (
        elapsed_time >= state["max_duration_seconds"]
        or state["question_count"] >= state["max_questions"]
    ):
        state["phase"] = "FINAL"
        sessions[session_id] = state
        return {"status": "completed"}

    # -----------------------------
    # ADAPTIVE FLOW
    # -----------------------------
    state = evaluate_answer_quality(state)
    state = adjust_difficulty(state)
    state = generate_question(state)

    sessions[session_id] = state

    return {"question": state["current_question"]}



# -------------------------
# REPORT CHEAT (NEW)
# -------------------------
@router.post("/report-cheat")
async def report_cheat(
    session_id: str = Form(...),
    event: str = Form(...)
):
    state = sessions.get(session_id)

    if not state:
        return {"error": "Invalid session"}

    # Store event
    state["cheat_flags"].append(event)

    # Weighted scoring logic
    event_lower = event.lower()
    weight = 1

    if "tab" in event_lower:
        weight = 2
    elif "paste" in event_lower:
        weight = 3
    elif "copy" in event_lower:
        weight = 2
    elif "window" in event_lower:
        weight = 1
    elif "phone" in event_lower:
        weight = 5

    state, recorded = record_violation(session_id, event, weight)

    if not state:
        return {"error": "Session state missing"}

    return {
        "status": "recorded",
        "current_cheat_score": state["cheat_score"],
        "terminated": state["cheat_score"] >= MAX_CHEAT_SCORE,
        "recorded": recorded
    }

@router.post("/close-interview")
async def close_interview(session_id: str = Form(...)):
    state = sessions.get(session_id)
    if not state:
        return {"error": "Invalid session"}

    state["interview_closed"] = True
    state["phase"] = "FINAL"
    sessions[session_id] = state

    return {"status": "closed"}
 



@router.post("/final-report")
async def final_report(session_id: str = Form(...),db:Session=Depends(get_db)):


    print("FINAL REPORT CALLED")

    state = sessions.get(session_id)

    if not state:
        print("Invalid session")
        return {"error": "Invalid session"}

    print("Questions:", state.get("question_history"))
    print("Answers:", state.get("answer_history"))

    graph = final_graph()
    state = graph.invoke(state)


    interview = db.query(models.Interview).filter(
    models.Interview.session_id == session_id
).first()

    if interview:
        crud.save_report(
            db=db,
            interview_id=interview.id,
            report=state["final_report"]
        )

    print("Final report generated")

    sessions[session_id] = state

    return {"report": state.get("final_report", "No report")}
