"""
Vercel Serverless Function Handler
Exposes the FastAPI application to Vercel
"""

import os
import sys

# Flag for Vercel environment
os.environ["VERCEL"] = "1"

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import the FastAPI app from backend/main.py
from main import app
