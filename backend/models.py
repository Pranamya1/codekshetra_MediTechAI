"""
Pydantic models for MediCare AI backend.
These mirror the TypeScript interfaces in frontend/src/types/medical.ts.

Member 3 should ensure the field names match the Supabase table columns
(snake_case on backend ↔ camelCase on frontend via alias_generator or manual aliasing).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel, Field


# ─── Enumerations ─────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    patient   = "patient"
    caregiver = "caregiver"
    doctor    = "doctor"


class BloodType(str, Enum):
    A_POS  = "A+"
    A_NEG  = "A-"
    B_POS  = "B+"
    B_NEG  = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS  = "O+"
    O_NEG  = "O-"


class AlertSeverity(str, Enum):
    info     = "info"
    warning  = "warning"
    critical = "critical"


class MedicationStatus(str, Enum):
    active        = "active"
    discontinued  = "discontinued"
    on_hold       = "on_hold"


class AppointmentStatus(str, Enum):
    scheduled  = "scheduled"
    completed  = "completed"
    cancelled  = "cancelled"
    no_show    = "no_show"


# ─── Base model with UUID id ──────────────────────────────────────────────────

class BaseRecord(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}


# ─── Patient ──────────────────────────────────────────────────────────────────

class EmergencyContact(BaseModel):
    name:         str
    relationship: str
    phone:        str
    email:        Optional[str] = None


class PatientBase(BaseModel):
    user_id:        uuid.UUID
    full_name:      str
    date_of_birth:  date
    gender:         str
    blood_type:     BloodType
    height_cm:      float
    weight_kg:      float
    medical_history: list[str] = Field(default_factory=list)
    allergies:       list[str] = Field(default_factory=list)
    emergency_contact: EmergencyContact
    primary_doctor_id:  Optional[uuid.UUID] = None
    caregiver_id:       Optional[uuid.UUID] = None
    insurance_id:       Optional[str]       = None


class PatientCreate(PatientBase):
    pass


class Patient(PatientBase, BaseRecord):
    @property
    def bmi(self) -> float:
        return round(self.weight_kg / ((self.height_cm / 100) ** 2), 1)


# ─── Vitals ───────────────────────────────────────────────────────────────────

class VitalsBase(BaseModel):
    patient_id:          uuid.UUID
    recorded_at:         datetime = Field(default_factory=datetime.utcnow)
    recorded_by:         Optional[uuid.UUID] = None
    heart_rate:          float   # bpm
    systolic_bp:         float   # mmHg
    diastolic_bp:        float   # mmHg
    respiratory_rate:    float   # breaths/min
    oxygen_saturation:   float   # SpO2 %
    temperature:         float   # °C
    blood_glucose:       Optional[float] = None  # mg/dL
    weight:              Optional[float] = None  # kg


class VitalsCreate(VitalsBase):
    pass


class Vitals(VitalsBase, BaseRecord):
    pass


# ─── Wearable Telemetry & AI Risk Models ──────────────────────────────────────

class RiskLevel(str, Enum):
    NORMAL   = "NORMAL"
    INFO     = "INFO"
    WARNING  = "WARNING"
    CRITICAL = "CRITICAL"


class ClinicalAssessment(BaseModel):
    risk_level: RiskLevel = Field(
        ...,
        description="Assessed risk classification: NORMAL, INFO, WARNING, or CRITICAL"
    )
    assessment_summary: str = Field(
        ...,
        description="A concise 2-sentence clinical assessment of the telemetry reading."
    )
    actionable_steps: list[str] = Field(
        default_factory=list,
        description="List of immediate, actionable clinical next steps."
    )
    triage_code: str = Field(
        default="GREEN",
        description="Emergency triage color code: GREEN, YELLOW, ORANGE, or RED."
    )


class WearableTelemetryPacket(VitalsCreate):
    device_id: Optional[str] = Field(
        None,
        description="Hardware identifier or Bluetooth MAC address of wearable"
    )
    device_name: Optional[str] = Field(
        None,
        description="Wearable model name (e.g. Apple Watch, Garmin, Polar H10)"
    )
    battery_level: Optional[float] = Field(
        None,
        description="Battery percentage (0-100)"
    )
    transmission_channel: str = Field(
        default="bluetooth_web",
        description="Ingestion vector: 'bluetooth_web', 'bluetooth_ble_gatt', or 'mobile_app'"
    )


class VitalsStreamResponse(BaseModel):
    success: bool
    status: str
    vitals_recorded: Vitals
    clinical_assessment: ClinicalAssessment
    alert_triggered: bool
    alert: Optional[MedicalAlert] = None
    db_sync: dict[str, Any] = Field(default_factory=dict)


# ─── Medication ───────────────────────────────────────────────────────────────

class MedicationBase(BaseModel):
    patient_id:       uuid.UUID
    prescribed_by_id: uuid.UUID
    name:             str
    brand_name:       Optional[str] = None
    dosage:           str
    frequency:        str
    route:            str
    start_date:       date
    end_date:         Optional[date]   = None
    status:           MedicationStatus = MedicationStatus.active
    instructions:     Optional[str]    = None
    side_effects:     list[str]        = Field(default_factory=list)
    refills_remaining: Optional[int]   = None
    next_refill_date:  Optional[date]  = None


class MedicationCreate(MedicationBase):
    pass


class Medication(MedicationBase, BaseRecord):
    pass


# ─── Appointment ──────────────────────────────────────────────────────────────

class AppointmentBase(BaseModel):
    patient_id:        uuid.UUID
    doctor_id:         uuid.UUID
    scheduled_at:      datetime
    duration_minutes:  int = 30
    type:              str
    status:            AppointmentStatus = AppointmentStatus.scheduled
    reason_for_visit:  str
    notes:             Optional[str] = None
    diagnosis:         Optional[str] = None
    follow_up_required: bool = False


class AppointmentCreate(AppointmentBase):
    pass


class Appointment(AppointmentBase, BaseRecord):
    pass


# ─── Medical Alert ────────────────────────────────────────────────────────────

class MedicalAlert(BaseRecord):
    patient_id:       uuid.UUID
    triggered_at:     datetime = Field(default_factory=datetime.utcnow)
    severity:         AlertSeverity
    category:         str
    title:            str
    message:          str
    acknowledged:     bool            = False
    acknowledged_by:  Optional[uuid.UUID] = None
    acknowledged_at:  Optional[datetime]  = None


# ─── AI Chat ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str   # "user" | "assistant" | "system"
    content: str


class AIChatRequest(BaseModel):
    patient_id: Optional[uuid.UUID] = None
    messages:   list[ChatMessage]
    model:      str = "gemini-flash-lite-latest"
    system_instruction: Optional[str] = None


class AIChatResponse(BaseModel):
    reply:             str
    confidence:        Optional[float] = None
    disclaimers:       list[str] = Field(
        default=["This response is AI-generated and not a substitute for professional medical advice."]
    )
    suggested_actions: list[str] = Field(default_factory=list)
