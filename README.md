# ⚡ WorkFlow Pro — Full-Stack Freelance Marketplace Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Pytest](https://img.shields.io/badge/Pytest-Passing-brightgreen?style=for-the-badge&logo=pytest)](https://docs.pytest.org/)

A production-ready freelance contract and job management platform built with FastAPI, PostgreSQL 17, and React (Vite). Designed with multi-role access control, cryptographic password hashing, automated test suites, and dynamic proposal bidding.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────┐
│     React Frontend (Vite + SPA)        │
│  - JWT Auth Persistence (localStorage) │
│  - Dynamic Search & Budget Filtering   │
│  - Real-time Contract Status Badges    │
└───────────────────┬────────────────────┘
                    │ HTTP REST (JSON)
                    ▼
┌────────────────────────────────────────┐
│        FastAPI Backend Engine          │
│  - OAuth2 Password Bearer (JWT)        │
│  - Pydantic Request/Response Schemas   │
│  - Role-Based Access Control (RBAC)    │
│  - Environment Configs (.env)          │
└───────────────────┬────────────────────┘
                    │ SQLAlchemy ORM
                    ▼
┌────────────────────────────────────────┐
│       PostgreSQL 17 Relational DB      │
│  - Users Table (Clients / Freelancers) │
│  - Jobs Table (Cascade Deletion)       │
│  - Proposals Table (Foreign Keys)      │
└────────────────────────────────────────┘
```

---

## ✨ Key Features

- **Enterprise Authentication:** Cryptographic password hashing using bcrypt (salted) and stateless JWT (HS256) token authorization.
- **Multi-Tenant Role System:** Distinct interfaces and permissions for Clients (post jobs, review applicants, award/reject contracts) and Freelancers (browse feed, submit proposals with bids).
- **Relational Database Design:** Normalized schema in PostgreSQL 17 featuring One-to-Many relationships and cascade deletions to prevent orphaned records.
- **Real-Time Search & Filtering:** Dynamic client-side and backend filtering by keywords and minimum budget thresholds.
- **Automated Contract Award Cycle:** When a Client awards a contract to a selected proposal, the job automatically transitions to IN_PROGRESS and competing proposals are auto-rejected.
- **Automated Testing:** End-to-end regression testing with `pytest` covering authentication barriers and public endpoints.
- **Containerization:** Production-ready `Dockerfile` and `docker-compose.yml` for single-command orchestration.

---

## 🗄️ Database Schema

- **users:** `id`, `email`, `hashed_password`, `full_name`, `role` (One-to-Many with jobs and proposals)
- **jobs:** `id`, `title`, `description`, `budget`, `status`, `client_id` (Belongs to users, Cascade delete on proposals)
- **proposals:** `id`, `bid_amount`, `cover_letter`, `status`, `job_id`, `freelancer_id` (Foreign Keys to jobs and users)

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- PostgreSQL 16/17 (or Docker)

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env

# Run automated tests
python -m pytest tests/

# Start FastAPI server on port 8002
uvicorn main:app --port 8002 --reload
```
API Documentation live at: `http://127.0.0.1:8002/docs`

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Client Application live at: `http://localhost:5173/`

### 4. Docker Deployment (Alternative)
To spin up both PostgreSQL and the FastAPI backend in containers with one command:
```bash
docker compose up --build
```

---

## 👨‍💻 Author

**Junaid Warraich**
- GitHub: [@JunaidWarraich1](https://github.com/JunaidWarraich1)
- Tech Stack: Python • FastAPI • PostgreSQL • React • Docker