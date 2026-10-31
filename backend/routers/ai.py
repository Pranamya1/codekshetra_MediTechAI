"""
AI router — Gemini Flash chat endpoint.
Member 4 should extend this with patient context injection and streaming.
"""

from __future__ import annotations

import os
from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types as genai_types

from models import AIChatRequest, AIChatResponse

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
    return genai.Client(api_key=api_key)


@router.post("/chat", response_model=AIChatResponse, summary="Send a message to Gemini AI")
async def chat(request: AIChatRequest) -> AIChatResponse:
    """
    Sends a conversation to Gemini Flash and returns an AI reply.
    Includes a medical disclaimer in every response.
    """
    client = _get_gemini_client()

    # Build history for multi-turn conversation
    history = [
        genai_types.Content(
            role=msg.role if msg.role in ("user", "model") else "user",
            parts=[genai_types.Part(text=msg.content)],
        )
        for msg in request.messages[:-1]   # all but last
    ]

    user_message = request.messages[-1].content if request.messages else ""

    try:
        response = client.models.generate_content(
            model=request.model,
            contents=history + [
                genai_types.Content(role="user", parts=[genai_types.Part(text=user_message)])
            ],
            config=genai_types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
                temperature=0.3,
            ),
        )
        reply_text = response.text or "I'm sorry, I couldn't generate a response."
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc}") from exc

    return AIChatResponse(
        reply=reply_text,
        disclaimers=[
            "This is AI-generated information and is NOT a substitute for professional medical advice, diagnosis, or treatment."
        ],
    )
