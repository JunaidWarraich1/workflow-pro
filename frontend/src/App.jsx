import { useState, useEffect } from "react";

const API_BASE = "https://workflow-pro-1hg4.vercel.app";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // Authentication State
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("freelancer");
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // Marketplace State
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minBudgetFilter, setMinBudgetFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Job Posting State (Clients)
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobBudget, setJobBudget] = useState("");

  // Proposal State (Freelancers)
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  // Proposal Review State (Clients)
  const [viewingJobProposals, setViewingJobProposals] = useState(null);
  const [proposalsList, setProposalsList] = useState([]);

  // Toast System
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "info" }), 4000);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Color Tokens based on Theme
  const isDark = theme === "dark";
  const colors = {
    bg: isDark ? "#08090c" : "#f8fafc",
    cardBg: isDark ? "#0e1017" : "#ffffff",
    inputBg: isDark ? "#060709" : "#f1f5f9",
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
    textPrimary: isDark ? "#ffffff" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    textMuted: isDark ? "#64748b" : "#94a3b8",
    headerBg: isDark ? "rgba(8, 9, 12, 0.85)" : "rgba(255, 255, 255, 0.85)",
    accentBtn: isDark
      ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
      : "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
    budgetColor: isDark ? "#34d399" : "#059669",
    modalOverlay: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(15, 23, 42, 0.6)",
    secondaryBtnBg: isDark ? "transparent" : "#f1f5f9",
    secondaryBtnText: isDark ? "#94a3b8" : "#475569",
    cardShadow: isDark
      ? "0 4px 20px rgba(0, 0, 0, 0.35)"
      : "0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.07)"
  };

  // Fetch Jobs
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
      console.error("Failed to load listings", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, minBudgetFilter]);

  // Auth Handler
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
        showToast("Account initialized. Please sign in.", "success");
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
        if (!res.ok) throw new Error(data.detail || "Invalid credentials");

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

  // Create Job
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
      if (!res.ok) throw new Error(data.detail || "Failed to publish listing");
      showToast("Listing published to marketplace.", "success");
      setJobTitle("");
      setJobDesc("");
      setJobBudget("");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Permanently remove this listing and all associated candidate bids?")) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Deletion failed");
      showToast("Listing removed.", "info");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Submit Bid
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
      showToast("Proposal dispatched to project owner.", "success");
      setSelectedJobId(null);
      setBidAmount("");
      setCoverLetter("");
      fetchJobs();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Fetch Proposals for Job
  const fetchProposalsForJob = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch candidate proposals");
      setProposalsList(data.proposals || []);
      setViewingJobProposals(jobId);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Accept Proposal
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

  // Reject Proposal
  const handleRejectProposal = async (proposalId) => {
    try {
      const res = await fetch(`${API_BASE}/proposals/${proposalId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Action failed");
      showToast("Candidate proposal declined.", "info");
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
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: colors.bg,
      minHeight: "100vh",
      color: colors.textPrimary,
      letterSpacing: "-0.012em",
      transition: "background-color 0.2s ease, color 0.2s ease"
    }}>

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: "fixed", bottom: "28px", right: "28px", zIndex: 1000,
          backgroundColor: toast.type === "error" ? "rgba(220, 38, 38, 0.95)" : toast.type === "info" ? (isDark ? "rgba(30, 41, 59, 0.95)" : "rgba(241, 245, 249, 0.95)") : "rgba(16, 185, 129, 0.95)",
          color: toast.type === "info" && !isDark ? "#0f172a" : "#ffffff",
          border: `1px solid ${toast.type === "error" ? "#ef4444" : toast.type === "info" ? colors.border : "#10b981"}`,
          backdropFilter: "blur(12px)",
          padding: "12px 22px", borderRadius: "8px", fontSize: "13px", fontWeight: "500",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* NAVBAR */}
      <header style={{
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.headerBg,
        backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 50,
        transition: "all 0.2s ease"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "28px", height: "28px",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isDark ? "0 0 15px rgba(99, 102, 241, 0.4)" : "0 2px 8px rgba(99, 102, 241, 0.25)",
              color: "#ffffff", fontWeight: "700", fontSize: "15px"
            }}>
              W
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "600", fontSize: "16px", color: colors.textPrimary, letterSpacing: "-0.02em" }}>WorkFlow</span>
              <span style={{
                fontSize: "10px", fontWeight: "600", color: "#6366f1",
                backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.08)",
                border: isDark ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(99, 102, 241, 0.2)",
                padding: "2px 7px", borderRadius: "10px"
              }}>
                PRO
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* THEME TOGGLE BUTTON */}
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: colors.secondaryBtnBg,
                color: colors.secondaryBtnText,
                border: `1px solid ${colors.border}`,
                padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px"
              }}
              title="Toggle Light / Dark mode"
            >
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{user.fullName}</span>
                <span style={{
                  fontSize: "10px", fontWeight: "600", textTransform: "uppercase", padding: "3px 9px", borderRadius: "12px",
                  border: user.role === "client" ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
                  color: user.role === "client" ? (isDark ? "#a5b4fc" : "#4f46e5") : (isDark ? "#6ee7b7" : "#059669"),
                  backgroundColor: user.role === "client" ? "rgba(99, 102, 241, 0.08)" : "rgba(16, 185, 129, 0.08)"
                }}>
                  {user.role}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`,
                    padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
                <span style={{ fontSize: "12px", color: colors.textSecondary }}>Live Cloud</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 24px" }}>

        {/* METRICS ROW */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "36px" }}>
          <div style={{
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            padding: "24px", borderRadius: "10px",
            boxShadow: colors.cardShadow,
            transition: "all 0.2s ease"
          }}>
            <span style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.06em" }}>Active Listings</span>
            <div style={{ fontSize: "32px", fontWeight: "700", color: colors.textPrimary, marginTop: "6px", letterSpacing: "-0.03em" }}>{jobs.length}</div>
          </div>

          <div style={{
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            padding: "24px", borderRadius: "10px",
            boxShadow: colors.cardShadow,
            transition: "all 0.2s ease"
          }}>
            <span style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.06em" }}>Marketplace Volume</span>
            <div style={{ fontSize: "32px", fontWeight: "700", color: colors.budgetColor, marginTop: "6px", letterSpacing: "-0.03em" }}>
              PKR {totalMarketVolume.toLocaleString()}
            </div>
          </div>

          <div style={{
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            padding: "24px", borderRadius: "10px",
            boxShadow: colors.cardShadow,
            transition: "all 0.2s ease"
          }}>
            <span style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.06em" }}>Architecture</span>
            <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.08)", border: `1px solid ${colors.border}`, color: isDark ? "#a5b4fc" : "#4f46e5", padding: "3px 8px", borderRadius: "5px" }}>FastAPI</span>
              <span style={{ backgroundColor: isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(56, 189, 248, 0.08)", border: `1px solid ${colors.border}`, color: isDark ? "#7dd3fc" : "#0284c7", padding: "3px 8px", borderRadius: "5px" }}>PostgreSQL 17</span>
              <span style={{ backgroundColor: isDark ? "rgba(168, 85, 247, 0.12)" : "rgba(168, 85, 247, 0.08)", border: `1px solid ${colors.border}`, color: isDark ? "#d8b4fe" : "#7e22ce", padding: "3px 8px", borderRadius: "5px" }}>React Vite</span>
              <span style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)", border: `1px solid ${colors.border}`, color: isDark ? "#6ee7b7" : "#059669", padding: "3px 8px", borderRadius: "5px" }}>AWS Neon</span>
            </div>
          </div>
        </section>

        {/* AUTH CARD */}
        {!user && (
          <section style={{
            maxWidth: "400px", margin: "60px auto",
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.cardBg,
            borderRadius: "12px", padding: "36px",
            boxShadow: colors.cardShadow
          }}>
            <div style={{ marginBottom: "26px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: colors.textPrimary, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                {isRegister ? "Create Account" : "Welcome Back"}
              </h2>
              <p style={{ fontSize: "13px", color: colors.textMuted, margin: 0 }}>
                {isRegister ? "Join the freelance contract network" : "Sign in to manage projects and bids"}
              </p>
            </div>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {isRegister && (
                <>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>FULL NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. Junaid Warraich"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{ width: "100%", padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>ACCOUNT TYPE</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box" }}
                    >
                      <option value="freelancer">Freelancer (Submit Proposals)</option>
                      <option value="client">Client (Publish Projects & Hire)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: "100%", padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>PASSWORD</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "8px",
                  background: colors.accentBtn,
                  color: "#ffffff", fontWeight: "600",
                  padding: "12px", borderRadius: "7px", border: "none", fontSize: "13px", cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)"
                }}
              >
                {isRegister ? "Create Account" : "Continue"}
              </button>
            </form>

            <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: `1px solid ${colors.border}`, textAlign: "center" }}>
              <span style={{ fontSize: "12px", color: colors.textMuted }}>
                {isRegister ? "Have an account?" : "Need an account?"}{" "}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  style={{ background: "none", border: "none", color: "#6366f1", fontWeight: "600", cursor: "pointer", fontSize: "12px", padding: 0 }}
                >
                  {isRegister ? "Sign in" : "Register"}
                </button>
              </span>
            </div>
          </section>
        )}

        {/* LOGGED IN DASHBOARD */}
        {user && (
          <div>
            {/* POST PROJECT (CLIENTS) */}
            {user.role === "client" && (
              <section style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.cardBg,
                borderRadius: "10px", padding: "26px", marginBottom: "36px",
                boxShadow: colors.cardShadow
              }}>
                <div style={{ marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: colors.textPrimary, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>Post New Project</h3>
                  <p style={{ fontSize: "13px", color: colors.textMuted, margin: 0 }}>Publish a project listing with custom scope and budget</p>
                </div>

                <form onSubmit={handlePostJob} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input
                      type="text"
                      placeholder="Project Title (e.g. Build High-Throughput REST API)"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      style={{ padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px" }}
                    />
                    <textarea
                      placeholder="Technical scope, requirements, deliverables..."
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      required
                      rows="3"
                      style={{ padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", resize: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <input
                      type="number"
                      placeholder="Budget (PKR)"
                      value={jobBudget}
                      onChange={(e) => setJobBudget(e.target.value)}
                      required
                      style={{ padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px" }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: "13px",
                        background: colors.accentBtn,
                        color: "#ffffff", fontWeight: "600", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px",
                        boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)"
                      }}
                    >
                      Publish Listing
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* FILTER & TAB BAR */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setActiveTab("all")}
                  style={{
                    padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
                    backgroundColor: activeTab === "all" ? (isDark ? "rgba(99, 102, 241, 0.15)" : "#e0e7ff") : "transparent",
                    color: activeTab === "all" ? (isDark ? "#a5b4fc" : "#4338ca") : colors.textMuted,
                    border: "1px solid",
                    borderColor: activeTab === "all" ? (isDark ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe") : "transparent"
                  }}
                >
                  All Projects ({jobs.length})
                </button>
                {user.role === "client" && (
                  <button
                    onClick={() => setActiveTab("my-jobs")}
                    style={{
                      padding: "7px 14px", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
                      backgroundColor: activeTab === "my-jobs" ? (isDark ? "rgba(99, 102, 241, 0.15)" : "#e0e7ff") : "transparent",
                      color: activeTab === "my-jobs" ? (isDark ? "#a5b4fc" : "#4338ca") : colors.textMuted,
                      border: "1px solid",
                      borderColor: activeTab === "my-jobs" ? (isDark ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe") : "transparent"
                    }}
                  >
                    My Postings
                  </button>
                )}
              </div>

              {/* SEARCH & BUDGET FILTER */}
              <div style={{ display: "flex", gap: "10px", flex: 1, maxWidth: "480px" }}>
                <input
                  type="text"
                  placeholder="Filter by keyword or stack..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 2, padding: "9px 13px", backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px" }}
                />
                <input
                  type="number"
                  placeholder="Min PKR"
                  value={minBudgetFilter}
                  onChange={(e) => setMinBudgetFilter(e.target.value)}
                  style={{ flex: 1, padding: "9px 13px", backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px" }}
                />
              </div>
            </div>

            {/* JOBS GRID */}
            {displayedJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px", border: `1px dashed ${colors.border}`, borderRadius: "10px" }}>
                <p style={{ color: colors.textMuted, fontSize: "14px", margin: 0 }}>No active listings match your parameters.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
                {displayedJobs.map((job) => (
                  <article key={job.id} style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.cardBg,
                    padding: "22px", borderRadius: "10px",
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    boxShadow: colors.cardShadow,
                    transition: "all 0.2s ease"
                  }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: colors.textPrimary, lineHeight: "1.3" }}>{job.title}</h4>
                        <span style={{
                          fontSize: "10px", fontWeight: "600", textTransform: "uppercase", padding: "3px 8px", borderRadius: "5px",
                          border: job.status === "open" ? "1px solid rgba(16, 185, 129, 0.4)" : job.status === "in_progress" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(99, 102, 241, 0.4)",
                          color: job.status === "open" ? (isDark ? "#6ee7b7" : "#059669") : job.status === "in_progress" ? (isDark ? "#fcd34d" : "#d97706") : (isDark ? "#a5b4fc" : "#4f46e5"),
                          backgroundColor: job.status === "open" ? "rgba(16, 185, 129, 0.08)" : job.status === "in_progress" ? "rgba(245, 158, 11, 0.08)" : "rgba(99, 102, 241, 0.08)"
                        }}>
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p style={{ color: colors.textSecondary, fontSize: "13px", lineHeight: "1.55", margin: "10px 0 18px 0" }}>{job.description}</p>
                    </div>

                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "16px", marginTop: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                        <div>
                          <span style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Allocated Budget</span>
                          <div style={{ fontSize: "20px", fontWeight: "700", color: colors.budgetColor, letterSpacing: "-0.02em" }}>PKR {job.budget.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: "12px", color: colors.textMuted }}>
                          <span>{job.proposals_count || 0} proposals</span>
                        </div>
                      </div>

                      {/* FREELANCER ACTION */}
                      {user.role === "freelancer" && job.status === "open" && (
                        <button
                          onClick={() => setSelectedJobId(job.id)}
                          style={{
                            width: "100%", padding: "10px",
                            background: colors.accentBtn,
                            color: "#ffffff", fontWeight: "600", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px",
                            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)"
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
                              flex: 1, padding: "9px",
                              backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "#e0e7ff",
                              color: isDark ? "#c7d2fe" : "#3730a3",
                              border: `1px solid ${isDark ? "rgba(99, 102, 241, 0.25)" : "#c7d2fe"}`, borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "600"
                            }}
                          >
                            Review Bids ({job.proposals_count || 0})
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            style={{
                              padding: "9px 14px", backgroundColor: "transparent", color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "7px", cursor: "pointer", fontSize: "12px"
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

            {/* FREELANCER PROPOSAL MODAL */}
            {selectedJobId && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: colors.modalOverlay, backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
                <div style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, padding: "32px", borderRadius: "12px", width: "90%", maxWidth: "480px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "600", color: colors.textPrimary }}>Submit Proposal</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: colors.textMuted }}>Listing ID #{selectedJobId}</p>
                  </div>

                  <form onSubmit={handleSubmitBid} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>BID AMOUNT (PKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 65000"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        required
                        style={{ width: "100%", padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>COVER LETTER</label>
                      <textarea
                        placeholder="Technical approach, delivery timeline, relevant milestones..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        required
                        rows="5"
                        style={{ width: "100%", padding: "11px 14px", backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, borderRadius: "7px", color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box", resize: "none" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <button
                        type="submit"
                        style={{
                          flex: 1, padding: "12px",
                          background: colors.accentBtn,
                          color: "#ffffff", fontWeight: "600", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px",
                          boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)"
                        }}
                      >
                        Send Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(null)}
                        style={{ padding: "12px 18px", backgroundColor: "transparent", color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: "7px", cursor: "pointer", fontSize: "13px" }}
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
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: colors.modalOverlay, backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
                <div style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.border}`, padding: "32px", borderRadius: "12px", width: "90%", maxWidth: "620px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: "600", color: colors.textPrimary }}>Candidate Proposals</h3>
                      <p style={{ margin: 0, fontSize: "12px", color: colors.textMuted }}>Listing ID #{viewingJobProposals}</p>
                    </div>
                    <button
                      onClick={() => setViewingJobProposals(null)}
                      style={{ background: "none", border: "none", color: colors.textMuted, fontSize: "22px", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  {proposalsList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <p style={{ color: colors.textMuted, fontSize: "13px" }}>No candidate proposals submitted yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {proposalsList.map((p) => (
                        <div key={p.proposal_id} style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.inputBg, padding: "18px", borderRadius: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <div>
                              <span style={{ fontSize: "15px", fontWeight: "600", color: colors.textPrimary }}>{p.freelancer}</span>
                              <span style={{ fontSize: "12px", color: colors.textMuted, display: "block" }}>{p.email}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "10px", color: colors.textMuted, textTransform: "uppercase" }}>Proposed Bid</span>
                              <div style={{ fontSize: "17px", fontWeight: "700", color: colors.budgetColor }}>PKR {p.bid_amount.toLocaleString()}</div>
                            </div>
                          </div>

                          <p style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.55", margin: "12px 0 16px 0", backgroundColor: colors.cardBg, padding: "12px 14px", borderRadius: "6px", border: `1px solid ${colors.border}` }}>
                            {p.cover_letter}
                          </p>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: "600", textTransform: "uppercase", padding: "3px 8px", borderRadius: "4px",
                              border: p.status === "accepted" ? "1px solid rgba(16, 185, 129, 0.4)" : p.status === "rejected" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(245, 158, 11, 0.4)",
                              color: p.status === "accepted" ? (isDark ? "#6ee7b7" : "#059669") : p.status === "rejected" ? (isDark ? "#fca5a5" : "#dc2626") : (isDark ? "#fcd34d" : "#d97706"),
                              backgroundColor: p.status === "accepted" ? "rgba(16, 185, 129, 0.08)" : p.status === "rejected" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)"
                            }}>
                              {p.status}
                            </span>

                            {p.status === "pending" && (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => handleAcceptProposal(p.proposal_id)}
                                  style={{
                                    padding: "8px 16px",
                                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                    color: "#ffffff", fontWeight: "600", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                                    boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)"
                                  }}
                                >
                                  Award Contract
                                </button>
                                <button
                                  onClick={() => handleRejectProposal(p.proposal_id)}
                                  style={{
                                    padding: "8px 16px", backgroundColor: "transparent", color: isDark ? "#fca5a5" : "#dc2626",
                                    border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5"}`, borderRadius: "6px", cursor: "pointer", fontSize: "12px"
                                  }}
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