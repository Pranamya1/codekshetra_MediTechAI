"""Patients router — CRUD endpoints. Member 3 wires these to Supabase."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException
from models import Patient, PatientCreate

router = APIRouter()

# TODO (Member 3): Replace in-memory store with Supabase client calls
_PATIENTS: dict[str, Patient] = {}


@router.post("/", response_model=Patient, status_code=201, summary="Create a patient record")
async def create_patient(payload: PatientCreate) -> Patient:
    patient = Patient(**payload.model_dump())
    _PATIENTS[str(patient.id)] = patient
    return patient


@router.get("/", response_model=list[Patient], summary="List all patients")
async def list_patients() -> list[Patient]:
    return list(_PATIENTS.values())


@router.get("/{patient_id}", response_model=Patient, summary="Get a patient by ID")
async def get_patient(patient_id: uuid.UUID) -> Patient:
    patient = _PATIENTS.get(str(patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
