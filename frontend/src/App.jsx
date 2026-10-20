import { useState, useEffect } from "react";

const API_BASE = "https://workflow-pro-1hg4.vercel.app";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));

  // Authentication State
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("freelancer");
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // Marketplace Feed & Filter State
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minBudgetFilter, setMinBudgetFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Job Creation State (Clients)
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobBudget, setJobBudget] = useState("");

  // Proposal Submission State (Freelancers)
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  // Proposal Review State (Clients)
  const [viewingJobProposals, setViewingJobProposals] = useState(null);
  const [proposalsList, setProposalsList] = useState([]);

  // Toast Notification System
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "info" }), 4000);
  };

  // Fetch Jobs from Cloud Backend
  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      let url = `${API_BASE}/jobs?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (minBudgetFilter) url += `min_budget=${minBudgetFilter}&`;

      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, minBudgetFilter]);

  // Handle Authentication
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
        showToast("Account created successfully. Please sign in.", "success");
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
        if (!res.ok) throw new Error(data.detail || "Invalid email or password");

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify({ email, role: data.role, fullName: data.full_name }));
        setToken(data.access_token);
        setUser({ email, role: data.role, fullName: data.full_name });
        showToast(`Authenticated as ${data.full_name}`, "success");
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
    showToast("Session terminated.", "info");
  };

  // Create Job (Client)
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
      if (!res.ok) throw new Error(data.detail || "Unable to post job");
      showToast("Job listing published.", "success");
      setJobTitle("");
      setJobDesc("");
      setJobBudget("");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Delete Job (Client)
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Delete this listing permanently? All associated proposals will be deleted.")) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Delete operation failed");
      showToast("Listing deleted.", "info");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Submit Proposal (Freelancer)
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
      if (!res.ok) throw new Error(data.detail || "Submission failed");
      showToast("Proposal submitted to client.", "success");
      setSelectedJobId(null);
      setBidAmount("");
      setCoverLetter("");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // View Proposals for Job (Client)
  const fetchProposalsForJob = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not retrieve proposals");
      setProposalsList(data.proposals || []);
      setViewingJobProposals(jobId);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Accept Proposal (Client)
  const handleAcceptProposal = async (proposalId) => {
    try {
      const res = await fetch(`${API_BASE}/proposals/${proposalId}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Contract acceptance failed");
      showToast(`Contract awarded to ${data.accepted_freelancer}`, "success");
      setViewingJobProposals(null);
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Reject Proposal (Client)
  const handleRejectProposal = async (proposalId) => {
    try {
      const res = await fetch(`${API_BASE}/proposals/${proposalId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Action failed");
      showToast("Proposal declined.", "info");
      fetchProposalsForJob(viewingJobProposals);
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const totalMarketVolume = jobs.reduce((acc, job) => acc + (job.budget || 0), 0);
  const displayedJobs = activeTab === "my-jobs"
    ? jobs.filter((j) => j.posted_by === user?.fullName)
    : jobs;

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#09090b", minHeight: "100vh", color: "#f4f4f5", letterSpacing: "-0.01em" }}>

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
          backgroundColor: toast.type === "error" ? "#7f1d1d" : toast.type === "info" ? "#27272a" : "#14532d",
          color: toast.type === "error" ? "#fca5a5" : toast.type === "info" ? "#e4e4e7" : "#86efac",
          border: `1px solid ${toast.type === "error" ? "#991b1b" : toast.type === "info" ? "#3f3f46" : "#166534"}`,
          padding: "12px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "500",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER NAVBAR */}
      <header style={{ borderBottom: "1px solid #27272a", backgroundColor: "rgba(9, 9, 11, 0.8)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", backgroundColor: "#fafafa", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#09090b", fontWeight: "700", fontSize: "14px" }}>
                W
              </div>
              <span style={{ fontWeight: "600", fontSize: "15px", color: "#fafafa" }}>WorkFlow</span>
              <span style={{ fontSize: "11px", backgroundColor: "#27272a", color: "#a1a1aa", padding: "2px 6px", borderRadius: "4px", fontWeight: "500" }}>v1.0</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", color: "#a1a1aa" }}>{user.fullName}</span>
                <span style={{
                  fontSize: "11px", fontWeight: "600", textTransform: "uppercase", padding: "2px 8px", borderRadius: "4px",
                  border: user.role === "client" ? "1px solid #3b82f6" : "1px solid #10b981",
                  color: user.role === "client" ? "#93c5fd" : "#6ee7b7",
                  backgroundColor: user.role === "client" ? "rgba(59, 130, 246, 0.1)" : "rgba(16, 185, 129, 0.1)"
                }}>
                  {user.role}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: "transparent", color: "#71717a", border: "1px solid #27272a",
                    padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fafafa"; e.currentTarget.style.borderColor = "#3f3f46"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.borderColor = "#27272a"; }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
                <span style={{ fontSize: "12px", color: "#71717a" }}>API Operational</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

        {/* METRICS ROW */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginBottom: "32px" }}>
          <div style={{ border: "1px solid #27272a", backgroundColor: "#18181b", padding: "20px", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Active Listings</span>
            <div style={{ fontSize: "28px", fontWeight: "600", color: "#fafafa", marginTop: "4px" }}>{jobs.length}</div>
          </div>
          <div style={{ border: "1px solid #27272a", backgroundColor: "#18181b", padding: "20px", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Marketplace Capital</span>
            <div style={{ fontSize: "28px", fontWeight: "600", color: "#fafafa", marginTop: "4px" }}>PKR {totalMarketVolume.toLocaleString()}</div>
          </div>
          <div style={{ border: "1px solid #27272a", backgroundColor: "#18181b", padding: "20px", borderRadius: "8px" }}>
            <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Stack Architecture</span>
            <div style={{ fontSize: "13px", color: "#a1a1aa", marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ border: "1px solid #3f3f46", padding: "2px 6px", borderRadius: "4px" }}>FastAPI</span>
              <span style={{ border: "1px solid #3f3f46", padding: "2px 6px", borderRadius: "4px" }}>PostgreSQL 17</span>
              <span style={{ border: "1px solid #3f3f46", padding: "2px 6px", borderRadius: "4px" }}>React Vite</span>
              <span style={{ border: "1px solid #3f3f46", padding: "2px 6px", borderRadius: "4px" }}>JWT</span>
            </div>
          </div>
        </section>

        {/* AUTH SCREEN (NOT LOGGED IN) */}
        {!user && (
          <section style={{ maxWidth: "380px", margin: "60px auto", border: "1px solid #27272a", backgroundColor: "#18181b", borderRadius: "8px", padding: "32px" }}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#fafafa", margin: "0 0 6px 0" }}>
                {isRegister ? "Create Account" : "Sign In to WorkFlow"}
              </h2>
              <p style={{ fontSize: "13px", color: "#71717a", margin: 0 }}>
                {isRegister ? "Select your platform profile type" : "Enter your email credentials below"}
              </p>
            </div>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {isRegister && (
                <>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "500", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>FULL NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. Junaid Warraich"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "500", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>ACCOUNT ROLE</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", boxSizing: "border-box" }}
                    >
                      <option value="freelancer">Freelancer (Submit Proposals)</option>
                      <option value="client">Client (Post Jobs & Award Contracts)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: "11px", fontWeight: "500", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>EMAIL</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "500", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>PASSWORD</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "8px", backgroundColor: "#fafafa", color: "#09090b", fontWeight: "600",
                  padding: "10px", borderRadius: "6px", border: "none", fontSize: "13px", cursor: "pointer"
                }}
              >
                {isRegister ? "Create Account" : "Continue"}
              </button>
            </form>

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #27272a", textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: "#71717a" }}>
                {isRegister ? "Have an account?" : "Need an account?"}{" "}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  style={{ background: "none", border: "none", color: "#fafafa", textDecoration: "underline", cursor: "pointer", fontSize: "12px", padding: 0 }}
                >
                  {isRegister ? "Sign in" : "Register"}
                </button>
              </span>
            </div>
          </section>
        )}

        {/* DASHBOARD (LOGGED IN) */}
        {user && (
          <div>
            {/* POST JOB PANEL (CLIENTS) */}
            {user.role === "client" && (
              <section style={{ border: "1px solid #27272a", backgroundColor: "#18181b", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#fafafa", margin: "0 0 4px 0" }}>Publish Project</h3>
                  <p style={{ fontSize: "13px", color: "#71717a", margin: 0 }}>List a project on the public marketplace</p>
                </div>

                <form onSubmit={handlePostJob} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Project Title (e.g. Build High-Throughput REST API)"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                    style={{ gridColumn: "1 / -1", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px" }}
                  />
                  <textarea
                    placeholder="Technical specifications, requirements, and deliverables..."
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    required
                    rows="3"
                    style={{ gridColumn: "1 / -1", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", resize: "none" }}
                  />
                  <input
                    type="number"
                    placeholder="Budget (PKR)"
                    value={jobBudget}
                    onChange={(e) => setJobBudget(e.target.value)}
                    required
                    style={{ padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px" }}
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: "#fafafa", color: "#09090b", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                  >
                    Publish Listing
                  </button>
                </form>
              </section>
            )}

            {/* FILTER & TAB CONTROLS */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setActiveTab("all")}
                  style={{
                    padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
                    backgroundColor: activeTab === "all" ? "#27272a" : "transparent",
                    color: activeTab === "all" ? "#fafafa" : "#71717a",
                    border: "1px solid",
                    borderColor: activeTab === "all" ? "#3f3f46" : "transparent"
                  }}
                >
                  All Projects ({jobs.length})
                </button>
                {user.role === "client" && (
                  <button
                    onClick={() => setActiveTab("my-jobs")}
                    style={{
                      padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
                      backgroundColor: activeTab === "my-jobs" ? "#27272a" : "transparent",
                      color: activeTab === "my-jobs" ? "#fafafa" : "#71717a",
                      border: "1px solid",
                      borderColor: activeTab === "my-jobs" ? "#3f3f46" : "transparent"
                    }}
                  >
                    My Postings
                  </button>
                )}
              </div>

              {/* SEARCH & BUDGET FILTER */}
              <div style={{ display: "flex", gap: "8px", flex: 1, maxWidth: "460px" }}>
                <input
                  type="text"
                  placeholder="Filter by keyword or stack..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 2, padding: "8px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px" }}
                />
                <input
                  type="number"
                  placeholder="Min PKR"
                  value={minBudgetFilter}
                  onChange={(e) => setMinBudgetFilter(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* JOBS FEED */}
            {displayedJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed #27272a", borderRadius: "8px" }}>
                <p style={{ color: "#71717a", fontSize: "14px", margin: 0 }}>No active listings match your parameters.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "14px" }}>
                {displayedJobs.map((job) => (
                  <article key={job.id} style={{ border: "1px solid #27272a", backgroundColor: "#18181b", padding: "20px", borderRadius: "8px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#fafafa", lineHeight: "1.3" }}>{job.title}</h4>
                        <span style={{
                          fontSize: "10px", fontWeight: "600", textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px",
                          border: job.status === "open" ? "1px solid #059669" : job.status === "in_progress" ? "1px solid #d97706" : "1px solid #2563eb",
                          color: job.status === "open" ? "#34d399" : job.status === "in_progress" ? "#fbbf24" : "#93c5fd"
                        }}>
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p style={{ color: "#a1a1aa", fontSize: "13px", lineHeight: "1.5", margin: "8px 0 16px 0" }}>{job.description}</p>
                    </div>

                    <div style={{ borderTop: "1px solid #27272a", paddingTop: "14px", marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                        <div>
                          <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "500" }}>Allocated Budget</span>
                          <div style={{ fontSize: "18px", fontWeight: "600", color: "#fafafa" }}>PKR {job.budget.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: "12px", color: "#71717a" }}>
                          <span>{job.proposals_count || 0} proposals</span>
                        </div>
                      </div>

                      {/* FREELANCER ACTION */}
                      {user.role === "freelancer" && job.status === "open" && (
                        <button
                          onClick={() => setSelectedJobId(job.id)}
                          style={{
                            width: "100%", padding: "8px", backgroundColor: "#fafafa", color: "#09090b",
                            fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px"
                          }}
                        >
                          Submit Proposal
                        </button>
                      )}

                      {/* CLIENT ACTIONS */}
                      {user.role === "client" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => fetchProposalsForJob(job.id)}
                            style={{
                              flex: 1, padding: "8px", backgroundColor: "#27272a", color: "#fafafa",
                              border: "1px solid #3f3f46", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500"
                            }}
                          >
                            Review Bids ({job.proposals_count || 0})
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            style={{
                              padding: "8px 12px", backgroundColor: "transparent", color: "#71717a",
                              border: "1px solid #27272a", borderRadius: "6px", cursor: "pointer", fontSize: "12px"
                            }}
                            title="Delete"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* PROPOSAL MODAL (FREELANCER) */}
            {selectedJobId && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
                <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", padding: "28px", borderRadius: "8px", width: "90%", maxWidth: "460px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#fafafa" }}>Submit Proposal</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#71717a" }}>Listing ID #{selectedJobId}</p>
                  </div>

                  <form onSubmit={handleSubmitBid} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "500", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>BID AMOUNT (PKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 65000"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        required
                        style={{ width: "100%", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "500", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>COVER LETTER</label>
                      <textarea
                        placeholder="Technical approach, delivery timeline, relevant milestones..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        required
                        rows="5"
                        style={{ width: "100%", padding: "10px 12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", color: "#fafafa", fontSize: "13px", boxSizing: "border-box", resize: "none" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button
                        type="submit"
                        style={{ flex: 1, padding: "10px", backgroundColor: "#fafafa", color: "#09090b", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Send Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(null)}
                        style={{ padding: "10px 16px", backgroundColor: "transparent", color: "#a1a1aa", border: "1px solid #27272a", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* CANDIDATE REVIEW MODAL (CLIENT) */}
            {viewingJobProposals && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
                <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", padding: "28px", borderRadius: "8px", width: "90%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "600", color: "#fafafa" }}>Candidate Proposals</h3>
                      <p style={{ margin: 0, fontSize: "12px", color: "#71717a" }}>Listing ID #{viewingJobProposals}</p>
                    </div>
                    <button
                      onClick={() => setViewingJobProposals(null)}
                      style={{ background: "none", border: "none", color: "#71717a", fontSize: "20px", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  {proposalsList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <p style={{ color: "#71717a", fontSize: "13px" }}>No candidate proposals submitted yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {proposalsList.map((p) => (
                        <div key={p.proposal_id} style={{ border: "1px solid #27272a", backgroundColor: "#09090b", padding: "16px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div>
                              <span style={{ fontSize: "14px", fontWeight: "600", color: "#fafafa" }}>{p.freelancer}</span>
                              <span style={{ fontSize: "12px", color: "#71717a", display: "block" }}>{p.email}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase" }}>Proposed Bid</span>
                              <div style={{ fontSize: "16px", fontWeight: "600", color: "#fafafa" }}>PKR {p.bid_amount.toLocaleString()}</div>
                            </div>
                          </div>

                          <p style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: "1.5", margin: "10px 0 14px 0", backgroundColor: "#18181b", padding: "10px 12px", borderRadius: "4px" }}>
                            {p.cover_letter}
                          </p>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "600", textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px",
                              border: p.status === "accepted" ? "1px solid #059669" : p.status === "rejected" ? "1px solid #dc2626" : "1px solid #d97706",
                              color: p.status === "accepted" ? "#34d399" : p.status === "rejected" ? "#f87171" : "#fbbf24"
                            }}>
                              {p.status}
                            </span>

                            {p.status === "pending" && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={() => handleAcceptProposal(p.proposal_id)}
                                  style={{ padding: "6px 14px", backgroundColor: "#fafafa", color: "#09090b", fontWeight: "600", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                                >
                                  Award Contract
                                </button>
                                <button
                                  onClick={() => handleRejectProposal(p.proposal_id)}
                                  style={{ padding: "6px 14px", backgroundColor: "transparent", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                                >
                                  Decline
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