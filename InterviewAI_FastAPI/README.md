# 🤖 AI Interview Backend (FastAPI + LangGraph)

An AI-powered technical interview backend built with FastAPI, LangGraph, and LLMs.

This system:
- Parses candidate resumes (PDF)
- Generates adaptive technical questions
- Evaluates answers progressively
- Performs final technical + integrity assessment
- Supports Speech-to-Text (Whisper)
- Tracks interview integrity signals

---

## 🚀 Tech Stack

- FastAPI
- LangGraph
- LangChain
- FAISS (Vector Search)
- HuggingFace Embeddings
- Groq LLM (LLaMA 3.1)
- Faster-Whisper (Speech-to-Text)   
- Python 3.10+

---

## 📂 Project Structure

ai-interview-backend/
│
├── app/
│ ├── routes/
│ │ ├── interview.py
│ │ └── speech.py
│ │
│ ├── speech/
│ │ └── stt.py
│ │
│ ├── node.py
│ ├── state.py
│ └── edges.py
│
├── main.py
├── requirements.txt
├── .env
├── .gitignore
└── README.md



---

## ⚙️ Features

### 1️⃣ Resume-Based Question Generation
- Upload resume
- Extract candidate name
- Create vector embeddings
- Generate skill-based technical questions

### 2️⃣ Adaptive Difficulty
- Q1 → Easy  
- Q2 → Easy–Medium  
- Q3 → Medium  
- Q4 → Medium–Hard  
- Q5+ → Advanced  

### 3️⃣ Interview State Management
- Question history
- Answer history
- Depth tracking
- Topic extraction
- Session-based memory

### 4️⃣ Integrity Monitoring
- Cheat flags
- Risk scoring
- Integrity-adjusted hiring recommendation

### 5️⃣ Speech-to-Text
- Whisper-based audio transcription endpoint

---

## 🔑 Environment Variables

Create a `.env` file:
