import { useState, useEffect, useCallback } from "react";
import logo from '../inexa-logo.jpeg';

const BASE = "http://localhost:5000";

const statusColor = {
  Upcoming:  { bg: "#fdf4f4", text: "#9b1c1c", border: "#fca5a5" },
  Completed: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Confirmed: { bg: "#fdf4f4", text: "#7f1d1d", border: "#fca5a5" },
  Pending:   { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  "Leave Approved": { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  "Covering Duty":  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
};

const navItems = [
  { id: "duties",      label: "Invigilation Duties", icon: "📋" },
  { id: "adjustments", label: "Leave Adjustments",   icon: "🔄" },
  { id: "profile",     label: "My Profile",          icon: "👤" },
];

export default function TeachersPage() {
  const [activeNav, setActiveNav]       = useState("duties");
  const [adjTab, setAdjTab]             = useState("duties");
  const [activeFilter, setActiveFilter] = useState("All");
  const [teacher, setTeacher]           = useState(null);
  const [duties, setDuties]             = useState([]);
  const [adjustments, setAdjustments]   = useState([]);
  const [allFaculty, setAllFaculty]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [adjustModal, setAdjustModal]   = useState(null);
  const [swapSearch, setSwapSearch]     = useState("");
  const [swapReason, setSwapReason]     = useState("");
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [toast, setToast]               = useState(null);

  const facultyId = localStorage.getItem("facultyId");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDuties = useCallback(() => {
    if (!facultyId) return;
    fetch(`${BASE}/api/slots/faculty/${facultyId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setDuties(data); })
      .catch(() => {});
  }, [facultyId]);

  const fetchAdjustments = useCallback(() => {
    if (!facultyId) return;
    fetch(`${BASE}/api/slots/adjustments/${facultyId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setAdjustments(data); })
      .catch(() => {});
  }, [facultyId]);

  useEffect(() => {
    if (!facultyId) { setError("no_id"); setLoading(false); return; }
    fetch(`${BASE}/api/slots/faculty-detail/${facultyId}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP_${r.status}`); return r.json(); })
      .then(data => {
        setTeacher(data);
        setLoading(false);
        fetch(`${BASE}/api/slots/faculty-list?semester=${data.semester}`)
          .then(r => r.json())
          .then(list => { if (Array.isArray(list)) setAllFaculty(list.filter(f => f._id !== facultyId)); })
          .catch(() => {});
      })
      .catch(err => { setError(err.message || "fetch_failed"); setLoading(false); });
    fetchDuties();
    fetchAdjustments();
  }, [facultyId, fetchDuties, fetchAdjustments]);

  const handleConfirm = async () => {
    if (!confirmModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/slots/${confirmModal._id}/confirm/${facultyId}`, { method: "POST" });
      if (res.ok) { showToast("Duty confirmed successfully"); fetchDuties(); setConfirmModal(null); }
      else showToast("Failed to confirm duty", "error");
    } catch { showToast("Server error", "error"); }
    setSubmitting(false);
  };

  const handleAdjust = async () => {
    if (!adjustModal || !selectedSwap) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/slots/${adjustModal._id}/adjust/${facultyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapWithFacultyId: selectedSwap._id, swapWithName: selectedSwap.name, swapWithDesignation: selectedSwap.designation, reason: swapReason || "Swap Request" })
      });
      if (res.ok) {
        showToast("Adjustment request submitted");
        fetchDuties(); fetchAdjustments();
        setAdjustModal(null); setSelectedSwap(null); setSwapSearch(""); setSwapReason("");
        setAdjTab("history");
      } else showToast("Failed to submit adjustment", "error");
    } catch { showToast("Server error", "error"); }
    setSubmitting(false);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—";
  const getInitials = (name = "") => name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const filteredFaculty = allFaculty.filter(f =>
    (f.name || "").toLowerCase().includes(swapSearch.toLowerCase()) ||
    (f.designation || "").toLowerCase().includes(swapSearch.toLowerCase()) ||
    (f.department || "").toLowerCase().includes(swapSearch.toLowerCase())
  );

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#fdf6f6", fontFamily:"'Georgia', serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, border:"3px solid #f3d5d5", borderTopColor:"#9b1c1c", borderRadius:"50%", animation:"spin 0.9s linear infinite", margin:"0 auto 20px" }}></div>
        <div style={{ fontSize:15, color:"#9b1c1c", fontWeight:500, letterSpacing:"0.3px" }}>Loading dashboard…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    const isNoId = error === "no_id";
    const is404  = error.includes("404");
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#fdf6f6" }}>
        <div style={{ background:"#fff", borderRadius:16, padding:"40px 48px", maxWidth:440, width:"90%", border:"1px solid #fde8e8", boxShadow:"0 4px 24px rgba(155,28,28,0.08)", textAlign:"center" }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#fdf4f4", border:"1px solid #fca5a5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 20px" }}>
            {isNoId ? "🔐" : is404 ? "❓" : "⚠️"}
          </div>
          <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:700, color:"#1c1917", fontFamily:"'Georgia', serif" }}>
            {isNoId ? "Session expired" : is404 ? "Account not found" : "Connection error"}
          </h2>
          <p style={{ margin:"0 0 28px", fontSize:14, color:"#78716c", lineHeight:1.7 }}>
            {isNoId ? "Please log in again as Faculty to continue." : is404 ? "Your faculty account could not be found." : "Backend server may not be running on port 5000."}
          </p>
          <button onClick={() => { localStorage.clear(); window.location.href = "/Login"; }}
            style={{ padding:"11px 28px", background:"#9b1c1c", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:14, letterSpacing:"0.3px" }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Stat cards ───────────────────────────────────────────────
  const ghostCoveringCount = adjustments.filter(a => a.status === "Confirmed" && a.replacedBy === teacher?.name && !duties.some(d => d._id === a._id)).length;

  const statCards = [
    { label:"Total Duties",  value: duties.length + ghostCoveringCount,                                                              accent:"#9b1c1c" },
    { label:"Upcoming",      value: duties.filter(d=>d.status==="Upcoming").length + ghostCoveringCount,                             accent:"#c2410c" },
    { label:"Confirmed",     value: duties.filter(d=>d.confirmationStatus==="Confirmed").length + ghostCoveringCount,                accent:"#15803d" },
    { label:"Pending",       value: duties.filter(d=>d.confirmationStatus==="Pending"&&d.status==="Upcoming").length,                accent:"#b45309" },
  ];

  // ── Pill component ───────────────────────────────────────────
  const Pill = ({ icon, label, value }) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, background:"#fdf4f4", border:"1px solid #fde8e8" }}>
      <span style={{ fontSize:13 }}>{icon}</span>
      <div>
        <div style={{ fontSize:9, color:"#a8a29e", textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:12, fontWeight:600, color:"#292524" }}>{value}</div>
      </div>
    </div>
  );

  // ── Duty card ────────────────────────────────────────────────
  const DutyCard = ({ d }) => {
    const confirmed = d.confirmationStatus === "Confirmed";
    const adjusted  = d.adjustmentRequested;
    const completed = d.status === "Completed";
    const ss = confirmed ? statusColor["Confirmed"] : statusColor[d.status] || statusColor["Upcoming"];
    return (
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #fde8e8", overflow:"hidden", boxShadow:"0 1px 4px rgba(155,28,28,0.06)", transition:"all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow="0 8px 24px rgba(155,28,28,0.1)"; e.currentTarget.style.transform="translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow="0 1px 4px rgba(155,28,28,0.06)"; e.currentTarget.style.transform="translateY(0)"; }}
      >
        {/* top stripe */}
        <div style={{ height:3, background: confirmed ? "linear-gradient(90deg,#15803d,#16a34a)" : completed ? "#d4b5b5" : "linear-gradient(90deg,#9b1c1c,#dc2626)" }}></div>

        <div style={{ padding:"20px 24px" }}>
          {/* header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, gap:12 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#1c1917", marginBottom:3, fontFamily:"'Georgia', serif" }}>{d.exam || "—"}</div>
              <div style={{ fontSize:12, color:"#a8a29e", fontWeight:400 }}>{d.subject || ""}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
              <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:ss.bg, color:ss.text, border:`1px solid ${ss.border}`, letterSpacing:"0.3px" }}>
                {confirmed ? "Confirmed" : completed ? "Completed" : d.status || "Upcoming"}
              </span>
              {adjusted && <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#fdf4f4", color:"#9b1c1c", border:"1px solid #fca5a5", letterSpacing:"0.3px" }}>Swap Done</span>}
            </div>
          </div>

          {/* info pills */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom: completed ? 0 : 16 }}>
            <Pill icon="🎓" label="Class"    value={d.class || "—"} />
            <Pill icon="📍" label="Room"     value={d.room  || "—"} />
            <Pill icon="📅" label="Date"     value={fmt(d.date || d.originalDate)} />
            <Pill icon="🕐" label="Time"     value={d.time  || "—"} />
            {d.students != null && <Pill icon="👥" label="Students" value={d.students} />}
          </div>

          {/* actions */}
          {!completed && !d.isLeaveOverlay && (
            <div style={{ display:"flex", gap:10, paddingTop:16, borderTop:"1px solid #fdf4f4" }}>
              {!confirmed ? (
                <button onClick={() => setConfirmModal(d)}
                  style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background:"#9b1c1c", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:13, letterSpacing:"0.2px", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#7f1d1d"; e.currentTarget.style.boxShadow="0 4px 12px rgba(155,28,28,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#9b1c1c"; e.currentTarget.style.boxShadow="none"; }}
                >Confirm Duty</button>
              ) : (
                <div style={{ flex:1, padding:"10px 0", borderRadius:9, background:"#f0fdf4", border:"1px solid #86efac", color:"#166534", fontWeight:600, fontSize:13, textAlign:"center" }}>✓ Confirmed</div>
              )}
              {!adjusted ? (
                <button onClick={() => setAdjustModal(d)}
                  style={{ flex:1, padding:"10px 0", borderRadius:9, border:"1px solid #fde8e8", background:"#fdf6f6", color:"#9b1c1c", cursor:"pointer", fontWeight:600, fontSize:13, letterSpacing:"0.2px", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#fde8e8"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#fdf6f6"; }}
                >Request Swap</button>
              ) : (
                <div style={{ flex:1, padding:"10px 0", borderRadius:9, background:"#fdf4f4", border:"1px solid #fca5a5", color:"#9b1c1c", fontWeight:600, fontSize:13, textAlign:"center" }}>↔ Swapped</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI', system-ui, sans-serif", background:"#fdf6f6" }}>

      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:#fcd5d5; border-radius:4px; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:9999, padding:"13px 18px", borderRadius:10, background: toast.type==="error" ? "#fff1f1" : "#fff", border:`1px solid ${toast.type==="error" ? "#fca5a5" : "#d4b5b5"}`, color: toast.type==="error" ? "#991b1b" : "#3d0000", fontWeight:500, fontSize:14, boxShadow:"0 8px 24px rgba(155,28,28,0.12)", animation:"slideIn 0.3s ease", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>{toast.type==="error" ? "⚠️" : "✓"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(28,10,10,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:18, padding:"36px 40px", maxWidth:460, width:"100%", boxShadow:"0 24px 64px rgba(155,28,28,0.18)", border:"1px solid #fde8e8", animation:"fadeUp 0.25s ease" }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#fdf4f4", border:"1px solid #fca5a5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px" }}>📋</div>
              <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:700, color:"#1c1917", fontFamily:"'Lora', serif" }}>Confirm Duty</h2>
              <p style={{ margin:0, color:"#78716c", fontSize:14 }}>You're acknowledging this invigilation assignment.</p>
            </div>
            <div style={{ background:"#fdf6f6", borderRadius:12, padding:"16px 20px", marginBottom:24, border:"1px solid #fde8e8" }}>
              <div style={{ fontSize:16, fontWeight:600, color:"#1c1917", marginBottom:10, fontFamily:"'Lora', serif" }}>{confirmModal.exam}</div>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {[["📍", confirmModal.room], ["📅", fmt(confirmModal.date)], ["🕐", confirmModal.time]].map(([ic, val], i) => (
                  <span key={i} style={{ fontSize:13, color:"#78716c", display:"flex", alignItems:"center", gap:5 }}>{ic} {val}</span>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setConfirmModal(null)} style={{ flex:1, padding:"11px 0", borderRadius:9, border:"1px solid #e7e5e4", background:"#fff", color:"#78716c", cursor:"pointer", fontWeight:500, fontSize:14 }}>Cancel</button>
              <button onClick={handleConfirm} disabled={submitting} style={{ flex:1, padding:"11px 0", borderRadius:9, border:"none", background:"#9b1c1c", color:"#fff", cursor:"pointer", fontWeight:600, fontSize:14, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Modal ── */}
      {adjustModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(28,10,10,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:18, padding:"36px 40px", maxWidth:520, width:"100%", boxShadow:"0 24px 64px rgba(155,28,28,0.18)", maxHeight:"90vh", overflowY:"auto", border:"1px solid #fde8e8", animation:"fadeUp 0.25s ease" }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#fdf4f4", border:"1px solid #fca5a5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px" }}>🔄</div>
              <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:700, color:"#1c1917", fontFamily:"'Lora', serif" }}>Request Swap</h2>
              <p style={{ margin:0, color:"#78716c", fontSize:14 }}>Select a colleague to take over this duty.</p>
            </div>
            <div style={{ background:"#fdf6f6", borderRadius:12, padding:"14px 18px", marginBottom:20, border:"1px solid #fde8e8" }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#1c1917", marginBottom:6 }}>{adjustModal.exam}</div>
              <div style={{ fontSize:12, color:"#a8a29e" }}>📅 {fmt(adjustModal.date)} · 🕐 {adjustModal.time} · 📍 {adjustModal.room}</div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534e", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.6px" }}>Reason</label>
              <input value={swapReason} onChange={e => setSwapReason(e.target.value)} placeholder="e.g. Medical leave, personal emergency…"
                style={{ width:"100%", padding:"10px 14px", borderRadius:9, border:"1px solid #fde8e8", fontSize:13, outline:"none", background:"#fdf9f9", color:"#1c1917" }}
                onFocus={e => e.target.style.borderColor="#9b1c1c"} onBlur={e => e.target.style.borderColor="#fde8e8"} />
            </div>

            <div style={{ marginBottom:10 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534e", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.6px" }}>Search Faculty</label>
              <input value={swapSearch} onChange={e => setSwapSearch(e.target.value)} placeholder="Name, designation, department…"
                style={{ width:"100%", padding:"10px 14px", borderRadius:9, border:"1px solid #fde8e8", fontSize:13, outline:"none", background:"#fdf9f9", color:"#1c1917" }}
                onFocus={e => e.target.style.borderColor="#9b1c1c"} onBlur={e => e.target.style.borderColor="#fde8e8"} />
            </div>

            <div style={{ maxHeight:200, overflowY:"auto", marginBottom:16, border:"1px solid #fde8e8", borderRadius:10, background:"#fff" }}>
              {filteredFaculty.length === 0
                ? <div style={{ padding:20, textAlign:"center", color:"#a8a29e", fontSize:13 }}>No faculty found</div>
                : filteredFaculty.map(f => (
                  <div key={f._id} onClick={() => setSelectedSwap(f)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", cursor:"pointer", borderBottom:"1px solid #fdf4f4", background: selectedSwap?._id===f._id ? "#fdf4f4" : "#fff", borderLeft:`3px solid ${selectedSwap?._id===f._id ? "#9b1c1c" : "transparent"}`, transition:"background 0.15s" }}
                    onMouseEnter={e => { if (selectedSwap?._id!==f._id) e.currentTarget.style.background="#fdf9f9"; }}
                    onMouseLeave={e => { if (selectedSwap?._id!==f._id) e.currentTarget.style.background="#fff"; }}
                  >
                    <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#9b1c1c,#dc2626)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{getInitials(f.name)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1c1917" }}>{f.name}</div>
                      <div style={{ fontSize:11, color:"#a8a29e" }}>{f.designation} · {f.department}</div>
                    </div>
                    {selectedSwap?._id===f._id && <span style={{ color:"#9b1c1c", fontSize:16 }}>✓</span>}
                  </div>
                ))
              }
            </div>

            {selectedSwap && (
              <div style={{ background:"#fdf4f4", borderRadius:9, padding:"10px 14px", marginBottom:18, border:"1px solid #fca5a5", fontSize:13, color:"#9b1c1c", fontWeight:500 }}>
                Selected: <strong>{selectedSwap.name}</strong> — {selectedSwap.designation}
              </div>
            )}

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => { setAdjustModal(null); setSelectedSwap(null); setSwapSearch(""); setSwapReason(""); }} style={{ flex:1, padding:"11px 0", borderRadius:9, border:"1px solid #e7e5e4", background:"#fff", color:"#78716c", cursor:"pointer", fontWeight:500, fontSize:14 }}>Cancel</button>
              <button onClick={handleAdjust} disabled={!selectedSwap||submitting} style={{ flex:1, padding:"11px 0", borderRadius:9, border:"none", background: selectedSwap ? "#9b1c1c" : "#e7e5e4", color: selectedSwap ? "#fff" : "#a8a29e", cursor: selectedSwap ? "pointer" : "not-allowed", fontWeight:600, fontSize:14, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ SIDEBAR ════════ */}
      <aside style={{ width:260, flexShrink:0, position:"sticky", top:0, height:"100vh", background:"#800000", borderRight:"1px solid #800000", display:"flex", flexDirection:"column" }}>

        {/* Brand */}
        <div style={{ padding:"24px 22px 20px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <img src={logo} alt="InExa Logo" style={{ width:38, height:38, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:"#fff", fontFamily:"'Lora', serif", lineHeight:1 }}>InExa</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", letterSpacing:"0.8px", textTransform:"uppercase", marginTop:2 }}>Faculty Portal</div>
            </div>
          </div>
        </div>

        {/* Profile card */}
        <div onClick={() => setActiveNav("profile")}
          style={{ padding:"18px 22px", borderBottom:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", background: activeNav==="profile" ? "rgba(255,255,255,0.2)" : "transparent", transition:"background 0.15s" }}
          onMouseEnter={e => { if (activeNav!=="profile") e.currentTarget.style.background="rgba(255,255,255,0.1)"; }}
          onMouseLeave={e => { if (activeNav!=="profile") e.currentTarget.style.background="transparent"; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:13 }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:700, color:"#fff" }}>
                {getInitials(teacher?.name)}
              </div>
              <div style={{ position:"absolute", bottom:1, right:1, width:11, height:11, borderRadius:"50%", background:"#22c55e", border:"2px solid #800000" }}></div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{teacher?.name || "—"}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.9)", marginTop:2 }}>{teacher?.designation || ""}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{teacher?.department || ""}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 10px" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:600, padding:"6px 12px 8px" }}>Menu</div>
          {navItems.map(item => {
            const active = activeNav === item.id;
            const badge = item.id==="adjustments" ? adjustments.length : item.id==="duties" ? duties.filter(d=>d.confirmationStatus==="Pending"&&d.status==="Upcoming").length : 0;
            return (
              <button key={item.id} onClick={() => setActiveNav(item.id)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"11px 14px", borderRadius:9, border:"none", cursor:"pointer", marginBottom:2, textAlign:"left", background: active ? "rgba(255,255,255,0.2)" : "transparent", color: active ? "#ffffff" : "rgba(255,255,255,0.7)", fontWeight: active ? 600 : 400, fontSize:14, transition:"all 0.15s", fontFamily:"inherit" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#ffffff"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.7)"; }}}
              >
                <span style={{ fontSize:15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {badge > 0 && (
                  <span style={{ background:"#ffffff", color:"#800000", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, minWidth:20, textAlign:"center" }}>{badge}</span>
                )}
                {active && <div style={{ width:5, height:5, borderRadius:"50%", background:"#ffffff", boxShadow:"0 0 4px #ffffff" }}></div>}
              </button>
            );
          })}
        </nav>

        {/* Stats */}
        <div style={{ padding:"14px 18px", borderTop:"1px solid rgba(255,255,255,0.1)", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{ label:"Upcoming", value: duties.filter(d=>d.status==="Upcoming").length }, { label:"Done", value: duties.filter(d=>d.status==="Completed").length }].map((s,i) => (
              <div key={i} style={{ padding:"10px 12px", borderRadius:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:700, color:"#ffffff", lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:"0.6px", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div style={{ padding:"14px 18px" }}>
          <button onClick={() => { localStorage.clear(); window.location.href="/Login"; }}
            style={{ width:"100%", padding:"10px 0", borderRadius:9, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.8)", cursor:"pointer", fontSize:13, fontWeight:500, transition:"all 0.2s", fontFamily:"inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}
          >Sign out</button>
        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <main style={{ flex:1, overflowY:"auto", padding:"36px 40px", minWidth:0, background:"#fdf6f6" }}>

        {/* ── DUTIES ── */}
        {activeNav==="duties" && (
          <div style={{ animation:"fadeUp 0.3s ease" }}>
            {/* Page header */}
            <div style={{ marginBottom:28 }}>
              <h1 style={{ margin:"0 0 4px", fontSize:24, fontWeight:700, color:"#1c1917", fontFamily:"'Lora', serif" }}>Invigilation Duties</h1>
              <p style={{ margin:0, fontSize:14, color:"#a8a29e" }}>Manage and confirm your assigned examination duties</p>
            </div>

            {/* Stat row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:14, marginBottom:28 }}>
              {statCards.map((s,i) => (
                <div key={i} style={{ background:"#fff", borderRadius:12, padding:"18px 20px", border:"1px solid #fde8e8", boxShadow:"0 1px 4px rgba(155,28,28,0.04)" }}>
                  <div style={{ fontSize:28, fontWeight:700, color:s.accent, lineHeight:1, marginBottom:4, fontFamily:"'Lora', serif" }}>{s.value}</div>
                  <div style={{ fontSize:12, color:"#a8a29e", fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {duties.length === 0 && adjustments.filter(a => a.status === "Confirmed" && (a.absentTeacher === teacher?.name || a.replacedBy === teacher?.name)).length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 40px", background:"#fff", borderRadius:14, border:"1px solid #fde8e8" }}>
                <div style={{ fontSize:40, marginBottom:14 }}>📋</div>
                <div style={{ fontSize:17, fontWeight:600, color:"#1c1917", fontFamily:"'Lora', serif", marginBottom:6 }}>No duties assigned yet</div>
                <div style={{ fontSize:14, color:"#a8a29e" }}>Duties will appear here once assigned by admin.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gap:14 }}>
                {duties.map((d,idx) => <DutyCard key={`duty-${d._id||idx}`} d={d} />)}
                {adjustments
                  .filter(a => a.status === "Confirmed" && (a.absentTeacher === teacher?.name || a.replacedBy === teacher?.name))
                  .filter(a => !duties.some(d => d._id === a._id))
                  .map((a,idx) => (
                    <DutyCard key={`adj-${a._id||idx}`} d={{ 
                      ...a, 
                      status: a.absentTeacher === teacher?.name ? "Leave Approved" : "Covering Duty", 
                      isLeaveOverlay: true, 
                      date: a.originalDate || a.date 
                    }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADJUSTMENTS ── */}
        {activeNav==="adjustments" && (
          <div style={{ animation:"fadeUp 0.3s ease" }}>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ margin:"0 0 4px", fontSize:24, fontWeight:700, color:"#1c1917", fontFamily:"'Lora', serif" }}>Leave Adjustments</h1>
              <p style={{ margin:0, fontSize:14, color:"#a8a29e" }}>Confirm duties or request swaps with colleagues</p>
            </div>

            {/* Tab switcher */}
            <div style={{ display:"flex", gap:2, background:"#fde8e8", borderRadius:10, padding:4, marginBottom:28, width:"fit-content" }}>
              {[{ id:"duties", label:`My Duties (${duties.filter(d=>d.status==="Upcoming").length})` }, { id:"history", label:`History (${adjustments.length})` }].map(tab => (
                <button key={tab.id} onClick={() => setAdjTab(tab.id)}
                  style={{ padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight: adjTab===tab.id ? 600 : 400, transition:"all 0.2s", background: adjTab===tab.id ? "#fff" : "transparent", color: adjTab===tab.id ? "#9b1c1c" : "#a8a29e", boxShadow: adjTab===tab.id ? "0 1px 6px rgba(155,28,28,0.1)" : "none", fontFamily:"inherit" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {adjTab==="duties" && (
              <div>
                <div style={{ background:"#fff", border:"1px solid #fde8e8", borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ width:32, height:32, borderRadius:"50%", background:"#fdf4f4", border:"1px solid #fca5a5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>💡</span>
                  <div style={{ fontSize:13, color:"#57534e" }}>Confirm a duty to notify admin, or request a swap to reassign it to a colleague.</div>
                </div>
                {duties.filter(d=>d.status==="Upcoming").length===0
                  ? <div style={{ textAlign:"center", padding:"50px 40px", background:"#fff", borderRadius:14, border:"1px solid #fde8e8" }}>
                      <div style={{ fontSize:40, marginBottom:14 }}>🎉</div>
                      <div style={{ fontSize:17, fontWeight:600, color:"#1c1917", fontFamily:"'Lora', serif" }}>No upcoming duties</div>
                    </div>
                  : <div style={{ display:"grid", gap:14 }}>
                      {duties.filter(d=>d.status==="Upcoming").map((d,idx) => <DutyCard key={d._id||idx} d={d} />)}
                    </div>
                }
              </div>
            )}

            {adjTab==="history" && (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                  {["All","Confirmed","Pending"].map(f => {
                    const isA = activeFilter===f;
                    return (
                      <button key={f} onClick={() => setActiveFilter(f)}
                        style={{ padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight: isA ? 600 : 400, cursor:"pointer", background: isA ? "#9b1c1c" : "#fff", color: isA ? "#fff" : "#78716c", border: isA ? "1px solid #9b1c1c" : "1px solid #fde8e8", transition:"all 0.15s", fontFamily:"inherit" }}>
                        {f}
                      </button>
                    );
                  })}
                </div>
                {adjustments.length===0
                  ? <div style={{ textAlign:"center", padding:"50px 40px", background:"#fff", borderRadius:14, border:"1px solid #fde8e8" }}>
                      <div style={{ fontSize:40, marginBottom:14 }}>🔄</div>
                      <div style={{ fontSize:17, fontWeight:600, color:"#1c1917", fontFamily:"'Lora', serif" }}>No adjustments yet</div>
                      <button onClick={() => setAdjTab("duties")} style={{ marginTop:16, padding:"9px 22px", background:"#9b1c1c", color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:"inherit" }}>View My Duties →</button>
                    </div>
                  : <div style={{ display:"grid", gap:14 }}>
                      {adjustments.filter(a => activeFilter==="All" || a.status===activeFilter).map((a,idx) => {
                        const ss = statusColor[a.status] || statusColor["Pending"];
                        const isMine = a.absentTeacher===teacher?.name;
                        return (
                          <div key={a._id||idx} style={{ background:"#fff", borderRadius:14, overflow:"hidden", border:"1px solid #fde8e8", boxShadow:"0 1px 4px rgba(155,28,28,0.06)", transition:"all 0.2s" }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow="0 8px 24px rgba(155,28,28,0.1)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow="0 1px 4px rgba(155,28,28,0.06)"; e.currentTarget.style.transform="translateY(0)"; }}
                          >
                            <div style={{ height:3, background:"linear-gradient(90deg,#9b1c1c,#dc2626)" }}></div>
                            <div style={{ padding:"20px 24px" }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                                <div>
                                  <div style={{ fontSize:16, fontWeight:600, color:"#1c1917", marginBottom:3, fontFamily:"'Lora', serif" }}>{a.exam}</div>
                                  <div style={{ fontSize:12, color:"#a8a29e" }}>{a.class} · {a.room}</div>
                                </div>
                                <div style={{ display:"flex", gap:6 }}>
                                  {isMine && <span style={{ fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#fdf4f4", color:"#9b1c1c", border:"1px solid #fca5a5" }}>Your Request</span>}
                                  <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:ss.bg, color:ss.text, border:`1px solid ${ss.border}` }}>{a.status}</span>
                                </div>
                              </div>
                              {/* swap flow visual */}
                              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderRadius:10, background:"#fdf6f6", border:"1px solid #fde8e8", marginBottom:14 }}>
                                <div style={{ flex:1, textAlign:"center" }}>
                                  <div style={{ fontSize:9, color:"#a8a29e", textTransform:"uppercase", letterSpacing:"0.6px", fontWeight:600, marginBottom:6 }}>Requesting</div>
                                  <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"6px 11px", borderRadius:8, background:"#fdf4f4", border:"1px solid #fca5a5" }}>
                                    <div style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#9b1c1c,#dc2626)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff" }}>{getInitials(a.absentTeacher)}</div>
                                    <span style={{ fontSize:13, fontWeight:600, color:"#9b1c1c" }}>{a.absentTeacher}</span>
                                  </div>
                                  {a.reason && <div style={{ fontSize:11, color:"#a8a29e", marginTop:5 }}>"{a.reason}"</div>}
                                </div>
                                <div style={{ color:"#d4b5b5", fontSize:18 }}>→</div>
                                <div style={{ flex:1, textAlign:"center" }}>
                                  <div style={{ fontSize:9, color:"#a8a29e", textTransform:"uppercase", letterSpacing:"0.6px", fontWeight:600, marginBottom:6 }}>Covering</div>
                                  <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"6px 11px", borderRadius:8, background:"#f0fdf4", border:"1px solid #86efac" }}>
                                    <div style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#15803d,#16a34a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff" }}>{getInitials(a.replacedBy)}</div>
                                    <span style={{ fontSize:13, fontWeight:600, color:"#15803d" }}>{a.replacedBy}</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                                <Pill icon="📅" label="Date" value={fmt(a.originalDate)} />
                                <Pill icon="🕐" label="Time" value={a.time || "—"} />
                                <Pill icon="📍" label="Room" value={a.room || "—"} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE ── */}
        {activeNav==="profile" && (
          <div style={{ animation:"fadeUp 0.3s ease", maxWidth:700 }}>
            <div style={{ marginBottom:28 }}>
              <h1 style={{ margin:"0 0 4px", fontSize:24, fontWeight:700, color:"#1c1917", fontFamily:"'Lora', serif" }}>My Profile</h1>
              <p style={{ margin:0, fontSize:14, color:"#a8a29e" }}>Your account details from the system</p>
            </div>

            {/* Profile hero */}
            <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", border:"1px solid #fde8e8", boxShadow:"0 1px 4px rgba(155,28,28,0.06)", marginBottom:20 }}>
              <div style={{ height:100, background:"linear-gradient(135deg,#450a0a,#9b1c1c,#ef4444)", position:"relative" }}>
                <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize:"20px 20px" }}></div>
                <div style={{ position:"absolute", bottom:-40, left:32 }}>
                  <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#9b1c1c,#dc2626)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, color:"#fff", boxShadow:"0 0 0 5px #fff, 0 4px 16px rgba(155,28,28,0.25)" }}>{getInitials(teacher?.name)}</div>
                </div>
              </div>
              <div style={{ padding:"50px 32px 28px" }}>
                <h2 style={{ margin:"0 0 3px", fontSize:22, fontWeight:700, color:"#1c1917", fontFamily:"'Lora', serif" }}>{teacher?.name}</h2>
                <p style={{ margin:"0 0 16px", fontSize:14, color:"#9b1c1c", fontWeight:500 }}>{teacher?.designation}</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span style={{ padding:"4px 12px", borderRadius:20, background:"#fdf4f4", border:"1px solid #fca5a5", fontSize:12, fontWeight:500, color:"#9b1c1c" }}>{teacher?.department}</span>
                  <span style={{ padding:"4px 12px", borderRadius:20, background:"#f0fdf4", border:"1px solid #86efac", fontSize:12, fontWeight:500, color:"#15803d" }}>Active</span>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { icon:"✉️", label:"Email",      value: teacher?.email },
                { icon:"📞", label:"Phone",      value: teacher?.phone },
                { icon:"🏛️", label:"Department", value: teacher?.department },
              ].filter(item => item.label !== "Phone").map((item,i) => (
                <div key={i} style={{ padding:"18px 20px", borderRadius:12, background:"#fff", border:"1px solid #fde8e8", display:"flex", alignItems:"center", gap:14, boxShadow:"0 1px 4px rgba(155,28,28,0.04)" }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:"#fdf4f4", border:"1px solid #fde8e8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize:10, color:"#a8a29e", textTransform:"uppercase", fontWeight:600, letterSpacing:"0.6px", marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:14, fontWeight:500, color:"#1c1917" }}>{item.value || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
