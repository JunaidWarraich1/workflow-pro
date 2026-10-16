from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import jwt

import models
from database import engine, get_db
from auth import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM

# 1. Initialize Database Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WorkFlow Pro API",
    description="Full-Stack Freelance Platform API by Junaid Warraich",
    version="1.0.0"
)

# 2. Configure CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ─── PYDANTIC SCHEMAS ───

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str

class JobCreate(BaseModel):
    title: str
    description: str
    budget: float

class ProposalCreate(BaseModel):
    bid_amount: float
    cover_letter: str


# ─── AUTH DEPENDENCY ───

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise auth_error
    except jwt.PyJWTError:
        raise auth_error

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise auth_error
    return user


# ─── AUTHENTICATION ROUTES ───

@app.get("/")
def api_status():
    return {
        "app": "WorkFlow Pro API",
        "developer": "Junaid Warraich",
        "status": "online",
        "docs": "/docs"
    }

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if payload.role not in ["client", "freelancer"]:
        raise HTTPException(status_code=400, detail="Role must be client or freelancer.")

    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")

    hashed = hash_password(payload.password)
    user = models.User(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully.", "email": user.email, "role": user.role}

@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token(data={"sub": user.email, "user_id": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name
    }


# ─── JOB POSTING ROUTES ───

@app.post("/jobs", status_code=status.HTTP_201_CREATED)
def create_job(job: JobCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "client":
        raise HTTPException(status_code=403, detail="Only clients can create projects.")

    new_job = models.Job(
        title=job.title,
        description=job.description,
        budget=job.budget,
        client_id=user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job published.", "job_id": new_job.id, "title": new_job.title}

@app.get("/jobs")
def browse_jobs(search: Optional[str] = None, min_budget: Optional[float] = None, db: Session = Depends(get_db)):
    q = db.query(models.Job)

    if search:
        pattern = f"%{search}%"
        q = q.filter((models.Job.title.ilike(pattern)) | (models.Job.description.ilike(pattern)))

    if min_budget:
        q = q.filter(models.Job.budget >= min_budget)

    items = q.all()
    return {
        "total_jobs": len(items),
        "jobs": [
            {
                "id": j.id,
                "title": j.title,
                "description": j.description,
                "budget": j.budget,
                "status": j.status,
                "posted_by": j.client.full_name,
                "proposals_count": len(j.proposals)
            }
            for j in items
        ]
    }

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Project not found.")

    if target.client_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own projects.")

    db.delete(target)
    db.commit()
    return {"message": f"Project '{target.title}' deleted successfully."}


# ─── PROPOSAL & BIDDING ROUTES ───

@app.post("/jobs/{job_id}/proposals", status_code=status.HTTP_201_CREATED)
def submit_bid(job_id: int, bid: ProposalCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "freelancer":
        raise HTTPException(status_code=403, detail="Only freelancers can submit proposals.")

    target = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Job not found.")

    if target.status != "open":
        raise HTTPException(status_code=400, detail="This project is no longer accepting proposals.")

    existing = db.query(models.Proposal).filter(
        models.Proposal.job_id == job_id,
        models.Proposal.freelancer_id == user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a proposal for this project.")

    record = models.Proposal(
        bid_amount=bid.bid_amount,
        cover_letter=bid.cover_letter,
        job_id=job_id,
        freelancer_id=user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"message": "Proposal submitted.", "proposal_id": record.id}

@app.get("/jobs/{job_id}/proposals")
def list_proposals(job_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Job not found.")

    if target.client_id != user.id:
        raise HTTPException(status_code=403, detail="Only the project creator can view candidate proposals.")

    return {
        "job_title": target.title,
        "proposals": [
            {
                "proposal_id": p.id,
                "freelancer": p.freelancer.full_name,
                "email": p.freelancer.email,
                "bid_amount": p.bid_amount,
                "cover_letter": p.cover_letter,
                "status": p.status
            }
            for p in target.proposals
        ]
    }

@app.put("/proposals/{proposal_id}/accept")
def award_contract(proposal_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    selected = db.query(models.Proposal).filter(models.Proposal.id == proposal_id).first()
    if not selected:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    if selected.job.client_id != user.id:
        raise HTTPException(status_code=403, detail="Only the project creator can award this contract.")

    selected.status = "accepted"
    selected.job.status = "in_progress"

    # Reject other pending candidates for this job
    competitors = db.query(models.Proposal).filter(
        models.Proposal.job_id == selected.job_id,
        models.Proposal.id != proposal_id
    ).all()
    for item in competitors:
        item.status = "rejected"
# ─── REJECT PROPOSAL ENDPOINT ───
@app.put("/proposals/{proposal_id}/reject")
def reject_proposal(proposal_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    selected = db.query(models.Proposal).filter(models.Proposal.id == proposal_id).first()
    if not selected:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    if selected.job.client_id != user.id:
        raise HTTPException(status_code=403, detail="Only the project creator can reject proposals.")

    selected.status = "rejected"
    db.commit()
    return {
        "message": f"Proposal from {selected.freelancer.full_name} has been rejected.",
        "proposal_id": selected.id,
        "status": "rejected"
    }
    db.commit()
    return {
        "message": "Contract successfully awarded.",
        "accepted_freelancer": selected.freelancer.full_name,
        "job_title": selected.job.title,
        "agreed_budget": selected.bid_amount
    }