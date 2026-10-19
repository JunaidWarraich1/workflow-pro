from fastapi.testclient import TestClient
import sys
import os

# Ensure backend root is on sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_api_status():
    """Verify that the API root endpoint is live and returns 200 OK"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["developer"] == "Junaid Warraich"

def test_public_jobs_feed():
    """Verify that any user can browse open jobs without authentication"""
    response = client.get("/jobs")
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert "total_jobs" in data

def test_unauthorized_job_creation():
    """Verify that posting a job without a JWT Bearer token is strictly blocked (401)"""
    payload = {
        "title": "Malicious Job",
        "description": "Attempting to bypass auth",
        "budget": 50000
    }
    response = client.post("/jobs", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"