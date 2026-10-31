"""Appointments router — schedule and manage appointments."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException
from models import Appointment, AppointmentCreate

router = APIRouter()

_APPOINTMENTS: list[Appointment] = []


@router.post("/", response_model=Appointment, status_code=201, summary="Schedule an appointment")
async def create_appointment(payload: AppointmentCreate) -> Appointment:
    appt = Appointment(**payload.model_dump())
    _APPOINTMENTS.append(appt)
    return appt


@router.get("/{patient_id}", response_model=list[Appointment], summary="Get appointments for a patient")
async def get_appointments(patient_id: uuid.UUID) -> list[Appointment]:
    appts = [a for a in _APPOINTMENTS if a.patient_id == patient_id]
    if not appts:
        raise HTTPException(status_code=404, detail="No appointments found for this patient")
    return sorted(appts, key=lambda a: a.scheduled_at)
