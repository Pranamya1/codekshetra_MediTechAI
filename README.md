# 🏥 MediCare AI

> AI-powered medical dashboard with patient, caregiver, and doctor views — built with React + TypeScript, FastAPI, and Gemini AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)

---

## 📐 Architecture

```
medicare-ai/
├── frontend/          # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/   # Reusable TSX components
│       ├── dashboards/   # Patient / Caregiver / Doctor views
│       └── types/        # TypeScript interfaces & types
├── backend/           # Python FastAPI application
├── docs/              # Documentation & assets
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev       # Vite dev server → http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # Fill in your secrets
uvicorn main:app --reload --port 8000
```

---

## 👥 Team Responsibilities

| Role | Member | Ownership |
|------|--------|-----------|
| **Team Lead** | Lead | Backend foundation, Supabase client, repo setup |
| **Member 2** | Frontend | Layout, navigation, **Patient Dashboard** |
| **Member 3** | Database | Supabase schema, Auth hooks, TS type defs |
| **Member 4** | UI/AI | **Doctor Dashboard**, Voice Input / TTS |

---

## 🔑 Environment Variables

See [`backend/.env.example`](./backend/.env.example) for required keys:
- `GEMINI_API_KEY` — Google Gemini API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Icons | Lucide-react |
| Routing | React Router v6 |
| Backend | Python FastAPI + Uvicorn |
| AI | Google Gemini Flash (`google-genai`) |
| Database & Auth | Supabase (PostgreSQL) |
| Voice | Browser Web Speech API + TTS |

---

*Milestone 1 — Frontend scaffold & TypeScript foundations*
