# 🏗️ System Architecture Diagram

This document illustrates the complete end-to-end architecture, data flow, and deployment model of the **RAG Resume Chatbot**.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Client Layer (Browser)"]
        UI["User Interface (React + Vite)"]
        UploadBox["PDF Drag & Drop Uploader"]
        ChatWindow["Interactive RAG Chat"]
        UI --> UploadBox
        UI --> ChatWindow
    end

    subgraph Vercel["▲ Vercel Cloud Platform (Unified Domain)"]
        Router["Vercel Edge Network & Routing\n(vercel.json)"]
        
        subgraph FrontendHost["Static Asset Hosting"]
            StaticFiles["React SPA Build\n(HTML5, CSS3, JS Chunks)"]
        end
        
        subgraph ServerlessAPI["Serverless Function Runtime"]
            Entrypoint["api/index.py\n(ASGI Serverless Handler)"]
            FastAPI["FastAPI Backend Application\n(backend/main.py)"]
            
            subgraph PDFModule["PDF Processing Engine"]
                PyLoader["pdf_loader.py\n(Python Engine)"]
                JsLoader["pdf_loader.js\n(Node.js Engine)"]
                TextCleaner["clean_spaced_text()\n(Character Reassembly)"]
                PyLoader --> TextCleaner
                JsLoader --> TextCleaner
            end
            
            subgraph Engine["RAG Engine"]
                RAGEngine["rag_engine.py\n(SimpleRAGEngine)"]
                ContextStore["In-Memory Resume\nContext Storage"]
            end
            
            Entrypoint --> FastAPI
            FastAPI --> PDFModule
            FastAPI --> Engine
            PDFModule --> ContextStore
            ContextStore --> RAGEngine
        end
        
        Router -- "/* (Static Assets)" --> FrontendHost
        Router -- "/api/* (API Calls)" --> ServerlessAPI
    end

    subgraph External["☁️ External Cloud Services"]
        Gemini["Google Gemini AI API\n(gemini-2.5-flash)"]
    end

    Client -- "HTTPS Requests" --> Router
    RAGEngine -- "Context + User Prompt\n(via GOOGLE_API_KEY)" --> Gemini
    Gemini -- "Intelligent Natural Response" --> RAGEngine
```

---

## 2. Sequence Diagram: Resume Upload & Query Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant Frontend as 💻 React Frontend
    participant Gateway as ▲ Vercel Router
    participant API as ⚡ FastAPI Serverless
    participant Loader as 📄 PDF Loader
    participant Engine as 🧠 RAG Engine
    participant Gemini as 🤖 Google Gemini AI

    %% Step 1: Upload
    rect rgb(30, 41, 59)
    note right of User: Step 1: Resume Upload Flow
    User->>Frontend: Drag & drop PDF resume
    Frontend->>Gateway: POST /api/upload (multipart/form-data)
    Gateway->>API: Route to api/index.py -> upload_resume()
    API->>Loader: load_pdf(file_path)
    Loader->>Loader: Extract text pages
    Loader->>Loader: clean_spaced_text()
    Loader-->>API: Cleaned structured resume text
    API->>Engine: Initialize RAGEngine(resume_content)
    Engine-->>API: Initialized (characters count)
    API-->>Gateway: HTTP 200 { status: "success", content_length: N }
    Gateway-->>Frontend: HTTP 200 OK
    Frontend-->>User: Show Chat Interface with Sample Questions
    end

    %% Step 2: Query
    rect rgb(15, 23, 42)
    note right of User: Step 2: Intelligent Q&A Flow
    User->>Frontend: Enter question ("What are your technical skills?")
    Frontend->>Gateway: POST /api/chat { message: "..." }
    Gateway->>API: Route to api/index.py -> chat()
    API->>Engine: query(question)
    Engine->>Engine: Build Augmented Prompt (System Prompt + Resume Context + User Question)
    Engine->>Gemini: generate_content(prompt)
    Gemini-->>Engine: Generated AI response in 1st person
    Engine-->>API: Formatted answer dict
    API-->>Gateway: HTTP 200 { answer: "...", context: [...] }
    Gateway-->>Frontend: HTTP 200 OK
    Frontend-->>User: Display AI message bubble
    end
```

---

## 3. Component & Module Architecture

```mermaid
classDiagram
    class FrontendApp {
        +LandingPage
        +ResumeUpload
        +ChatInterface
        +TypingIndicator
        +MessageBubble
    }

    class APIClient {
        +sendMessage(message)
        +uploadResume(file)
        +getStatus()
        +initializeRAG(forceReload)
        +resetSystem()
    }

    class MainAPI {
        +root()
        +get_status()
        +upload_resume(file)
        +initialize_rag(force_reload)
        +chat(request)
        +get_sample_questions()
        +reset_system()
    }

    class PDFLoader {
        +clean_spaced_text(text)
        +load_pdf(file_path)
        +load_pdf_sync(file_path)
    }

    class RAGEngine {
        +resume_path: str
        +resume_content: str
        +system_prompt: str
        +initialize(force_reload)
        +query(question)
        +get_status()
    }

    class GeminiAPI {
        +model: gemini-2.5-flash
        +generate_content(prompt)
    }

    FrontendApp --> APIClient : uses
    APIClient --> MainAPI : HTTP / JSON
    MainAPI --> PDFLoader : extracts text
    MainAPI --> RAGEngine : delegates queries
    RAGEngine --> GeminiAPI : generative calls
```

---

## 4. Deployment Infrastructure

```mermaid
graph LR
    subgraph Repo["GitHub Repository (sarjanthecoder/RAG)"]
        Code["Branch: main"]
    end

    subgraph CI_CD["Vercel CI/CD Pipeline"]
        Webhook["GitHub Webhook Trigger"]
        BuildStep["Build: Vite Build -> frontend/dist"]
        PyDeps["Install: pip install -r requirements.txt"]
    end

    subgraph Edge["Global Vercel Edge"]
        Domain["https://rag-t6zf.vercel.app"]
        CDN["Static CDN Cache"]
        Lambda["Python 3 Serverless Execution"]
    end

    Code --> Webhook
    Webhook --> BuildStep
    Webhook --> PyDeps
    BuildStep --> CDN
    PyDeps --> Lambda
    CDN --> Domain
    Lambda --> Domain
```
