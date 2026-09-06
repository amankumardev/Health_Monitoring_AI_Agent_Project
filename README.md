🩺 Health Monitoring AI Agent

An AI-powered health monitoring application combining a React frontend,
Node.js/Express + PostgreSQL backend, and FastAPI-based AI health
assistant.

👤 Developer

Aman Kumar

🎯 Project Objective

The goal of this project is to build a practical AI-assisted health
monitoring platform that brings health data and conversational
assistance into one application.

The application separates the user interface, application/data layer,
and AI service so that the LLM provider key remains on the server side
rather than being exposed in the browser.

✨ Key Features

🖥️ React-based health monitoring interface

🔐 User authentication

🗄️ PostgreSQL health-data storage

🤖 AI-powered health assistant

💬 Conversational health summaries

🎙️ Browser speech recognition

🔊 Browser text-to-speech

🔒 Server-side Groq API-key handling

📊 Health data and summary workflow

🧩 Separate frontend, backend, and AI-agent services

🏗️ System Architecture

React Frontend
      │
      ▼
Node.js + Express API
      │
      ├── PostgreSQL Database
      │
      ▼
FastAPI AI Service
      │
      ▼
Groq LLM
      │
      ▼
AI Health Assistant

🛠️ Technology Stack

Frontend

React

Vite

TypeScript

Tailwind CSS

Browser Speech Recognition

Browser Text-to-Speech

Backend

Node.js

Express

PostgreSQL

JWT authentication

Database migrations

AI Agent Service

Python

FastAPI

Groq API

openai/gpt-oss-20b model by default

📁 Project Structure

Health_Monitoring_AI_Agent_Project/
├── frontend/
├── backend/
├── agent-service/
├── .gitignore
├── LICENSE
└── README.md

⚙️ Prerequisites

Node.js

npm

Python 3

PostgreSQL

Git

For voice interaction, use a supported browser such as Chrome or Edge
and allow microphone access.

🚀 Installation & Setup

1. Clone the repository

git clone https://github.com/amankumardev/Health_Monitoring_AI_Agent_Project.git
cd Health_Monitoring_AI_Agent_Project

2. Backend

cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev

Configure .env with:

DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

Backend runs at:

http://localhost:4000

3. AI Agent Service

cd ../agent-service
cp .env.example .env
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

Add your Groq key to .env:

GROQ_API_KEY=your_groq_api_key

AI service runs at:

http://localhost:8000

4. Frontend

In another terminal:

cd frontend
npm install
npm run dev

Frontend runs at:

http://localhost:5173

🔐 Security

The LLM provider key is kept on the AI service instead of being exposed
through the frontend.

Important: Never commit real API keys, database passwords, JWT
secrets, or other private credentials to GitHub. Keep them in local
.env files.

🎙️ Voice Interaction

The assistant supports browser-based:

Speech recognition for microphone input

Text-to-speech for assistant responses

Microphone permission is required.

🔌 Backend API

POST   /auth/signup
POST   /auth/signin
POST   /auth/refresh
POST   /auth/signout
GET    /auth/me

GET    /rest/v1/:table
POST   /rest/v1/:table
PATCH  /rest/v1/:table
DELETE /rest/v1/:table

POST   /rpc/seed_demo_health_data

Protected data routes require a valid Bearer access token.

🤖 AI Assistant Workflow

User
 │
 ▼
React Health Interface
 │
 ├── Text Input
 └── Voice Input
 │
 ▼
Node.js / PostgreSQL
 │
 ▼
Authenticated Health Summary
 │
 ▼
FastAPI AI Service
 │
 ▼
Groq LLM
 │
 ▼
Assistant Response
 ├── Text
 └── Browser Text-to-Speech

🚧 Future Scope

More personalized health insights

Additional health metrics and dashboards

Improved AI reasoning and context handling

Advanced voice interaction

Notifications and reminders

Production deployment

Better monitoring and logging

Wearable/external health-data integration

⚠️ Disclaimer

This project is an educational/software demonstration and should not be
treated as a replacement for professional medical advice, diagnosis, or
treatment.

📌 Project Information

Project: Health Monitoring AI Agent
Developer: Aman Kumar
Architecture: React + Node.js/Express + PostgreSQL + FastAPI AI
Service
AI Provider: Groq
Default Model: openai/gpt-oss-20b

⭐ If you find this project useful, consider giving the repository a
star.

Repository:
https://github.com/amankumardev/Health_Monitoring_AI_Agent_Project
