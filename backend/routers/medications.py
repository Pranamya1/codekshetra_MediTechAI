"""Medications router — manage prescriptions."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException
from models import Medication, MedicationCreate

router = APIRouter()

_MEDICATIONS: list[Medication] = []


@router.post("/", response_model=Medication, status_code=201, summary="Create a medication prescription")
async def create_medication(payload: MedicationCreate) -> Medication:
    med = Medication(**payload.model_dump())
    _MEDICATIONS.append(med)
    return med


@router.get("/{patient_id}", response_model=list[Medication], summary="Get medications for a patient")
async def get_medications(patient_id: uuid.UUID) -> list[Medication]:
    meds = [m for m in _MEDICATIONS if m.patient_id == patient_id]
    if not meds:
        raise HTTPException(status_code=404, detail="No medications found for this patient")
    return meds
