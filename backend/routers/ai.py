"""
AI router — Gemini Flash chat endpoint.
Member 4 should extend this with patient context injection and streaming.
"""

from __future__ import annotations

import os
import time
from fastapi import APIRouter, HTTPException, status
from google import genai
from google.genai import types as genai_types

from models import (
    AIChatRequest,
    AIChatResponse,
    Vitals,
    WearableTelemetryPacket,
    VitalsStreamResponse,
)
from services.telemetry_service import (
    evaluate_vitals_clinical_ai,
    evaluate_hybrid_medical_alert,
    sync_telemetry_to_supabase,
)

router = APIRouter()

SYSTEM_PROMPT = """You are MediCare AI, a clinical AI assistant powered by Google Gemini.
You help doctors, patients, and caregivers understand medical information.

Rules:
- Always recommend consulting a licensed healthcare professional for diagnosis or treatment decisions.
- Be concise, clear, and empathetic.
- Use plain language unless speaking to a doctor (detected by context).
- Never fabricate drug names, dosages, or clinical data.
- Add a disclaimer at the end of every medical recommendation.
"""


def _get_gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")
    return genai.Client(
        api_key=api_key,
        http_options=genai_types.HttpOptions(timeout=20_000),
    )


@router.post("/chat", response_model=AIChatResponse, summary="Send a message to Gemini AI")
async def chat(request: AIChatRequest) -> AIChatResponse:
    """
    Sends a conversation to Gemini Flash and returns an AI reply.
    Includes a medical disclaimer in every response.
    """
    client = _get_gemini_client()

    def _gemini_role(role: str) -> str:
        if role in ("assistant", "model"):
            return "model"
        return "user"

    # Build history for multi-turn conversation
    history = [
        genai_types.Content(
            role=_gemini_role(msg.role),
            parts=[genai_types.Part(text=msg.content)],
        )
        for msg in request.messages[:-1]   # all but last
    ]

    user_message = request.messages[-1].content if request.messages else ""
    # Ordered fallback models that support generateContent on current Gemini API
    raw_candidates = [
        "gemini-flash-lite-latest",
        request.model if request.model else "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemma-4-26b-a4b-it",
    ]
    seen = set()
    model_candidates = [m for m in raw_candidates if not (m in seen or seen.add(m))]

    last_error: Exception | None = None
    reply_text = ""
    contents = history + [
        genai_types.Content(role="user", parts=[genai_types.Part(text=user_message)])
    ]
    config = genai_types.GenerateContentConfig(
        system_instruction=request.system_instruction or SYSTEM_PROMPT,
        max_output_tokens=1024,
        temperature=0.3,
    )
    for model_name in model_candidates:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                reply_text = response.text or "I'm sorry, I couldn't generate a response."
                last_error = None
                break
            except Exception as exc:
                last_error = exc
                message = str(exc).lower()
                retryable = ("high demand" in message or "unavailable" in message
                             or "503" in message or "504" in message or "deadline" in message)
                if attempt < 1 and retryable:
                    time.sleep(1.2 * (attempt + 1))
                    continue
                break
        if last_error is None:
            break
    if last_error is not None:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {last_error}") from last_error

    return AIChatResponse(
        reply=reply_text,
        disclaimers=[
            "This is AI-generated information and is NOT a substitute for professional medical advice, diagnosis, or treatment."
        ],
    )


# ─── Wearable Telemetry & AI Risk-Assessment Stream ───────────────────────────

@router.post(
    "/vitals-stream",
    response_model=VitalsStreamResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest Wearable Telemetry & Compute AI Risk Assessment",
    description=(
        "Receives live JSON telemetry packets from wearable devices (via Web Bluetooth / Mobile), "
        "validates physiological metrics, runs real-time AI clinical evaluation, triggers automated "
        "safety alerts, and asynchronously persists vitals and alerts to Supabase."
    ),
)
async def vitals_stream(packet: WearableTelemetryPacket) -> VitalsStreamResponse:
    """
    Biometric telemetry stream endpoint:
    1. Validates payload against VitalsCreate and WearableTelemetryPacket schema.
    2. Runs AI Clinical Evaluation Engine (OpenAI gpt-4o-mini / Gemini fallback).
    3. Triggers hybrid rule-based + AI alert if vitals enter danger zones.
    4. Persists raw vitals and any generated MedicalAlert into Supabase asynchronously.
    """
    try:
        # 1. Instantiate Vitals model aligned with existing schema
        vitals_payload = packet.model_dump(
            exclude={"device_id", "device_name", "battery_level", "transmission_channel"}
        )
        vitals_record = Vitals(**vitals_payload)

        # 2. Run real-time AI Clinical Evaluation
        clinical_assessment = await evaluate_vitals_clinical_ai(packet)

        # 3. Hybrid safety alert trigger
        alert = evaluate_hybrid_medical_alert(packet, clinical_assessment)

        # 4. Async Supabase persistence
        db_sync_result = await sync_telemetry_to_supabase(vitals_record, alert)

        return VitalsStreamResponse(
            success=True,
            status="telemetry_processed",
            vitals_recorded=vitals_record,
            clinical_assessment=clinical_assessment,
            alert_triggered=alert is not None,
            alert=alert,
            db_sync=db_sync_result,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Telemetry streaming evaluation failed: {str(exc)}",
        ) from exc

