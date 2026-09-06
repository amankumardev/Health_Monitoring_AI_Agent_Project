# Health Agent Service

This FastAPI service keeps the LLM key off the browser and generates assistant responses from the authenticated app's health summaries.

1. Copy `.env.example` to `.env` and set `GROQ_API_KEY`.
2. Install dependencies: `python -m pip install -r requirements.txt`
3. Start the service: `python -m uvicorn main:app --reload --port 8000`

The default model is `openai/gpt-oss-20b`, which is available to the configured Groq account. The frontend uses `http://localhost:8000` by default. To use another address, set `VITE_AGENT_API_URL` in `frontend/.env`.

If the service is not configured or temporarily unavailable, the existing local health-response logic remains available; no API key is exposed to the client.
