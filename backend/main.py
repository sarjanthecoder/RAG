"""
RAG Resume Chatbot - FastAPI Backend
Enhanced with PDF Upload functionality
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="RAG Resume Chatbot API",
    description="An intelligent chatbot that answers questions about your resume",
    version="2.0.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory (supports local and Vercel serverless /tmp directory)
if os.getenv("VERCEL"):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError:
    UPLOAD_DIR = "/tmp/uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

# Current resume path
current_resume_path = os.getenv("RESUME_PATH", "../my data engg resume.pdf")

# Initialize RAG Engine lazily
rag_engine = None

def get_rag_engine(resume_path: str = None):
    """Get or create the RAG engine instance"""
    global rag_engine, current_resume_path
    
    if resume_path:
        current_resume_path = resume_path
    
    if rag_engine is None or resume_path:
        from rag_engine import RAGEngine
        print(f"[DEBUG] Loading resume from: {current_resume_path}")
        rag_engine = RAGEngine(resume_path=current_resume_path)
    return rag_engine


# Pydantic models
class ChatRequest(BaseModel):
    message: str
    context_chunks: Optional[int] = 3


class ChatResponse(BaseModel):
    answer: str
    context: List[str]
    question: str
    error: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    initialized: bool
    content_length: int
    resume_path: str
    has_resume: bool = True


class InitResponse(BaseModel):
    status: str
    message: str
    content_length: Optional[int] = None


class UploadResponse(BaseModel):
    status: str
    message: str
    filename: str
    content_length: Optional[int] = None


@app.get("/", tags=["Health"])
async def root():
    return {"status": "online", "message": "RAG Resume Chatbot API v2.0", "version": "2.0.0"}


@app.get("/api/status", response_model=StatusResponse, tags=["System"])
async def get_status():
    global rag_engine
    try:
        if rag_engine is None:
            return StatusResponse(
                status="online",
                initialized=False,
                content_length=0,
                resume_path="No resume uploaded",
                has_resume=False
            )
        status = rag_engine.get_status()
        return StatusResponse(
            status="online",
            initialized=status["initialized"],
            content_length=status["content_length"],
            resume_path=os.path.basename(status["resume_path"]),
            has_resume=True
        )
    except Exception as e:
        print(f"[ERROR] Status check failed: {e}")
        return StatusResponse(
            status="error", 
            initialized=False, 
            content_length=0, 
            resume_path=str(e),
            has_resume=False
        )


@app.post("/api/upload", response_model=UploadResponse, tags=["Upload"])
async def upload_resume(file: UploadFile = File(...)):
    """Upload a PDF resume and initialize the RAG system"""
    global rag_engine
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF  formatted files are allowed")
    
    try:
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, "resume.pdf")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"[DEBUG] Uploaded file saved to: {file_path}")
        
        # Reset and reinitialize RAG engine with new file
        rag_engine = None
        engine = get_rag_engine(file_path)
        result = engine.initialize(force_reload=True)
        
        if result["status"] == "success":
            return UploadResponse(
                status="success",
                message=f"Resume uploaded and processed successfully!",
                filename=file.filename,
                content_length=result.get("content_length", 0)
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("message", "Processing failed"))
            
    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/initialize", response_model=InitResponse, tags=["System"])
async def initialize_rag(force_reload: bool = False):
    try:
        engine = get_rag_engine()
        result = engine.initialize(force_reload=force_reload)
        return InitResponse(**result)
    except Exception as e:
        print(f"[ERROR] Initialize failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(request: ChatRequest):
    global rag_engine
    
    if rag_engine is None:
        raise HTTPException(status_code=400, detail="Please upload a resume first")
    
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        result = rag_engine.query(question=request.message)
        return ChatResponse(**result)
    except Exception as e:
        print(f"[ERROR] Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sample-questions", tags=["Chat"])
async def get_sample_questions():
    return {
        "questions": [
            "What are your main technical skills?",
            "Tell me about your work experience",
            "What projects have you worked on?",
            "What's your educational background?",
            "What are your certifications?",
        ]
    }


@app.delete("/api/reset", tags=["System"])
async def reset_system():
    """Reset the system and clear uploaded resume"""
    global rag_engine
    rag_engine = None
    return {"status": "success", "message": "System reset successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
