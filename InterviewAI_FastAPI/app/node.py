"""from app.state import InterviewState
import os, time
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.chat_models import ChatOpenAI
from langchain_groq import ChatGroq
load_dotenv()

# --------------------------------------------------
# LLM FACTORY (OPENROUTER – FREE)
# --------------------------------------------------
def get_llm():
    return ChatOpenAI(
        model="meta-llama/llama-3.1-8b-instruct",
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0,
    )

model=ChatGroq(model="llama-3.1-8b-instant", temperature=0.1, timeout=20)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def format_qa(questions, answers):
    formatted = []
    for i, (q, a) in enumerate(zip(questions, answers)):
        # Make empty answers explicit for the LLM
        display_answer = a.strip() if a and a.strip() else "(Candidate provided no response / Empty answer)"
        formatted.append(f"Q{i+1}: {q}\nA{i+1}: {display_answer}")
    return "\n".join(formatted)

# --------------------------------------------------
# PROMPTS
# --------------------------------------------------
def final_evaluation_prompt(state):
    return f"""
#You are a senior technical interviewer.

#Candidate name:
#{state['candidate_name']}

#Interview questions and answers:
#{format_qa(state['question_history'], state['answer_history'])}

#Evaluate the candidate holistically.

#Provide:
#- Overall score (out of 10)
#- Strengths
#- Weaknesses
#- Topic gaps
#- Communication quality
#- Technical depth
#- Hiring recommendation
#- Short summary
"""

def topic_extraction_prompt(answer):
    return f"""
#Extract the main technical topic from the answer.
#Return ONLY 1–2 words.

#Answer:
#{answer}
"""

# --------------------------------------------------
# NODES
# --------------------------------------------------
def load_resume(state: InterviewState):
    loader = PyPDFLoader(state["resume_path"])
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=80)
    chunks = splitter.split_documents(docs)

    vectorstore = FAISS.from_documents(
        chunks,
        HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    )

    state["resume_vectorstore"] = vectorstore
    return state

def extract_candidate_name(state):
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0,
        timeout=30
    )

#    prompt = """
#Extract the candidate's full name from this resume text.
#If not found, return "Candidate".
#ONLY return the name.
"""

    docs = state["resume_vectorstore"].similarity_search(
        "candidate name", k=3
    )

    text = "\n".join(d.page_content for d in docs)

    name = llm.invoke(prompt + "\n\n" + text).content.strip()

    state["candidate_name"] = name or "Candidate"
    return state

def generate_question(state: InterviewState):
    #llm = get_llm()
    #state.setdefault("question_count", 0)
    #if "question_count" not in state:
     #   state["question_count"] = 0
     
     
     
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.7,
        timeout=30
    )

    prompt = f"""
#You are an AI interviewer.

#Based on the candidate's resume, ask ONE strong technical interview question.
#Start medium difficulty.
#Ask only the question, nothing else.
"""
 
    docs = state["resume_vectorstore"].similarity_search(
        "skills experience projects", k=4
    )

    resume_context = "\n".join(d.page_content for d in docs)

    question = llm.invoke(prompt + "\n\n" + resume_context).content.strip()
 
    state["current_question"] = question
    state["question_history"].append(question)
    state["phase"] = "question"
    state["depth_level"] = 1
    #state["question_count"] += 1

    return state



def evaluate_answer(state: InterviewState):
    topic = extract_topic_from_answer(state["current_answer"])

    if topic == state["current_topic"]:
        state["depth_level"] += 1
    else:
        state["current_topic"] = topic
        state["depth_level"] = 1

    if state["question_count"] >= state["max_questions"]:
        state["phase"] = "FINAL"
    else:
        state["phase"] = "question"

    return state


def extract_topic_from_answer(answer):
    #llm = get_llm()
    
    model=ChatGroq(model="llama-3.1-8b-instant", temperature=0.1, timeout=20)

    result = model.invoke(topic_extraction_prompt(answer))
    return result.content.strip().lower()

def get_user_answer(state: InterviewState):
    answer = state["current_answer"]
    state["answer_history"].append(answer)

    topic = extract_topic_from_answer(answer)

    if topic == state["current_topic"]:
        state["depth_level"] += 1
    else:
        state["current_topic"] = topic
        state["depth_level"] = 0

    return state

def time_and_phase_check(state: InterviewState):
    elapsed = time.time() - state["interview_start_time"]

    if elapsed >= state["max_duration_seconds"]:
        state["phase"] = "FINAL"
    elif state["depth_level"] >= 3:
        state["phase"] = "ASK"
        state["depth_level"] = 0
        state["current_topic"] = ""
    else:
        state["phase"] = "FOLLOW_UP"

    return state

def final_evaluation(state: InterviewState):
    #llm = get_llm()
    model=ChatGroq(model="llama-3.1-8b-instant", temperature=0.1, timeout=20)
 
    result = model.invoke(final_evaluation_prompt(state))
    state["final_evaluation"] = result.content.strip()
    return state
"""


import time
import os
import json
from dotenv import load_dotenv
import requests
import tempfile

from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import UnstructuredPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
import uuid

from app.state import InterviewState

load_dotenv()


# ==========================================================
# Resume Loader
# ==========================================================
def load_resume(state: InterviewState):
    url = state["resume_path"]
    
    response = requests.get(url)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
        f.write(response.content)
        temp_path = f.name
        
    loader = UnstructuredPDFLoader(temp_path, mode="elements", strategy="fast")
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=80
    )
    chunks = splitter.split_documents(docs)

    collection_name = f"resume_{uuid.uuid4().hex}"
    
    if not chunks:
        # Fallback if unstructured fails to extract text
        from langchain_core.documents import Document
        chunks = [Document(page_content="Candidate Name: Candidate. No text extracted from resume.")]

    # Sanitize metadata (Chroma does not support complex dicts in metadata like bounding boxes)
    sanitized_chunks = filter_complex_metadata(chunks)

    Chroma.from_documents(
        documents=sanitized_chunks,
        embedding=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2"),
        persist_directory="./chroma_db",
        collection_name=collection_name
    )
    
    state["resume_collection_name"] = collection_name
    return state


# ==========================================================
# Candidate Name Extractor
# ==========================================================
def extract_candidate_name(state: InterviewState):
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    """ llm=ChatOpenAI(
        model="arcee-ai/trinity-large-preview:free",
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=0.5,
                
     )"""

    vectorstore = Chroma(
        persist_directory="./chroma_db",
        embedding_function=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2"),
        collection_name=state["resume_collection_name"]
    )

    docs = vectorstore.similarity_search(
        "candidate name", k=3
    )
    text = "\n".join(d.page_content for d in docs)

    prompt = """
Extract the candidate's full name.
If not found, return "Candidate".
ONLY return the name.
"""

    name = llm.invoke(prompt + "\n\n" + text).content.strip()
    state["candidate_name"] = name or "Candidate"
    return state


# ==========================================================
# Topic Extractor
# ==========================================================
def extract_topic_from_answer(answer: str) -> str:
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    """llm=ChatOpenAI(
        model="arcee-ai/trinity-large-preview:free",
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=0,
                
     )"""
    prompt = f"""
Extract the main technical topic from this answer.
Return ONLY 1–2 words.

Answer:
{answer}
"""
    return llm.invoke(prompt).content.strip().lower()


# ==========================================================
# Evaluate Answer Quality (Structured)
# ==========================================================
def evaluate_answer_quality(state: InterviewState):
    
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    """llm=ChatOpenAI(
        model="arcee-ai/trinity-large-preview:free",
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=0,
                
     )"""

    latest_answer = state["answer_history"][-1]

    prompt = f"""
You are a senior technical interviewer. You are strict, critical, and accurate.

Evaluate the candidate's answer based on the question asked.

Question:
{state['current_question']}

Answer:
{latest_answer}

Return ONLY valid JSON in this format:

{{
  "quality_score": 0-10,
  "depth_score": 0-10,
  "clarity_score": 0-10,
  "confidence_level": "low | medium | high",
  "weak_areas": ["..."],
  "follow_up_required": true/false
}}

Strict Grading Rules:
1. If the answer is EMPTY, whitespace only, or strictly non-technical (e.g., "I don't know", "skip", "test") → Score 0 for everything and set follow_up_required to true.
2. If the answer is vague or lacks specific examples → low depth score (1-3).
3. If the answer is partially correct but missing key points → medium quality (4-6).
4. Only award 9-10 scores for exceptionally clear, accurate, and detailed technical answers.
5. No explanation outside JSON.
"""

    result = llm.invoke(prompt).content.strip()

    try:
        # Clean up potential markdown blocks from LLM response
        if result.startswith("```json"):
            result = result.split("```json")[1].split("```")[0].strip()
        elif result.startswith("```"):
            result = result.split("```")[1].split("```")[0].strip()
            
        data = json.loads(result)
    except:
        # fallback if JSON fails - use minimal points
        data = {
            "quality_score": 0,
            "depth_score": 0,
            "clarity_score": 0,
            "confidence_level": "low",
            "weak_areas": ["System failed to parse evaluation"],
            "follow_up_required": True
        }

    state["quality_score"] = data["quality_score"]
    state["depth_score"] = data["depth_score"]
    state["clarity_score"] = data["clarity_score"]
    state["confidence_level"] = data["confidence_level"]
    state["weak_areas"] = data["weak_areas"]
    state["follow_up_required"] = data["follow_up_required"]

    # -----------------------------
    # Topic Extraction
    # -----------------------------
    topic = extract_topic_from_answer(latest_answer)
    state["current_topic"] = topic

    # -----------------------------
    # Topic Mastery Tracking
    # -----------------------------
    if "topic_mastery" not in state:
        state["topic_mastery"] = {}

    if topic:
        if topic not in state["topic_mastery"]:
            state["topic_mastery"][topic] = []

        state["topic_mastery"][topic].append(state["quality_score"])

    return state


# ==========================================================
# Dynamic Difficulty Engine
# ==========================================================
def adjust_difficulty(state: InterviewState):

    if "difficulty_level" not in state:
        state["difficulty_level"] = 2  # Start medium

    if state["quality_score"] >= 8:
        state["difficulty_level"] = min(4, state["difficulty_level"] + 1)

    elif state["quality_score"] <= 4:
        state["difficulty_level"] = max(1, state["difficulty_level"] - 1)

    return state


# ==========================================================
# Adaptive Question Generator
# ==========================================================
def generate_question(state: InterviewState):
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.4
    )

    q_count = state.get("question_count", 0)
    candidate_name = state.get("candidate_name", "Candidate")

    # 1. First Question: Greeting
    if q_count == 0:
        state["current_question"] = f"Hello {candidate_name}, how are you today?"
        return state

    # 2. Second Question: Introduction
    if q_count == 1:
        state["current_question"] = "Thank you. To start, could you please tell me a bit about yourself and your professional background?"
        return state

    # 3. Technical Questions (Start from q_count >= 2)
    vectorstore = Chroma(
        persist_directory="./chroma_db",
        embedding_function=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2"),
        collection_name=state["resume_collection_name"]
    )

    docs = vectorstore.similarity_search(
        "skills experience projects", k=4
    )
    context = "\n".join(d.page_content for d in docs)

    previous_questions = state.get("question_history", [])

    prompt = f"""
You are an AI interviewer conducting a technical screening (Round 1).
Your goal is to assess foundational understanding and core concepts.

Candidate Name: {candidate_name}
Current Topic: {state.get('current_topic', '')}
Difficulty Level: {state.get('difficulty_level', 2)} (On a 1-4 scale)
Weak Areas: {state.get('weak_areas', [])}
Is Follow Up: {state.get('follow_up_required', False)}

Resume Context:
{context}

Instructions:
1. Screening Level: FOCUS ON FOUNDATIONAL QUESTIONS. Start with  "What is [Concept]?", "Explain the core idea of [Project/Tech]", or "How does [X] differ from [Y]?".
   - Examples: "What is a RAG pipeline?", "How does LangGraph differ from LangChain?", "What is the purpose of vector embeddings?".
2. If 'Is Follow Up' is True:
   Ask a follow-up question that explores a related basic concept or clarifies their previous answer. Avoid jumping into complex implementation.
3. Else:
   Pick a NEW technical skill or project from the resume and ask a foundational "What is it?" or "How does it work?" type question.
4. Coding Tasks: Occasionally (every 3rd technical question) ask for a very simple logic or code explanation (e.g., "Write a short function to chunk an array", "How do you handle errors in Python?").
5. STYLE: Be professional, welcoming, and clear.

CRITICAL RULES:
- Return ONLY the question text.
- NEVER include labels like "Question:", "Follow Up:", or "Follow up required: True" in your response.
- Ask ONLY ONE question.
- Do NOT include any explanations or conversational fillers outside the question.
- Do NOT repeat previous questions: {previous_questions}
"""

    for _ in range(3):
        response = llm.invoke(prompt)
        question = response.content.strip()

        # Clean up any potential tags the LLM might hallucinate
        if ":" in question and any(tag in question.upper() for tag in ["QUESTION", "FOLLOW UP", "REQUIRED"]):
             # Attempt to strip common tags
             question = question.split(":")[-1].strip()

        if question not in previous_questions:
            state["current_question"] = question
            return state

    state["current_question"] = question
    return state


# ==========================================================
# Final Evaluation
# ==========================================================
def format_qa(questions, answers):
    return "\n".join(
        f"Q{i+1}: {q}\nA{i+1}: {a}"
        for i, (q, a) in enumerate(zip(questions, answers))
    )


def final_evaluation(state: InterviewState):
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

    """llm=ChatOpenAI(
        model="arcee-ai/trinity-large-preview:free",
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        temperature=0,
                
     )
    """ 
    prompt = f"""
You are a senior technical interviewer. You are strict, critical, and provide highly accurate assessments.

Candidate Name: 
{state['candidate_name']}

Interview Questions and Answers:
{format_qa(state['question_history'], state['answer_history'])}

Proctoring Report:
- Cheat Flags: {state['cheat_flags']}
- Integrity Risk Score: {state['cheat_score']}
- Tab Switches: {state.get('tab_switch_count', 0)}
- Copy-Paste Attempts: {state.get('copy_paste_count', 0)}
- Looking Away Count: {state.get('looking_away_count', 0)}
- Phone Detections: {state.get('phone_detection_count', 0)}

Assessment Rules:
1. STRICTNESS: You are a "gatekeeper". If the candidate's answers are empty, garbage, or non-technical (e.g., "hi", "test", "skip"), they MUST receive an overall score of 0-2 and a "Strong No Hire".
2. DATA COMPLETENESS: If the interview history contains fewer than 3 technical questions (excluding greetings/intro), the recommendation MUST be "No Hire" due to insufficient data, and the score should not exceed 3.
3. EMPTY ANSWERS: Each empty answer (marked as just " " or "(empty)") is a automatic fail for that specific topic.
4. GRADING SCALE:
   - 0-3: Failed to answer basics, empty answers, or high integrity risk.
   - 4-5: Significant technical gaps, very shallow knowledge.
   - 6: Average. Answered most basic questions correctly but lacked depth. (Only award if at least 3 technical questions were answered well).
   - 7-8: Strong technical understanding with some minor errors.
   - 9-10: Exceptional depth, clear communication, and perfect accuracy.
5. INTEGRITY IMPACT: If Integrity Risk Score >= 6 → Automatic "Strong No Hire" regardless of technical ability.

Provide:
- Overall score (out of 10)
- Technical strengths
- Technical weaknesses (be specific - if they gave empty answers, state that they failed to respond)
- Communication quality
- Integrity assessment
- Hiring recommendation (Hire, No Hire, or Strong No Hire)
- Short summary
"""

    state["final_report"] = llm.invoke(prompt).content.strip()
    return state
