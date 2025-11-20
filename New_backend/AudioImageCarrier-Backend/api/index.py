"""ASGI handler for Vercel deployment."""
from app.main import app

# Vercel expects a variable named 'app' or 'application'
# This file serves as the entry point
