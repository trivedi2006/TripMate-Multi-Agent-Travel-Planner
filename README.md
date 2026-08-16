# ✈️ Tripmate AI — Autonomous Multi-Agent Travel Planner

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136.3-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2.2-FF6F61.svg?style=flat-square)](https://www.langchain.com/langgraph)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama--3.3--70B-f55036.svg?style=flat-square)](https://groq.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Google OAuth 2.0](https://img.shields.io/badge/Auth-Google%20OAuth%202.0-4285F4.svg?style=flat-square&logo=google)](https://console.cloud.google.com/)


> An autonomous, multi-agent AI travel orchestration engine built with **FastAPI**, **LangGraph**, **Groq (Llama 3.3 70B)**, and **PostgreSQL**. Tripmate AI plans complete global travel itineraries with live flight searches, hotel recommendations, budget estimations, day-by-day schedules, and PDF exporting capabilities.

---

## 🌟 Overview

Planning complex travel requires fetching flight data, searching quality hotels, estimating realistic budgets, and structuring logical daily itineraries. **Tripmate AI** solves this by dispatching specialized AI agents in a stateful, graph-based architecture powered by **LangGraph** and **Groq's Llama-3.3-70B-Versatile model**.

The application features a modern glassmorphic web dashboard with interactive 3D destination showcases, Google OAuth 2.0 authentication, local database persistence, persistent thread state memory via PostgreSQL checkpointers, and instant PDF itinerary exporting.

---

## ✨ Key Features

- 🤖 **LangGraph Multi-Agent Architecture**: Sequential, stateful graph execution connecting specialized agents for flights, hotels, itineraries, and final response formatting.
- ⚡ **Groq Llama-3.3-70B Intelligence**: Ultra-fast LLM inference delivering structured travel recommendations in seconds.
- ✈️ **Real-Time Flight Search Tool**: Integrates with the **Aviationstack API** and `airportsdata` to lookup live flight schedules, airlines, departures, arrivals, and IATA codes.
- 🏨 **Live Hotel & Travel Search Tool**: Powered by **Tavily AI Search** to fetch real-time hotel reviews, rates, location insights, and attractions.
- 🐘 **PostgreSQL Memory Checkpointer**: Uses `PostgresSaver` to persist multi-turn conversation states (`thread_id`) across user sessions in a remote PostgreSQL database.
- 🔐 **Google OAuth 2.0 & Local User Database**: Sign in or sign up effortlessly using Google Identity Services SDK or local persistent credentials (`tripmate_users_db`).
- 🎨 **Modern Glassmorphism UI**: Floating capsule navigation bar, 3D rotating showcase cards (Tokyo, Beijing, Paris), scrollspy smooth navigation, and dark mode design.
- 📄 **1-Click PDF Export**: Download generated travel itineraries as clean, formatted PDF documents using `html2pdf.js`.

---

## 🏗️ Multi-Agent Architecture

```mermaid
flowchart TD
    A[User Request] --> B[FastAPI Endpoint /api/travel]
    B --> C[LangGraph StateGraph]
    
    subgraph Multi-Agent Execution Pipeline
        C --> D[✈️ Flight Agent\nQueries Aviationstack & Airport IATA Data]
        D --> E[🏨 Hotel Agent\nQueries Tavily Search API]
        E --> F[🗺️ Itinerary Agent\nGenerates Day-by-Day Travel Plan]
        F --> G[✨ Final Response Agent\nSynthesizes Budget & Recommendations]
    end
    
    G --> H[(🐘 PostgreSQL Checkpointer\nThread State Persistence)]
    G --> I[JSON Response to Frontend]
    I --> J[Rendered Markdown & PDF Export]
```

### Agent Roles:
1. **Flight Agent (`flight_agent`)**: Resolves origin/destination airport IATA codes and searches flight options via `search_flights`.
2. **Hotel Agent (`hotel_agent`)**: Searches top-rated hotels, amenities, and location highlights via `tavily_search`.
3. **Itinerary Agent (`itinerary_agent`)**: Synthesizes flight and hotel data into a practical, budget-aware day-by-day schedule.
4. **Final Response Agent (`final_agent`)**: Structures the complete travel plan into clean Markdown headers, bullet points, budget summaries, and travel tips.

---

## 🛠️ Tech Stack

### **Backend Framework & Services**
- **FastAPI**: Asynchronous web framework for serving static assets and API endpoints.
- **Uvicorn**: High-performance ASGI web server.
- **Pydantic**: Request/response schema validation.
- **Python-Dotenv**: Environment configuration management.

### **AI & Multi-Agent Framework**
- **LangGraph (`StateGraph`, `PostgresSaver`)**: Graph-based state machine for agent execution and thread memory.
- **LangChain Core & Community**: Message interfaces (`HumanMessage`, `AIMessage`, `SystemMessage`).
- **ChatGroq (`llama-3.3-70b-versatile`)**: High-throughput LLM for agent reasoning.
- **Tavily Python SDK**: AI web search integration.
- **AirportsData & PyCountry**: Global airport IATA code mapping.

### **Database & Authentication**
- **PostgreSQL (`psycopg` v3)**: Remote database checkpointer for thread memory.
- **Google Identity Services SDK (`gsi/client`)**: Official Google OAuth 2.0 authentication.
- **HTML5 Web Storage (`localStorage`)**: Persistent user database (`tripmate_users_db`) and session controller (`tripmate_user`).

### **Frontend Interface**
- **HTML5 & Vanilla CSS3**: Custom CSS variables, glassmorphism, responsive grid layout.
- **JavaScript (ES6+)**: View controller, scrollspy active link tracker, modal manager.
- **Marked.js**: Real-time Markdown parser for rich travel plan rendering.
- **Html2pdf.js**: HTML-to-PDF engine for downloadable itineraries.

---

## 📁 Repository Structure

```text
TripMate-Multi-Agent-Travel-Planner/
├── app.py                     # FastAPI application server & route handlers
├── backend.py                 # LangGraph state machine, agent nodes & PostgreSQL checkpointer
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable configuration template
├── README.md                  # Project documentation
├── tools/
│   ├── __init__.py
│   ├── flight_tool.py         # Aviationstack flight search & IATA resolution tool
│   └── tavily_tool.py         # Tavily web search tool for hotels & attractions
├── templates/
│   └── index.html             # Main single-page web app template (Landing & Workspace)
└── static/
    ├── style.css              # Glassmorphic CSS styling & dark design system
    └── script.js             # View switcher, Google OAuth handler & API caller
```

---

## ⚙️ Prerequisites

Before running the application, make sure you have the following installed and configured:

1. **Python 3.10 or higher**
2. **Groq API Key**: Get a free API key at [console.groq.com](https://console.groq.com/)
3. **Tavily API Key**: Get a search API key at [tavily.com](https://tavily.com/)
4. **Aviationstack API Key**: Get a flight API key at [aviationstack.com](https://aviationstack.com/)
5. **PostgreSQL Database URI**: A PostgreSQL connection string (e.g. from [Render](https://render.com/), [Neon](https://neon.tech/), or [Supabase](https://supabase.com/))
6. **Google OAuth 2.0 Client ID**: Create a web client ID in [Google Cloud Console](https://console.cloud.google.com/)

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/trivedi2006/TripMate-Multi-Agent-Travel-Planner.git
cd TripMate-Multi-Agent-Travel-Planner
```

### 2. Create and Activate Virtual Environment
```bash
# Windows (PowerShell)
python -m venv .venv
\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Open `.env` and update the values:
```ini
GROQ_API_KEY="gsk_your_groq_api_key"
AVIATIONSTACK_API_KEY="your_aviationstack_key"
DEFAULT_ORIGIN_IATA="DAC"
TAVILY_API_KEY="tvly-your_tavily_key"
DATABASE_URL="postgresql://user:password@hostname:5432/dbname?sslmode=require"
LANGSMITH_TRACING="false"
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### 5. Run the Application
Start the FastAPI backend server:
```bash
python app.py
```
*Or using uvicorn directly:*
```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

### 6. Access the Application
Open your browser and navigate to:
```text
http://127.0.0.1:8000/
```

---

## 🔑 Google OAuth 2.0 Setup Guide

To enable **Sign in with Google** on local development:

1. Open **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)**.
2. Create or select your project.
3. Go to **APIs & Services > Credentials** > **+ CREATE CREDENTIALS** > **OAuth client ID**.
4. Set Application Type to **Web application**.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`
6. Copy the generated **Client ID** into your `.env` file and `static/script.js`.

---

## 📡 API Endpoint Reference

### `POST /api/travel`
Generates a complete travel plan using the multi-agent graph.

**Request Body:**
```json
{
  "message": "Plan a 7-day trip to Tokyo, Japan from Dhaka including flights and budget hotels under 2 lakhs.",
  "thread_id": "user_thread_12345"
}
```

**Response JSON:**
```json
{
  "success": true,
  "thread_id": "user_thread_12345",
  "answer": "## Trip Summary\n...",
  "flight_results": "Flight info...",
  "hotel_results": "Hotel info...",
  "itinerary": "Day-by-Day plan...",
  "llm_calls": 4
}
```

### `GET /health`
Returns system status.
```json
{
  "status": "ok",
  "message": "AI Travel Planner API is running"
}
```



<p center="text">
  Made with ❤️ by <strong>Daksh Trivedi</strong> • Powered by <strong>LangGraph & Groq</strong>
</p>