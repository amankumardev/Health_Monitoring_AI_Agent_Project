🩺 Health Monitoring AI Agent

An AI-powered health monitoring application that combines a modern React
frontend, a self-hosted Node.js/Express + PostgreSQL backend, and a
FastAPI-based AI health assistant. The system allows users to work with
their health information through a web interface and interact with the
AI assistant using text or supported browser voice features.

👥 Team

No.   Student

1     Aditya Narayan Chaube
2     Akhilesh Singh Rawat
3     Gaurav Mandal
4     Aman Kumar

🎯 Project Objective

The goal of this project is to build a practical AI-assisted health
monitoring platform that brings health data and conversational
assistance into one application.

The project separates the user interface, application/data layer, and AI
service so that the LLM provider key remains on the server side rather
than being exposed in the browser.

✨ Key Features

🖥️ Modern React-based health monitoring interface

🔐 User authentication with the self-hosted backend

🗄️ PostgreSQL-based health data storage

🤖 AI-powered health assistant

💬 Conversational interaction with health summaries

🎙️ Browser speech recognition for microphone input

🔊 Browser text-to-speech for assistant responses

🔒 Server-side handling of the Groq API key

📊 Health data and summary workflow

🧩 Separate frontend, backend, and AI-agent services

🏗️ System Architecture

The application is organized into three local services:

┌─────────────────────────────┐
│        React Frontend       │
│      localhost:5173         │
│                             │
│  Dashboard / Health UI      │
│  Text & Voice Interaction   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│    Node.js + Express API    │
│      localhost:4000         │
│                             │
│ Authentication / REST API   │
│ PostgreSQL Data Layer       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      PostgreSQL Database    │
└─────────────────────────────┘

               │
               │ Health summaries
               ▼
┌─────────────────────────────┐
│      FastAPI AI Service     │
│      localhost:8000         │
│                             │
│       Groq + LLM            │
│    Health Assistant         │
└─────────────────────────────┘

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

JWT-based authentication

Database migrations

AI Agent Service

Python

FastAPI

Groq API

openai/gpt-oss-20b model by default

Health-summary based assistant responses

📁 Project Structure

health-monitoring-ai-agent/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── migrations/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── agent-service/
│   ├── .env.example
│   ├── main.py
│   ├── requirements.txt
│   └── README.md
│
├── .gitignore
└── README.md

⚙️ Prerequisites

Make sure the following are installed:

Node.js

npm

Python 3

PostgreSQL

Git

For voice interaction, use a supported browser such as Chrome or Edge
and allow microphone access.

🚀 Installation & Setup

1. Clone the repository

git clone https://github.com/iamgaurav-create/health-monitoring-ai-agent.git
cd health-monitoring-ai-agent

2. Configure the backend

Create a PostgreSQL database and configure the backend environment file:

cd backend
cp .env.example .env

Set the required values in .env, including:

DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

Install dependencies and run migrations:

npm install
npm run migrate

3. Configure the AI Agent Service

Move into the AI service:

cd ../agent-service
cp .env.example .env

Add your Groq API key:

GROQ_API_KEY=your_groq_api_key

Install Python dependencies:

python -m pip install -r requirements.txt

4. Start the services

Open three terminals.

Terminal 1 --- Backend

cd backend
npm run dev

Backend runs by default at:

http://localhost:4000

Terminal 2 --- AI Agent Service

cd agent-service
python -m uvicorn main:app --reload --port 8000

AI service runs at:

http://localhost:8000

Terminal 3 --- Frontend

cd frontend
npm install
npm run dev

Frontend runs by default at:

http://localhost:5173

🔐 Security

The project keeps the LLM provider key on the AI service instead of
exposing it through the frontend.

Important: Never commit real API keys, database passwords, JWT
secrets, or other private credentials to GitHub. Use .env files
locally and keep them out of version control.

🎙️ Voice Interaction

The assistant supports browser-based:

Speech recognition for microphone input

Text-to-speech for assistant responses

Microphone access requires browser permission. Chrome or Edge is
recommended for supported speech features.

🔌 Backend API

The backend provides authentication and data APIs, including:

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

The high-level workflow is:

User
  │
  ▼
React Health Interface
  │
  ├── Text Input
  │
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
          │
          ├── Text
          └── Browser Text-to-Speech

🧪 Development Goals

This project demonstrates practical AI-agent engineering concepts:

Full-stack application architecture

AI service integration

API-based communication between services

Secure server-side API-key management

Health-data persistence

Conversational AI interaction

Voice-enabled user interaction

Authentication and protected APIs

🚧 Future Scope

Possible future improvements include:

More personalized health insights

Additional health metrics and dashboards

Improved AI reasoning and context handling

More advanced voice interaction

Notifications and reminders

Production-grade deployment

Better monitoring and logging

Integration with wearable or external health-data sources

⚠️ Disclaimer

This project is an educational/software demonstration and should not be
treated as a replacement for professional medical advice, diagnosis, or
treatment.

📌 Project Information

Project: Health Monitoring AI Agent
Team Size: 4
Architecture: React + Node.js/Express + PostgreSQL + FastAPI AI
Service
AI Provider: Groq
Default Model: openai/gpt-oss-20b

🙌 Team Members

Aditya Narayan Chaube

Akhilesh Singh Rawat

Gaurav Mandal

Aman Kumar

⭐ If you find this project useful, consider giving the repository a
star.
