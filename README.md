# AI Interviewer - Full Stack

This project is an AI-powered technical interviewer with a FastAPI backend and a React (Vite) frontend.

## Project Structure
- `InterviewAI_FastAPI/`: Backend API and AI logic.
- `interviewer-ai-FRONTEND/`: React frontend application.

---

## Backend Setup (FastAPI)

### 1. Prerequisite
Ensure you have Python 3.10+ installed.

### 2. Installation
Navigate to the backend directory and install dependencies:
```bash
cd InterviewAI_FastAPI
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in `InterviewAI_FastAPI/` (refer to the existing one) with your API keys and database URL:
```env
GROQ_API_KEY=your_key
OPENROUTER_API_KEY=your_key
HUGGINGFACEHUB_API_TOKEN=your_token
DATABASE_URL=postgresql://user:pass@localhost:5432/db_name
```

### 4. Database Migrations
Run migrations using Alembic to set up the database schema:
```bash
alembic upgrade head
```

### 5. Running the Server
Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

---

## Frontend Setup (React/Vite)

### 1. Prerequisite
Ensure you have Node.js and npm/bun installed.

### 2. Installation
Navigate to the frontend directory and install dependencies:
```bash
cd interviewer-ai-FRONTEND
npm install
# OR if using bun:
bun install
```

### 3. Running the Development Server
Start the frontend:
```bash
npm run dev
# OR if using bun:
bun run dev
```

---

## Useful Commands

### Backend
- **Create a new migration:** `alembic revision --autogenerate -m "description"`
- **Apply migrations:** `alembic upgrade head`
- **Rollback migration:** `alembic downgrade -1`

### Frontend
- **Build for production:** `npm run build`
- **Lint code:** `npm run lint`
