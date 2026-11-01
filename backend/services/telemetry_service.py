"""
Biometric Telemetry & AI Clinical Risk Evaluation Service.
Handles wearable ingestion, real-time AI clinical analysis (OpenAI / Gemini),
hybrid rule-based alert triggering, and asynchronous Supabase persistence.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI
from google import genai
from google.genai import types as genai_types
from supabase import create_async_client, AsyncClient

from models import (
    AlertSeverity,
    ClinicalAssessment,
    MedicalAlert,
    RiskLevel,
    Vitals,
    WearableTelemetryPacket,
)

load_dotenv()
logger = logging.getLogger("telemetry_service")

# ─── Clinical System Prompt ────────────────────────────────────────────────────

CLINICAL_AI_SYSTEM_PROMPT = """You are an expert Board-Certified Acute Care Physician and Clinical AI Evaluator for MediTechAI.
You analyze streaming biometric telemetry from wearable sensors in real time against adult physiological reference standards:

STANDARD ADULT PHYSIOLOGICAL REFERENCE RANGES:
- Heart Rate (HR): 60-100 bpm (Tachycardia: >100 bpm; Severe: >120 bpm; Bradycardia: <60 bpm; Severe: <45 bpm)
- Blood Pressure (BP):
  * Normal: Systolic <120 AND Diastolic <80 mmHg
  * Elevated: Systolic 120-129 AND Diastolic <80 mmHg
  * Stage 1 Hypertension: Systolic 130-139 OR Diastolic 80-89 mmHg
  * Stage 2 Hypertension: Systolic >=140 OR Diastolic >=90 mmHg
  * Hypertensive Crisis / Urgency: Systolic >=160 OR Diastolic >=100 mmHg
- Oxygen Saturation (SpO2): 95-100% (Mild Hypoxia: 92-94%; Critical Hypoxemia: <92%)
- Core Temperature: 36.1-37.2°C (Low fever: 37.3-38.0°C; High fever: >38.5°C; Hypothermia: <35.0°C)
- Respiratory Rate: 12-20 breaths/min (Tachypnea: >24 br/min; Bradypnea: <8 br/min)

STRICT EVALUATION INSTRUCTIONS:
1. Determine risk_level: exactly one of ["NORMAL", "INFO", "WARNING", "CRITICAL"].
2. Write assessment_summary: EXACTLY a 2-sentence clinical interpretation summarizing the hemodynamic state and any imminent threats.
3. Provide actionable_steps: A JSON array of 2 to 4 immediate, concrete clinical instructions for the patient and caregiver.
4. Set triage_code: exactly one of ["GREEN", "YELLOW", "ORANGE", "RED"].

RESPONSE FORMAT:
You MUST respond with valid JSON matching this schema:
{
  "risk_level": "NORMAL" | "INFO" | "WARNING" | "CRITICAL",
  "assessment_summary": "Two concise sentences interpreting the telemetry.",
  "actionable_steps": ["Action 1", "Action 2", "Action 3"],
  "triage_code": "GREEN" | "YELLOW" | "ORANGE" | "RED"
}
"""

# ─── Client Singletons & Helpers ──────────────────────────────────────────────

def _get_openai_client() -> Optional[AsyncOpenAI]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return AsyncOpenAI(api_key=api_key)


def _get_gemini_client() -> Optional[genai.Client]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(
        api_key=api_key,
        http_options=genai_types.HttpOptions(timeout=15_000),
    )


async def get_async_supabase_client() -> Optional[AsyncClient]:
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        return None
    try:
        return await create_async_client(url, key)
    except Exception as exc:
        logger.warning(f"Could not connect to Supabase: {exc}")
        return None


# ─── Heuristic Clinical Fallback Engine ───────────────────────────────────────

def _evaluate_heuristic_fallback(packet: WearableTelemetryPacket) -> ClinicalAssessment:
    """Deterministic medical rule engine when LLM endpoints are unreachable."""
    critical_flags: list[str] = []
    warning_flags: list[str] = []

    # SpO2
    if packet.oxygen_saturation < 90:
        critical_flags.append(f"Severe hypoxemia (SpO2 {packet.oxygen_saturation}%)")
    elif packet.oxygen_saturation < 92:
        critical_flags.append(f"Critical oxygen desaturation (SpO2 {packet.oxygen_saturation}%)")
    elif packet.oxygen_saturation < 95:
        warning_flags.append(f"Mild hypoxia (SpO2 {packet.oxygen_saturation}%)")

    # Heart Rate
    if packet.heart_rate > 120:
        critical_flags.append(f"Marked tachycardia ({packet.heart_rate} bpm)")
    elif packet.heart_rate < 45:
        critical_flags.append(f"Severe bradycardia ({packet.heart_rate} bpm)")
    elif packet.heart_rate > 100:
        warning_flags.append(f"Sinus tachycardia ({packet.heart_rate} bpm)")
    elif packet.heart_rate < 60:
        warning_flags.append(f"Sinus bradycardia ({packet.heart_rate} bpm)")

    # Blood Pressure
    if packet.systolic_bp >= 160 or packet.diastolic_bp >= 100:
        critical_flags.append(f"Hypertensive crisis range ({packet.systolic_bp}/{packet.diastolic_bp} mmHg)")
    elif packet.systolic_bp >= 140 or packet.diastolic_bp >= 90:
        warning_flags.append(f"Stage 2 hypertension ({packet.systolic_bp}/{packet.diastolic_bp} mmHg)")
    elif packet.systolic_bp >= 130 or packet.diastolic_bp >= 80:
        warning_flags.append(f"Stage 1 elevated BP ({packet.systolic_bp}/{packet.diastolic_bp} mmHg)")

    # Respiratory Rate
    if packet.respiratory_rate >= 28 or packet.respiratory_rate <= 8:
        critical_flags.append(f"Acute respiratory rate deviation ({packet.respiratory_rate} br/min)")
    elif packet.respiratory_rate > 24 or packet.respiratory_rate < 10:
        warning_flags.append(f"Abnormal respiratory rate ({packet.respiratory_rate} br/min)")

    # Temperature
    if packet.temperature >= 39.0 or packet.temperature <= 35.0:
        critical_flags.append(f"Extreme core temperature deviation ({packet.temperature}°C)")
    elif packet.temperature >= 38.2:
        warning_flags.append(f"Febrile state ({packet.temperature}°C)")

    if critical_flags:
        summary = (
            f"Telemetry indicates acute physiological compromise with {', '.join(critical_flags[:2])}. "
            "Immediate clinical triage and emergency hemodynamic stabilization are advised."
        )
        return ClinicalAssessment(
            risk_level=RiskLevel.CRITICAL,
            assessment_summary=summary,
            actionable_steps=[
                "Rest in a seated or semi-recumbent posture immediately.",
                "Administer prescribed supplemental oxygen or emergency vasodilators if indicated.",
                "Notify emergency medical services or contact on-call cardiologist immediately.",
            ],
            triage_code="RED",
        )

    if warning_flags:
        summary = (
            f"Telemetry reveals moderate physiological abnormalities involving {', '.join(warning_flags[:2])}. "
            "Patient remains hemodynamically stable but requires close clinical monitoring."
        )
        return ClinicalAssessment(
            risk_level=RiskLevel.WARNING,
            assessment_summary=summary,
            actionable_steps=[
                "Sit quietly and avoid strenuous physical exertion.",
                "Recheck vital signs in 10 to 15 minutes to verify trend.",
                "Verify prescribed medication compliance with caregiver.",
            ],
            triage_code="ORANGE",
        )

    return ClinicalAssessment(
        risk_level=RiskLevel.NORMAL,
        assessment_summary=(
            f"All biometric indicators are within physiological adult thresholds (HR {packet.heart_rate} bpm, "
            f"BP {packet.systolic_bp}/{packet.diastolic_bp} mmHg, SpO2 {packet.oxygen_saturation}%). "
            "Hemodynamic parameters reflect stable autonomic and cardiopulmonary equilibrium."
        ),
        actionable_steps=[
            "Continue regular daily routine and maintain adequate hydration.",
            "Wearable sensor telemetry stream operating nominally.",
        ],
        triage_code="GREEN",
    )


# ─── AI Evaluation Engine (OpenAI gpt-4o-mini + Gemini) ────────────────────────

async def evaluate_vitals_clinical_ai(packet: WearableTelemetryPacket) -> ClinicalAssessment:
    """
    Evaluates vitals packet in real time with OpenAI gpt-4o-mini.
    Falls back to Gemini Flash or deterministic clinical heuristic engine.
    """
    payload_dict = {
        "heart_rate_bpm": packet.heart_rate,
        "blood_pressure_mmHg": f"{packet.systolic_bp}/{packet.diastolic_bp}",
        "systolic_bp": packet.systolic_bp,
        "diastolic_bp": packet.diastolic_bp,
        "oxygen_saturation_pct": packet.oxygen_saturation,
        "temperature_celsius": packet.temperature,
        "respiratory_rate_br_min": packet.respiratory_rate,
        "blood_glucose_mg_dl": packet.blood_glucose,
        "body_weight_kg": packet.weight,
        "transmission_channel": packet.transmission_channel,
        "device_id": packet.device_id,
    }
    user_prompt = f"Patient Biometric Telemetry Packet:\n{json.dumps(payload_dict, indent=2)}"

    # 1. Primary: OpenAI gpt-4o-mini
    openai_client = _get_openai_client()
    if openai_client:
        try:
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": CLINICAL_AI_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=300,
            )
            raw_content = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_content)
            return ClinicalAssessment(
                risk_level=RiskLevel(parsed.get("risk_level", "INFO").upper()),
                assessment_summary=parsed.get("assessment_summary", "Clinical assessment generated by AI."),
                actionable_steps=parsed.get("actionable_steps", ["Recheck vitals in 15 minutes."]),
                triage_code=parsed.get("triage_code", "GREEN"),
            )
        except Exception as exc:
            logger.warning(f"OpenAI gpt-4o-mini clinical evaluation failed: {exc}")

    # 2. Secondary: Google Gemini Flash
    gemini_client = _get_gemini_client()
    if gemini_client:
        try:
            gemini_response = gemini_client.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=f"{CLINICAL_AI_SYSTEM_PROMPT}\n\n{user_prompt}",
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=300,
                ),
            )
            raw_text = gemini_response.text or "{}"
            parsed = json.loads(raw_text)
            return ClinicalAssessment(
                risk_level=RiskLevel(parsed.get("risk_level", "INFO").upper()),
                assessment_summary=parsed.get("assessment_summary", "Clinical assessment generated by Gemini."),
                actionable_steps=parsed.get("actionable_steps", ["Recheck vitals in 15 minutes."]),
                triage_code=parsed.get("triage_code", "GREEN"),
            )
        except Exception as exc:
            logger.warning(f"Gemini fallback clinical evaluation failed: {exc}")

    # 3. Tertiary: Deterministic ACC/AHA & WHO clinical heuristic engine
    return _evaluate_heuristic_fallback(packet)


# ─── Hybrid Rule-Based + AI Alert Trigger ─────────────────────────────────────

def evaluate_hybrid_medical_alert(
    packet: WearableTelemetryPacket,
    assessment: ClinicalAssessment,
) -> Optional[MedicalAlert]:
    """
    Evaluates physiological telemetry against safety thresholds and combines
    with AI clinical risk level to synthesize an urgent MedicalAlert record.
    """
    reasons: list[str] = []
    is_critical = False
    is_warning = False

    # 1. SpO2 < 92% (Critical hypoxemia)
    if packet.oxygen_saturation < 92:
        is_critical = True
        reasons.append(f"SpO2 severely depressed at {packet.oxygen_saturation}% (< 92% threshold)")
    elif packet.oxygen_saturation < 95:
        is_warning = True
        reasons.append(f"SpO2 suboptimal at {packet.oxygen_saturation}%")

    # 2. HR > 120 bpm or < 45 bpm
    if packet.heart_rate > 120:
        is_critical = True
        reasons.append(f"Heart rate dangerous tachycardia at {packet.heart_rate} bpm (> 120 bpm)")
    elif packet.heart_rate < 45:
        is_critical = True
        reasons.append(f"Heart rate severe bradycardia at {packet.heart_rate} bpm (< 45 bpm)")
    elif packet.heart_rate > 100:
        is_warning = True
        reasons.append(f"Elevated heart rate at {packet.heart_rate} bpm")

    # 3. Systolic BP > 140 mmHg
    if packet.systolic_bp >= 160 or packet.diastolic_bp >= 100:
        is_critical = True
        reasons.append(f"Blood pressure hypertensive crisis at {packet.systolic_bp}/{packet.diastolic_bp} mmHg")
    elif packet.systolic_bp > 140 or packet.diastolic_bp > 90:
        is_warning = True
        reasons.append(f"Blood pressure Stage 2 hypertension at {packet.systolic_bp}/{packet.diastolic_bp} mmHg (> 140/90)")

    # 4. Temperature extreme
    if packet.temperature >= 38.8 or packet.temperature <= 35.0:
        is_critical = True
        reasons.append(f"Body temperature critical at {packet.temperature}°C")

    # 5. Respiratory Rate
    if packet.respiratory_rate >= 26 or packet.respiratory_rate <= 8:
        is_critical = True
        reasons.append(f"Respiratory rate abnormal at {packet.respiratory_rate} br/min")

    # 6. AI risk escalation override
    if assessment.risk_level == RiskLevel.CRITICAL:
        is_critical = True
        reasons.append("AI Clinical Engine flagged CRITICAL patient deterioration")
    elif assessment.risk_level == RiskLevel.WARNING and not is_critical:
        is_warning = True

    if not (is_critical or is_warning):
        return None

    severity = AlertSeverity.critical if is_critical else AlertSeverity.warning
    title = (
        f"Critical Biometric Telemetry Alert"
        if is_critical
        else "Wearable Telemetry Caution"
    )
    message = (
        f"Triggered by: {'; '.join(reasons)}. "
        f"{assessment.assessment_summary} "
        f"Next steps: {', '.join(assessment.actionable_steps[:2])}"
    )

    return MedicalAlert(
        id=uuid.uuid4(),
        patient_id=packet.patient_id,
        triggered_at=datetime.utcnow(),
        severity=severity,
        category="wearable_telemetry",
        title=title,
        message=message,
        acknowledged=False,
    )


# ─── Asynchronous Supabase Persistence ─────────────────────────────────────────

async def sync_telemetry_to_supabase(
    vitals: Vitals,
    alert: Optional[MedicalAlert] = None,
) -> dict[str, Any]:
    """
    Stores raw telemetry vitals and any generated alert into Supabase asynchronously.
    """
    result: dict[str, Any] = {
        "vitals_saved": False,
        "alert_saved": False,
        "error": None,
    }

    client = await get_async_supabase_client()
    if not client:
        result["error"] = "Supabase async client uninitialized (credentials missing)"
        return result

    # 1. Insert into vitals table
    try:
        vitals_row = {
            "id": str(vitals.id),
            "patient_id": str(vitals.patient_id),
            "recorded_at": vitals.recorded_at.isoformat(),
            "heart_rate": vitals.heart_rate,
            "systolic_bp": vitals.systolic_bp,
            "diastolic_bp": vitals.diastolic_bp,
            "oxygen_saturation": vitals.oxygen_saturation,
            "temperature": vitals.temperature,
            "respiratory_rate": vitals.respiratory_rate,
        }
        if vitals.blood_glucose is not None:
            vitals_row["blood_glucose"] = vitals.blood_glucose
        if vitals.weight is not None:
            vitals_row["weight"] = vitals.weight

        await client.table("vitals").insert(vitals_row).execute()
        result["vitals_saved"] = True
    except Exception as exc:
        logger.warning(f"Error persisting vitals row to Supabase: {exc}")
        result["error"] = str(exc)

    # 2. Insert alert if triggered
    if alert:
        alert_row = {
            "id": str(alert.id),
            "patient_id": str(alert.patient_id),
            "triggered_at": alert.triggered_at.isoformat(),
            "severity": alert.severity.value,
            "category": alert.category,
            "title": alert.title,
            "message": alert.message,
            "acknowledged": alert.acknowledged,
        }
        try:
            await client.table("medical_alerts").insert(alert_row).execute()
            result["alert_saved"] = True
        except Exception:
            try:
                # Fallback to alternate table name 'alerts'
                await client.table("alerts").insert(alert_row).execute()
                result["alert_saved"] = True
            except Exception as alert_exc:
                logger.warning(f"Error persisting alert row to Supabase: {alert_exc}")
                if not result["error"]:
                    result["error"] = str(alert_exc)

    return result
