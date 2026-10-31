"""Vitals router — record and retrieve vital sign readings."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException
from models import Vitals, VitalsCreate

router = APIRouter()

_VITALS: list[Vitals] = []


@router.post("/", response_model=Vitals, status_code=201, summary="Record a vitals snapshot")
async def record_vitals(payload: VitalsCreate) -> Vitals:
    vitals = Vitals(**payload.model_dump())
    _VITALS.append(vitals)
    return vitals


@router.get("/{patient_id}", response_model=list[Vitals], summary="Get vitals history for a patient")
async def get_vitals(patient_id: uuid.UUID) -> list[Vitals]:
    history = [v for v in _VITALS if v.patient_id == patient_id]
    if not history:
        raise HTTPException(status_code=404, detail="No vitals found for this patient")
    return sorted(history, key=lambda v: v.recorded_at)
