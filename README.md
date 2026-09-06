# Health Monitoring AI Agent

The project has three local services:

| Service | Folder | Address |
| --- | --- | --- |
| React frontend | `frontend` | `http://localhost:5173` |
| Node.js API + PostgreSQL data layer | `backend` | `http://localhost:4000` |
| FastAPI + Groq health assistant | `agent-service` | `http://localhost:8000` |

## First-time setup

1. Create a PostgreSQL database and configure `backend/.env` from `backend/.env.example`.
2. Run `npm install` and `npm run migrate` in `backend`.
3. In `agent-service`, copy `.env.example` to `.env` and set a newly generated `GROQ_API_KEY`. Do not put provider keys in `frontend/.env`.
4. Run `python -m pip install -r requirements.txt` in `agent-service`.

## Run locally

Open three terminals:

```powershell
cd backend
npm run dev
```

```powershell
cd agent-service
python -m uvicorn main:app --reload --port 8000
```

```powershell
cd frontend
npm run dev
```

The assistant uses browser speech recognition and browser text-to-speech. Microphone input needs a supported browser (Chrome or Edge) and microphone permission.
