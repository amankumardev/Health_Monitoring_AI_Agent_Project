"""Health assistant LLM service. Run with: uvicorn main:app --reload --port 8000"""
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Health Monitoring Agent", version="1.0.0")
origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["POST", "GET"], allow_headers=["Content-Type"])


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class AgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    language: str = Field(default="en-US", max_length=16)
    history: list[HistoryItem] = Field(default_factory=list, max_length=12)
    health_context: list[str] = Field(default_factory=list, max_length=8)


class AgentResponse(BaseModel):
    content: str
    provider: str


class TranscriptionResponse(BaseModel):
    text: str


SYSTEM_PROMPT = """You are a supportive health-monitoring and general health-education assistant.

You can answer general educational questions about diseases and symptoms, including cancer, diabetes, heart disease, infections, mental health, nutrition, sleep, exercise, and prevention. Explain what the condition is, common risk factors or symptoms, how clinicians commonly evaluate it, and evidence-based next steps. Give a direct, useful answer even when there is no personal health context.

Use only supplied user health context for personal readings; never invent readings, diagnoses, test results, or medical history. Do not diagnose, prescribe medication, recommend changing medication, or claim that a condition is cured. Encourage appropriate clinician review for persistent or concerning symptoms. For possible emergencies (chest pain, trouble breathing, stroke symptoms, severe bleeding, self-harm, or severe allergic reactions), clearly tell the person to seek emergency help immediately.

Default response format: use simple words, 3–5 short bullet points, and stay below 120 words. Do not use tables, long lists, or detailed mechanisms unless the user explicitly asks for a detailed answer. Reply in the requested language/locale."""


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/v1/respond", response_model=AgentResponse)
def respond(request: AgentRequest) -> AgentResponse:
    # Reload local development configuration so an updated key/model is used
    # immediately; production deployments should provide environment variables.
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service is not configured. Set GROQ_API_KEY in agent-service/.env.")

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        context = "\n".join(f"- {item}" for item in request.health_context) or "No personal health data was retrieved."
        history = "\n".join(f"{item.role.title()}: {item.content}" for item in request.history[-12:])
        prompt = f"Requested locale: {request.language}\n\nPersonal health context:\n{context}\n\nRecent conversation:\n{history}\n\nUser: {request.message}"
        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=350,
        )
        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise ValueError("The model returned an empty response")
        return AgentResponse(content=text, provider="groq")
    except HTTPException:
        raise
    except Exception as exc:
        # Do not leak provider or credential details to the browser.
        raise HTTPException(status_code=502, detail="The AI provider could not generate a response. Please try again.") from exc


@app.post("/v1/transcribe", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...), language: str = Form("en")) -> TranscriptionResponse:
    """Transcribe browser-recorded audio without relying on Web Speech services."""
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service is not configured. Set GROQ_API_KEY in agent-service/.env.")
    if audio.content_type and not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="An audio recording is required.")
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="The recording was empty.")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The recording is too large. Please keep it under 25 MB.")
    try:
        from groq import Groq
        extension = (audio.filename or "recording.webm").rsplit(".", 1)[-1]
        client = Groq(api_key=api_key)
        result = client.audio.transcriptions.create(
            file=(f"recording.{extension}", content),
            model="whisper-large-v3-turbo",
            language=language.split("-", 1)[0].lower(),
            response_format="json",
            temperature=0.0,
        )
        text = (result.text or "").strip()
        if not text:
            raise ValueError("Empty transcription")
        return TranscriptionResponse(text=text)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Audio transcription failed. Check your Groq configuration and try again.") from exc
