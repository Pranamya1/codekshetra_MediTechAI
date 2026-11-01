"""
MediCare AI — FastAPI Backend Foundation
Team Lead responsibility: This file provides the shared API scaffold.

Run with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import ai, patients, vitals, medications, appointments

load_dotenv()

# ─── App lifecycle ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle hook."""
    print("🏥 MediCare AI backend starting up…")
    yield
    print("🏥 MediCare AI backend shutting down…")


# ─── FastAPI application ──────────────────────────────────────────────────────

app = FastAPI(
    title="MediCare AI API",
    description=(
        "REST API for the MediCare AI health dashboard. "
        "Powered by FastAPI, Supabase (PostgreSQL), and Google Gemini."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

# Mount both standard and /api prefixed routes for seamless reverse-proxy and direct access
app.include_router(ai.router,           prefix="/ai",              tags=["AI / Gemini"])
app.include_router(ai.router,           prefix="/api/ai",          tags=["AI / Gemini"])
app.include_router(patients.router,     prefix="/patients",        tags=["Patients"])
app.include_router(patients.router,     prefix="/api/patients",    tags=["Patients"])
app.include_router(vitals.router,       prefix="/vitals",          tags=["Vitals"])
app.include_router(vitals.router,       prefix="/api/vitals",      tags=["Vitals"])
app.include_router(medications.router,  prefix="/medications",     tags=["Medications"])
app.include_router(medications.router,  prefix="/api/medications", tags=["Medications"])
app.include_router(appointments.router, prefix="/appointments",    tags=["Appointments"])
app.include_router(appointments.router, prefix="/api/appointments",tags=["Appointments"])

# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Liveness probe for deployment orchestration."""
    return {"status": "ok", "service": "MediCare AI API", "version": "0.1.0"}


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {"message": "Welcome to MediCare AI API. Visit /docs for API reference."}
