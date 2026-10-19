import { useState, useEffect } from "react";

const API_BASE = "https://workflow-pro-1hg4.vercel.app";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("freelancer");
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // App Data State
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minBudgetFilter, setMinBudgetFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Post Job Form State (Clients)
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobBudget, setJobBudget] = useState("");

  // Freelancer Bid State
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  // Client View Proposals State
  const [viewingJobProposals, setViewingJobProposals] = useState(null);
  const [proposalsList, setProposalsList] = useState([]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "info" }), 4000);
  };

  // 1. Fetch Open Jobs
  const fetchJobs = async () => {
    try {
      let url = `${API_BASE}/jobs?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (minBudgetFilter) url += `min_budget=${minBudgetFilter}&`;

      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Failed to load jobs", err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, minBudgetFilter]);

  // 2. Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isRegister) {
      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name: fullName, role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registration failed");
        showToast("Account created successfully! Please login.", "success");
        setIsRegister(false);
      } catch (err) {
        showToast(err.message, "error");
      }
    } else {
      try {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const res = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify({ email, role: data.role, fullName: data.full_name }));
        setToken(data.access_token);
        setUser({ email, role: data.role, fullName: data.full_name });
        showToast(`Welcome back, ${data.full_name}!`, "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setViewingJobProposals(null);
    showToast("Logged out successfully.", "info");
  };

  // 3. Post Job
  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: jobTitle,
          description: jobDesc,
          budget: parseFloat(jobBudget),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to post job");
      showToast("🚀 Job published live to marketplace!", "success");
      setJobTitle("");
      setJobDesc("");
      setJobBudget("");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 4. Delete Job (Cascades to Proposals!)
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting? All attached proposals will also be removed.")) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete job");
      showToast(data.message, "info");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 5. Submit Proposal (Freelancers)
  const handleSubmitBid = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/jobs/${selectedJobId}/proposals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bid_amount: parseFloat(bidAmount),
          cover_letter: coverLetter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit bid");
      showToast("💼 Proposal submitted successfully to client!", "success");
      setSelectedJobId(null);
      setBidAmount("");
      setCoverLetter("");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 6. View Proposals (Clients)
  const fetchProposalsForJob = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch proposals");
      setProposalsList(data.proposals || []);
      setViewingJobProposals(jobId);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 7. Accept Proposal (Clients)
  const handleAcceptProposal = async (proposalId) => {
    try {
      const res = await fetch(`${API_BASE}/proposals/${proposalId}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to accept proposal");
      showToast(`🎉 Contract Awarded to ${data.accepted_freelancer}!`, "success");
      setViewingJobProposals(null);
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // 8. NEW: Reject Proposal (Clients)
  const handleRejectProposal = async (proposalId) => {
    try {
      const res = await fetch(`${API_BASE}/proposals/${proposalId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reject proposal");
      showToast(data.message, "info");
      // Refresh current proposals popup
      fetchProposalsForJob(viewingJobProposals);
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const totalBudget = jobs.reduce((acc, job) => acc + (job.budget || 0), 0);
  const displayedJobs = activeTab === "my-jobs" 
    ? jobs.filter(j => j.posted_by === user?.fullName) 
    : jobs;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#090d16", minHeight: "100vh", color: "#f8fafc", padding: "0 0 40px 0" }}>
      
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          backgroundColor: toast.type === "error" ? "#dc2626" : toast.type === "info" ? "#0284c7" : "#16a34a",
          color: "#fff", padding: "14px 24px", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", gap: "10px", fontWeight: "500"
        }}>
          <span>{toast.type === "error" ? "❌" : toast.type === "info" ? "ℹ️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", backgroundColor: "rgba(9, 13, 22, 0.8)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #0ea5e9, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "20px" }}>⚡</div>
            <div>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>WorkFlow <span style={{ color: "#38bdf8" }}>Pro</span></h1>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Full-Stack Enterprise Architecture</span>
            </div>
          </div>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>{user.fullName}</p>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", backgroundColor: user.role === "client" ? "rgba(14, 165, 233, 0.15)" : "rgba(34, 197, 94, 0.15)", color: user.role === "client" ? "#38bdf8" : "#4ade80", border: `1px solid ${user.role === "client" ? "rgba(14, 165, 233, 0.3)" : "rgba(34, 197, 94, 0.3)"}` }}>
                  {user.role.toUpperCase()}
                </span>
              </div>
              <button onClick={handleLogout} style={{ padding: "8px 16px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "13px" }}>
                Sign Out
              </button>
            </div>
          ) : (
            <span style={{ fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }}></span> API Server v1.0 Live
            </span>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: "1200px", margin: "32px auto", padding: "0 24px" }}>
        
        {/* STATS HERO */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Open Projects</p>
            <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#f8fafc" }}>{jobs.length}</h2>
          </div>
          <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Total Marketplace Volume</p>
            <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#22c55e" }}>PKR {totalBudget.toLocaleString()}</h2>
          </div>
          <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Production Tech Stack</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", backgroundColor: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", padding: "3px 8px", borderRadius: "4px" }}>FastAPI</span>
              <span style={{ fontSize: "12px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", padding: "3px 8px", borderRadius: "4px" }}>PostgreSQL 17</span>
              <span style={{ fontSize: "12px", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#4ade80", padding: "3px 8px", borderRadius: "4px" }}>React Vite</span>
              <span style={{ fontSize: "12px", backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#fcd34d", padding: "3px 8px", borderRadius: "4px" }}>JWT & Bcrypt</span>
            </div>
          </div>
        </div>

        {/* AUTH CARD */}
        {!user && (
          <div style={{ backgroundColor: "#111827", padding: "36px", borderRadius: "16px", maxWidth: "420px", margin: "40px auto", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: "24px" }}>{isRegister ? "Join WorkFlow Pro" : "Welcome Back"}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{isRegister ? "Select your profile type to begin" : "Enter your credentials to continue"}</p>
            </div>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {isRegister && (
                <>
                  <div>
                    <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Full Name</label>
                    <input
                      type="text"
                      placeholder="Junaid Warraich"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Account Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="freelancer">💼 Freelancer (Submit Proposals)</option>
                      <option value="client">🏢 Client (Post Jobs & Hire)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="submit"
                style={{ padding: "14px", backgroundColor: "#0284c7", color: "#fff", fontWeight: "600", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "10px", fontSize: "15px" }}
              >
                {isRegister ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                {isRegister ? "Already registered?" : "New to the platform?"}{" "}
                <span onClick={() => setIsRegister(!isRegister)} style={{ color: "#38bdf8", cursor: "pointer", fontWeight: "600" }}>
                  {isRegister ? "Sign in here" : "Create an account"}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* LOGGED IN DASHBOARD */}
        {user && (
          <div>
            {/* POST JOB (CLIENT ONLY) */}
            {user.role === "client" && (
              <div style={{ backgroundColor: "#111827", padding: "24px", borderRadius: "12px", marginBottom: "32px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#38bdf8" }}>📢 Post a New Project</h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Live on PostgreSQL</span>
                </div>

                <form onSubmit={handlePostJob} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="Project Title (e.g. Build High-Throughput REST API in FastAPI)"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff" }}
                    />
                    <textarea
                      placeholder="Detailed Technical Requirements & Scope..."
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      required
                      rows="3"
                      style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", resize: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <input
                      type="number"
                      placeholder="Budget (PKR)"
                      value={jobBudget}
                      onChange={(e) => setJobBudget(e.target.value)}
                      required
                      style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff" }}
                    />
                    <button type="submit" style={{ padding: "14px", backgroundColor: "#16a34a", color: "#fff", fontWeight: "600", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px" }}>
                      🚀 Publish to Market
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* CONTROLS HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setActiveTab("all")}
                  style={{
                    padding: "8px 16px", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                    backgroundColor: activeTab === "all" ? "#0284c7" : "transparent",
                    color: activeTab === "all" ? "#fff" : "#94a3b8",
                    border: activeTab === "all" ? "none" : "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  🌐 All Projects ({jobs.length})
                </button>
                {user.role === "client" && (
                  <button
                    onClick={() => setActiveTab("my-jobs")}
                    style={{
                      padding: "8px 16px", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                      backgroundColor: activeTab === "my-jobs" ? "#0284c7" : "transparent",
                      color: activeTab === "my-jobs" ? "#fff" : "#94a3b8",
                      border: activeTab === "my-jobs" ? "none" : "1px solid rgba(255,255,255,0.1)"
                    }}
                  >
                    🏢 My Job Postings
                  </button>
                )}
              </div>

              {/* SEARCH & FILTER */}
              <div style={{ display: "flex", gap: "10px", flex: 1, maxWidth: "500px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search title or tech stack..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 2, padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#111827", color: "#fff", fontSize: "13px" }}
                />
                <input
                  type="number"
                  placeholder="Min PKR"
                  value={minBudgetFilter}
                  onChange={(e) => setMinBudgetFilter(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#111827", color: "#fff", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* JOBS GRID */}
            {displayedJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#64748b", margin: 0, fontSize: "16px" }}>No projects match your search criteria.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
                {displayedJobs.map((job) => (
                  <div key={job.id} style={{ backgroundColor: "#111827", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#f8fafc", lineHeight: "1.4" }}>{job.title}</h3>
                        <span style={{
                          fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase",
                          backgroundColor: job.status === "open" ? "rgba(34, 197, 94, 0.15)" : job.status === "in_progress" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
                          color: job.status === "open" ? "#4ade80" : job.status === "in_progress" ? "#fcd34d" : "#93c5fd",
                          border: `1px solid ${job.status === "open" ? "rgba(34, 197, 94, 0.3)" : job.status === "in_progress" ? "rgba(245, 158, 11, 0.3)" : "rgba(59, 130, 246, 0.3)"}`
                        }}>
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", margin: "10px 0 16px 0" }}>{job.description}</p>
                    </div>

                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                        <div>
                          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Fixed Budget</span>
                          <p style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: "700", color: "#22c55e" }}>PKR {job.budget.toLocaleString()}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>By: {job.posted_by}</span>
                          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#38bdf8", fontWeight: "600" }}>📩 {job.proposals_count || 0} Proposals</p>
                        </div>
                      </div>

                      {/* FREELANCER ACTION */}
                      {user.role === "freelancer" && job.status === "open" && (
                        <button
                          onClick={() => setSelectedJobId(job.id)}
                          style={{ width: "100%", padding: "12px", backgroundColor: "#0284c7", color: "#fff", fontWeight: "600", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
                        >
                          ✍️ Submit Proposal
                        </button>
                      )}

                      {/* CLIENT ACTION */}
                      {user.role === "client" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => fetchProposalsForJob(job.id)}
                            style={{ flex: 1, padding: "10px", backgroundColor: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                          >
                            📑 View Proposals ({job.proposals_count || 0})
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            style={{ padding: "10px 14px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", cursor: "pointer" }}
                            title="Delete Posting"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FREELANCER PROPOSAL MODAL */}
            {selectedJobId && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
                <div style={{ backgroundColor: "#111827", padding: "32px", borderRadius: "16px", width: "90%", maxWidth: "480px", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "20px" }}>💼 Submit Proposal</h3>
                  <form onSubmit={handleSubmitBid} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Your Bid Amount (PKR)</label>
                      <input
                        type="number"
                        placeholder="65000"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        required
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Cover Letter & Implementation Plan</label>
                      <textarea
                        placeholder="Explain your approach, tech stack, and timeline..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        required
                        rows="5"
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#090d16", color: "#fff", boxSizing: "border-box", resize: "none" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                      <button type="submit" style={{ flex: 1, padding: "12px", backgroundColor: "#16a34a", color: "#fff", fontWeight: "600", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                        Submit Proposal
                      </button>
                      <button type="button" onClick={() => setSelectedJobId(null)} style={{ padding: "12px 20px", backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* CLIENT PROPOSALS REVIEW MODAL (ACCEPT + REJECT) */}
            {viewingJobProposals && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
                <div style={{ backgroundColor: "#111827", padding: "32px", borderRadius: "16px", width: "90%", maxWidth: "640px", border: "1px solid rgba(255,255,255,0.12)", maxHeight: "80vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", color: "#38bdf8" }}>Candidate Proposals</h3>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Review candidate bids and award or decline contracts</p>
                    </div>
                    <button onClick={() => setViewingJobProposals(null)} style={{ backgroundColor: "transparent", color: "#94a3b8", border: "none", fontSize: "24px", cursor: "pointer" }}>✕</button>
                  </div>

                  {proposalsList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <p style={{ color: "#64748b" }}>No proposals submitted for this project yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {proposalsList.map((p) => (
                        <div key={p.proposal_id} style={{ backgroundColor: "#090d16", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <h4 style={{ margin: "0 0 2px 0", fontSize: "16px", color: "#f8fafc" }}>👤 {p.freelancer}</h4>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>{p.email}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Proposed Bid</span>
                              <p style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#22c55e" }}>PKR {p.bid_amount.toLocaleString()}</p>
                            </div>
                          </div>

                          <div style={{ margin: "14px 0", backgroundColor: "#111827", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <p style={{ margin: 0, color: "#cbd5e1", fontSize: "13px", lineHeight: "1.6" }}>"{p.cover_letter}"</p>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
                            <span style={{
                              fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px",
                              backgroundColor: p.status === "accepted" ? "rgba(34, 197, 94, 0.15)" : p.status === "rejected" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: p.status === "accepted" ? "#4ade80" : p.status === "rejected" ? "#f87171" : "#fcd34d"
                            }}>
                              {p.status.toUpperCase()}
                            </span>

                            {p.status === "pending" && (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => handleAcceptProposal(p.proposal_id)}
                                  style={{ padding: "8px 14px", backgroundColor: "#16a34a", color: "#fff", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                                >
                                  ✅ Accept
                                </button>
                                <button
                                  onClick={() => handleRejectProposal(p.proposal_id)}
                                  style={{ padding: "8px 14px", backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}