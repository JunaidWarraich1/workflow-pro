from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum

# 1. Python Enums (restricts values to specific choices)
class UserRole(str, enum.Enum):
    client = "client"
    freelancer = "freelancer"

class JobStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    completed = "completed"

class ProposalStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


# 2. USERS TABLE
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)  # "client" or "freelancer"

    # Relationships
    jobs_posted = relationship("Job", back_populates="client")
    proposals_sent = relationship("Proposal", back_populates="freelancer")


# 3. JOBS TABLE
class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    budget = Column(Float, nullable=False)  # In PKR or USD
    status = Column(Enum(JobStatus), default=JobStatus.open)
    
    # Foreign Key: Which client posted this job?
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    client = relationship("User", back_populates="jobs_posted")
    
    proposals = relationship("Proposal", back_populates="job", cascade="all, delete-orphan")


# 4. PROPOSALS TABLE
class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    bid_amount = Column(Float, nullable=False)
    cover_letter = Column(String, nullable=False)
    status = Column(Enum(ProposalStatus), default=ProposalStatus.pending)

    # Foreign Keys
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    freelancer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    job = relationship("Job", back_populates="proposals")
    freelancer = relationship("User", back_populates="proposals_sent")