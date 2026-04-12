import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from '../inexa-logo.jpeg';

// Helper: extract just the number from any semester string
function extractSemNum(val) {
  if (val === undefined || val === null || val === "") return null;
  const m = String(val).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function isMeaningfulValue(value) {
  const text = String(value ?? "").trim();
  return text !== "" && text.toUpperCase() !== "NA" && text.toUpperCase() !== "N/A";
}

function extractCodeFromText(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/\b([A-Z]{2,}\d{2,}[A-Z0-9]*)\b/);
  return match ? match[1] : "";
}

export default function StudentsPage() {
  const [student, setStudent]                         = useState(null);
  const [activeNav, setActiveNav]                     = useState("seating");
  const [activeFilter, setActiveFilter]               = useState("All");
  const [timetables, setTimetables]                   = useState([]);
  const [timetableLoading, setTimetableLoading]       = useState(false);
  const [timetableError, setTimetableError]           = useState("");
  const [seatingArrangements, setSeatingArrangements] = useState([]);
  const [seatingLoading, setSeatingLoading]           = useState(false);
  const [seatingError, setSeatingError]               = useState("");
  const [editMode, setEditMode]                       = useState(false);
  const [editedStudent, setEditedStudent]             = useState({});
  const [saving, setSaving]                           = useState(false);
  const navigate = useNavigate();
  const API_URL  = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  const handleLogout = () => {
    localStorage.removeItem("studentId");
    localStorage.removeItem("studentEmail");
    localStorage.removeItem("studentName");
    navigate("/");
  };

  /* Load student */
  useEffect(() => {
    const fetchStudent = async () => {
      const studentId = localStorage.getItem("studentId");
      if (!studentId) { navigate("/"); return; }
      try {
        const res = await axios.get(`${API_URL}/students/${studentId}`);
        if (res.data) { setStudent(res.data); setEditedStudent(res.data); }
        else { localStorage.removeItem("studentId"); navigate("/"); }
      } catch (err) { console.error("Error fetching student:", err); navigate("/"); }
    };
    fetchStudent();
  }, [navigate, API_URL]);

  /* Seating arrangements (by student/semester) */
  useEffect(() => {
    if (!student?._id) return;
    const fetchSeating = async () => {
      setSeatingLoading(true); setSeatingError("");
      try {
        const res = await axios.get(`${API_URL}/seating/student/${student._id}`);
        const data = Array.isArray(res.data) ? res.data : [];
        const mapped = data.map(item => ({
          id: item.id || `${item.arrangementId || "arr"}_${item.hallName || "hall"}`,
          exam: item.seriesLabel || "Exam",
          subject: item.subject || "",
          date: item.date || new Date(),
          time: item.time || "TBA",
          hallName: item.hallName || "Examination Hall",
          building: item.building || "Academic Block",
          floor: item.floor || "Ground Floor",
          seatNumber: item.seatNumber || "TBA",
          row: item.rowNumber || "A",
          column: item.columnNumber || "1",
          invigilator: item.invigilator || "TBA",
          instructions: "Carry your ID card and admit card. Report 15 minutes before exam time.",
          status: item.status || (item.date && new Date(item.date) > new Date() ? "Upcoming" : "Completed"),
        }));
        mapped.sort((a, b) => new Date(a.date) - new Date(b.date));
        setSeatingArrangements(mapped);
      } catch (err) {
        console.error("[Seating] error:", err);
        setSeatingError("Unable to load seating arrangements. Please try again.");
        setSeatingArrangements([]);
      } finally { setSeatingLoading(false); }
    };
    fetchSeating();
  }, [API_URL, student?._id]);

  /*
   * FIXED TIMETABLE FETCH
   * - Send the raw semester string to the backend
   * - Backend (timetableRoutes.js) now extracts the number and matches by semNum
   * - NO frontend double-filter - we trust whatever the backend returns
   */
  useEffect(() => {
    if (!student?.semester) { setTimetables([]); return; }
    const fetchTimetable = async () => {
      setTimetableLoading(true); setTimetableError("");
      try {
        // Send raw semester (e.g. "4", "Semester 4", "sem 4") - backend handles all
        const res = await axios.get(
          `${API_URL}/timetables?semester=${encodeURIComponent(String(student.semester))}`
        );
        const data = Array.isArray(res.data) ? res.data : [];
        console.log(`[Timetable] student.semester="${student.semester}" → backend returned ${data.length} records`);

        // Only minimal filter: skip records with no rows AND no file content
        const usable = data.filter(t => (t.rows && t.rows.length > 0) || t.fileType !== "other");
        setTimetables(usable.length > 0 ? usable : data);
      } catch (err) {
        console.error("Timetable error:", err);
        setTimetableError("Failed to load timetable.");
        setTimetables([]);
      } finally { setTimetableLoading(false); }
    };
    fetchTimetable();
  }, [API_URL, student]);

  /* Profile edit */
  const handleEditToggle  = () => { if (editMode) setEditedStudent(student); setEditMode(!editMode); };
  const handleInputChange = (field, value) => setEditedStudent(p => ({ ...p, [field]: value }));
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/students/${student._id}`, editedStudent);
      if (res.data) { setStudent(res.data); setEditedStudent(res.data); setEditMode(false); alert("Profile updated!"); }
    } catch { alert("Failed to update profile."); }
    setSaving(false);
  };

  if (!student) return null;

  const filteredSeating = seatingArrangements.filter(s => activeFilter === "All" || s.status === activeFilter);
  const seatingByDate = filteredSeating.reduce((acc, seat) => {
    const d = new Date(seat.date);
    const key = isNaN(d.getTime()) ? "Unknown Date" : d.toISOString().split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(seat);
    return acc;
  }, {});
  const seatingDateGroups = Object.entries(seatingByDate).sort(([a], [b]) => {
    if (a === "Unknown Date") return 1;
    if (b === "Unknown Date") return -1;
    return new Date(a) - new Date(b);
  });

  /* Timetable row mapping */
  const activeTimetable = timetables[0];
  const timetableRows   = activeTimetable?.rows || [];
  const studentSemNum   = extractSemNum(student?.semester);
  const normalizeKey    = (k = "") => String(k).toLowerCase().replace(/[\s_-]/g, "");
  const getField        = (row, keys) => {
    const map = Object.keys(row || {}).reduce((acc, k) => { acc[normalizeKey(k)] = k; return acc; }, {});
    for (const key of keys) { const m = map[normalizeKey(key)]; if (m !== undefined && row[m] !== undefined && row[m] !== null && row[m] !== "") return row[m]; }
    return "";
  };
  const excelSerialToDate = s => new Date(Math.floor(s - 25569) * 86400 * 1000);
  const toDate = v => {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === "number" && v > 40000 && v < 60000) return excelSerialToDate(v);
    if (typeof v === "string") {
      const trimmed = v.trim();
      const dmY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dmY) {
        const [, dd, mm, yyyy] = dmY;
        const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return isNaN(parsed.getTime()) ? null : parsed;
      }
    }
    const p = new Date(v); return isNaN(p.getTime()) ? null : p;
  };
  const mappedTimetable = timetableRows.map((row, i) => ({
    id:      i + 1,
    date:    toDate(getField(row, ["Date","Exam Date","ExamDate","exam_date","DATE","Examination Date","Day"])),
    subject: getField(row, ["Subject","Subject Name","SubjectName","Course","Paper","Title","SUBJECT","Name"]),
    code:    getField(row, ["Code","Subject Code","SubjectCode","Course Code","CourseCode","Paper Code","CODE"]),
    time:    getField(row, ["Time","Time Slot","TimeSlot","Timing","Exam Time","ExamTime","TIME","Session"]),
    credits: getField(row, ["Credits","Credit","CREDITS","Credit Hours","Units"]),
  })).filter(item => item.date !== null || item.subject !== "" || item.code !== "");
  const matchingSemesterColumn = studentSemNum === null
    ? null
    : Object.keys(timetableRows[0] || {}).find(key => {
        const keySemNum = extractSemNum(key);
        return keySemNum === studentSemNum && /(s|sem|semester)/i.test(String(key));
      }) || null;
  const semesterSpecificTimetable = matchingSemesterColumn
    ? timetableRows.map((row, i) => {
        const subjectCell = row?.[matchingSemesterColumn];
        if (!isMeaningfulValue(subjectCell)) return null;
        const cellText = String(subjectCell).trim().replace(/\s+/g, " ");
        return {
          id: i + 1,
          date: toDate(getField(row, ["Date","Exam Date","ExamDate","exam_date","DATE","Examination Date","Day"])),
          subject: cellText,
          code: getField(row, ["Code","Subject Code","SubjectCode","Course Code","CourseCode","Paper Code","CODE"]) || extractCodeFromText(cellText),
          time: getField(row, ["Time","Time Slot","TimeSlot","Timing","Exam Time","ExamTime","TIME","Session"]),
          credits: getField(row, ["Credits","Credit","CREDITS","Credit Hours","Units"]),
        };
      }).filter(Boolean)
    : [];
  const displayedTimetable = semesterSpecificTimetable.length > 0 ? semesterSpecificTimetable : mappedTimetable;

  const navItems = [
    { id: "seating",   label: "Seating Arrangements", icon: "🪑" },
    { id: "timetable", label: "Exam Timetable",        icon: "📅" },
    { id: "profile",   label: "My Profile",            icon: "👤" },
  ];

  const fmt = d => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const M = "#800000", M2 = "#a00000", MB = "#1a0000";

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#fdf0f0" }}>

      {/* SIDEBAR */}
      <aside style={{ width:280, flexShrink:0, position:"sticky", top:0, height:"100vh", background:"#800000", display:"flex", flexDirection:"column", boxShadow:"4px 0 20px rgba(128,0,0,0.15)" }}>

        <div style={{ padding:"24px 20px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <img src={logo} alt="InExa Logo" style={{ width:44, height:44, borderRadius:12, objectFit:"cover" }} />
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>InExa</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"1.2px", fontWeight:600 }}>Student Portal</div>
            </div>
          </div>
        </div>

        <div onClick={() => setActiveNav("profile")} style={{ padding:"20px 18px", borderBottom:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", background: activeNav==="profile" ? "rgba(255,255,255,0.2)" : "transparent", transition:"all 0.2s" }}
             onMouseEnter={e => { if (activeNav!=="profile") e.currentTarget.style.background="rgba(255,255,255,0.1)"; }}
             onMouseLeave={e => { if (activeNav!=="profile") e.currentTarget.style.background="transparent"; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#fff", border: "2px solid rgba(255,255,255,0.4)" }}>
                {(student?.fullName || "ST").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2)}
              </div>
              <div style={{ position:"absolute", bottom:0, right:0, width:14, height:14, borderRadius:"50%", background:"#22c55e", border:`2px solid #800000` }}></div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{student?.fullName || "Student"}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)", fontWeight:600, marginBottom:4 }}>{student?.rollNumber || "Roll No"}</div>
              <div style={{ display:"inline-block", padding:"2px 8px", borderRadius:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.9)", textTransform:"uppercase" }}>
                {student?.department} · Sem {extractSemNum(student?.semester)}
              </div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:12 }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:1, fontWeight:700, padding:"8px 12px", marginBottom:4 }}>Navigation</div>
          {navItems.map(item => {
            const active = activeNav === item.id;
            return (
              <button key={item.id} onClick={() => setActiveNav(item.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, border:"none", cursor:"pointer", marginBottom:4, textAlign:"left", background: active ? "rgba(255,255,255,0.2)" : "transparent", color: active ? "#ffffff" : "rgba(255,255,255,0.7)", fontWeight: active ? 600 : 500, transition:"all 0.2s", borderLeft: active ? `3px solid #ffffff` : "3px solid transparent" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#ffffff"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.7)"; }}}
              >
                <span style={{ fontSize:17 }}>{item.icon}</span>
                <span style={{ fontSize:13 }}>{item.label}</span>
                {active && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#ffffff", boxShadow:"0 0 4px #ffffff" }}></div>}
              </button>
            );
          })}
        </nav>

        <div style={{ padding:"16px 18px", borderTop:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>Quick Stats</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {[{ label:"Upcoming", value: seatingArrangements.filter(s=>s.status==="Upcoming").length }, { label:"Total Exams", value: displayedTimetable.length || timetableRows.length }].map((s,i) => (
              <div key={i} style={{ padding:10, borderRadius:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize:20, fontWeight:700, color:"#ffffff" }}>{s.value}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.8)", textTransform:"uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={handleLogout} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#ffffff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,0.8)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}
          >🚪 Log Out</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, overflowY:"auto", padding:"32px 40px", minWidth:0 }}>

        {/* SEATING */}
        {activeNav === "seating" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
              <div>
                <h1 style={{ margin:0, fontSize:26, fontWeight:700, color:"#1e293b" }}>🪑 Seating Arrangements</h1>
                <p style={{ margin:"6px 0 0", fontSize:14, color:"#94a3b8" }}>Your assigned seats for all examinations</p>
              </div>
              <div style={{ padding:"8px 16px", borderRadius:10, background:"#fff0f0", border:"1px solid #f0d0d0", fontSize:13, color:M, fontWeight:600 }}>
                🔔 {seatingArrangements.filter(s=>s.status==="Upcoming").length} Upcoming Exams
              </div>
            </div>

            {seatingLoading ? (
              <div style={{ textAlign:"center", padding:"60px 20px" }}>
                <div style={{ width:48, height:48, border:`4px solid #f0d0d0`, borderTopColor:M, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }}></div>
                <p style={{ color:"#64748b", fontSize:14 }}>Loading seating arrangements...</p>
              </div>
            ) : seatingError ? (
              <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", borderRadius:16, border:"1px solid #f0d0d0" }}>
                <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
                <p style={{ color:"#ef4444", fontSize:14, marginBottom:16 }}>{seatingError}</p>
                <button onClick={() => window.location.reload()} style={{ padding:"10px 20px", background:`linear-gradient(135deg,${M},${M2})`, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 }}>Retry</button>
              </div>
            ) : seatingArrangements.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", borderRadius:16, border:"1px solid #f0d0d0" }}>
                <div style={{ fontSize:60, marginBottom:16 }}>🪑</div>
                <p style={{ color:"#64748b", fontSize:16, fontWeight:600, marginBottom:8 }}>No Seating Arrangements Yet</p>
                <p style={{ color:"#94a3b8", fontSize:14 }}>Seating arrangements will appear here once exams are scheduled.</p>
              </div>
            ) : (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18, marginBottom:28 }}>
                  {[
                    { label:"Total Exams", value: seatingArrangements.length,                                  icon:"📋", accent:M,        bg:"#fff5f5" },
                    { label:"Upcoming",    value: seatingArrangements.filter(s=>s.status==="Upcoming").length, icon:"⏳", accent:"#ea580c", bg:"#fff7ed" },
                    { label:"Completed",   value: seatingArrangements.filter(s=>s.status==="Completed").length,icon:"✅", accent:"#059669", bg:"#ecfdf5" },
                  ].map((s,i) => (
                    <div key={i} style={{ background:"#fff", borderRadius:14, padding:20, border:"1px solid #f0d0d0", display:"flex", alignItems:"center", gap:16, boxShadow:"0 2px 6px rgba(128,0,0,0.06)", transition:"all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=s.accent+"50"; e.currentTarget.style.boxShadow=`0 4px 14px ${s.accent}20`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="#f0d0d0"; e.currentTarget.style.boxShadow="0 2px 6px rgba(128,0,0,0.06)"; }}
                    >
                      <div style={{ width:52, height:52, borderRadius:12, background:s.bg, border:`1px solid ${s.accent}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize:28, fontWeight:700, color:"#1e293b", lineHeight:1 }}>{s.value}</div>
                        <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:10, marginBottom:22, flexWrap:"wrap" }}>
                  {["All","Upcoming","Completed"].map(f => {
                    const isActive = activeFilter === f;
                    return <span key={f} onClick={() => setActiveFilter(f)} style={{ padding:"7px 18px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", background: isActive ? M : "#fff", color: isActive ? "#fff" : "#64748b", border: isActive ? `1px solid ${M}` : "1px solid #f0d0d0", boxShadow: isActive ? `0 3px 10px rgba(128,0,0,0.25)` : "none" }}>{f}</span>;
                  })}
                </div>

                <div style={{ display:"grid", gap:24 }}>
                  {seatingDateGroups.map(([dateKey, seats]) => {
                    const dateLabel = dateKey === "Unknown Date" ? "Unknown Date" : fmt(dateKey);
                    return (
                      <div key={dateKey}>
                        <div style={{ marginBottom:12, fontSize:13, fontWeight:700, color:"#1e293b", textTransform:"uppercase", letterSpacing:"0.6px" }}>
                          {dateLabel}
                        </div>
                        <div style={{ display:"grid", gap:16 }}>
                          {seats.map(seat => (
                            <div key={seat.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #f0d0d0", overflow:"hidden", transition:"all 0.2s", boxShadow:"0 2px 6px rgba(128,0,0,0.06)" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor=M; e.currentTarget.style.boxShadow=`0 6px 16px rgba(128,0,0,0.15)`; e.currentTarget.style.transform="translateY(-2px)"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor="#f0d0d0"; e.currentTarget.style.boxShadow="0 2px 6px rgba(128,0,0,0.06)"; e.currentTarget.style.transform="translateY(0)"; }}
                            >
                              <div style={{ height:4, background: seat.status==="Upcoming" ? `linear-gradient(90deg,${M},${M2})` : "linear-gradient(90deg,#34d399,#6ee7b7)" }}></div>
                              <div style={{ padding:"20px 22px" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                                  <div>
                                    <div style={{ fontSize:18, fontWeight:700, color:"#1e293b", marginBottom:4 }}>{seat.exam}</div>
                                    <div style={{ fontSize:13, color:"#94a3b8", fontWeight:500 }}>{seat.subject}</div>
                                  </div>
                                  <span style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:20, background: seat.status==="Upcoming" ? "#fff0f0" : "#ecfdf5", color: seat.status==="Upcoming" ? M : "#059669", border: `1px solid ${seat.status==="Upcoming" ? "#f0c0c0" : "#6ee7b7"}`, textTransform:"uppercase" }}>{seat.status}</span>
                                </div>
                                <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, background:"#fff5f5", border:"1px solid #f0d0d0" }}>
                                    <span style={{ fontSize:14 }}>📅</span>
                                    <span style={{ fontSize:12, fontWeight:600, color:M }}>{fmt(seat.date)}</span>
                                  </div>
                                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, background:"#fff8f0", border:"1px solid #fde68a" }}>
                                    <span style={{ fontSize:14 }}>🕐</span>
                                    <span style={{ fontSize:12, fontWeight:600, color:"#92400e" }}>{seat.time}</span>
                                  </div>
                                </div>
                                <div style={{ padding:"16px 18px", borderRadius:12, background:`linear-gradient(135deg,#fff5f5,#ffe8e8)`, border:`2px solid ${M}`, marginBottom:18, boxShadow:`0 2px 8px rgba(128,0,0,0.12)` }}>
                                  <div style={{ fontSize:11, color:M, textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:700, marginBottom:10 }}>🪑 Your Seat Assignment</div>
                                  <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:12 }}>
                                    <div style={{ width:70, height:70, borderRadius:12, background:`linear-gradient(135deg,${M},${M2})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px rgba(128,0,0,0.3)`, flexShrink:0 }}>
                                      <div style={{ fontSize:24, fontWeight:700, color:"#fff" }}>{seat.seatNumber}</div>
                                      <div style={{ fontSize:9, color:"#ffd0d0", textTransform:"uppercase", letterSpacing:"0.5px" }}>Seat No.</div>
                                    </div>
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                                    {[{ label:"Hall", value:seat.hallName }, { label:"Building", value:seat.building }].map((item,i) => (
                                      <div key={i} style={{ padding:"8px 10px", borderRadius:8, background:"#fff", border:"1px solid #f0d0d0" }}>
                                        <div style={{ fontSize:9, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.6px", fontWeight:600, marginBottom:3 }}>{item.label}</div>
                                        <div style={{ fontSize:12, fontWeight:600, color:"#1e293b" }}>{item.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ padding:"12px 14px", borderRadius:8, background:"#fffbeb", border:"1px solid #fde68a" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                                    <span style={{ fontSize:14 }}>ℹ️</span>
                                    <span style={{ fontSize:11, color:"#92400e", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" }}>Instructions</span>
                                  </div>
                                  <p style={{ margin:0, fontSize:12, color:"#78350f", lineHeight:1.6 }}>{seat.instructions}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TIMETABLE */}
        {activeNav === "timetable" && (
          <div>
            <div style={{ marginBottom:28 }}>
              <h1 style={{ margin:0, fontSize:26, fontWeight:700, color:"#1e293b" }}>📅 Examination Timetable</h1>
              <p style={{ margin:"6px 0 0", fontSize:14, color:"#94a3b8" }}>
                Your complete exam schedule — Semester {extractSemNum(student?.semester)}
              </p>
            </div>

            <div style={{ marginBottom:24, padding:"18px 22px", borderRadius:14, background:"#fff5f5", border:"1px solid #f0d0d0", display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:"#fff0f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>ℹ️</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:M, marginBottom:3 }}>Important Information</div>
                <div style={{ fontSize:13, color:"#64748b" }}>Report to the examination hall 15 minutes before the scheduled time. Carry your ID card and admit card.</div>
              </div>
            </div>

            <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", border:"1px solid #f0d0d0", boxShadow:"0 2px 8px rgba(128,0,0,0.06)" }}>
              {timetableLoading ? (
                <div style={{ padding:"60px 24px", textAlign:"center" }}>
                  <div style={{ width:48, height:48, border:`4px solid #f0d0d0`, borderTopColor:M, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }}></div>
                  <p style={{ color:"#64748b", fontSize:14 }}>Loading timetable...</p>
                </div>
              ) : timetableError ? (
                <div style={{ padding:"60px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
                  <p style={{ color:"#ef4444", fontSize:14, marginBottom:16 }}>{timetableError}</p>
                  <button onClick={() => window.location.reload()} style={{ padding:"10px 20px", background:`linear-gradient(135deg,${M},${M2})`, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 }}>Retry</button>
                </div>
              ) : timetables.length === 0 ? (
                <div style={{ padding:"60px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:60, marginBottom:16 }}>📅</div>
                  <p style={{ color:"#64748b", fontSize:16, fontWeight:600, marginBottom:8 }}>No Timetable Available</p>
                  <p style={{ color:"#94a3b8", fontSize:14 }}>The timetable for Semester {extractSemNum(student?.semester)} has not been uploaded yet.</p>
                  <div style={{ marginTop:20, padding:"12px 18px", background:"#fff8f8", border:"1px solid #f0d0d0", borderRadius:12, textAlign:"left", fontSize:12, color:"#64748b" }}>
                   
                  </div>
                </div>
              ) : displayedTimetable.length > 0 ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"0.8fr 1.2fr 1.1fr 1.3fr 0.6fr", background:`linear-gradient(135deg,${MB},${M})`, padding:"16px 20px", gap:12 }}>
                    {["Date","Subject","Code","Time","Credits"].map(h => (
                      <div key={h} style={{ fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>
                    ))}
                  </div>
                  <div>
                    {displayedTimetable.map((exam, idx) => {
                      const isPast = exam.date ? exam.date < new Date() : false;
                      return (
                        <div key={exam.id} style={{ display:"grid", gridTemplateColumns:"0.8fr 1.2fr 1fr 1.2fr 0.9fr", padding:"16px 20px", gap:12, borderBottom: idx < displayedTimetable.length-1 ? "1px solid #f0d0d0" : "none", background: isPast ? "#f8fafc" : idx%2===0 ? "#fff" : "#fff8f8", opacity: isPast ? 0.55 : 1, transition:"all 0.2s" }}
                          onMouseEnter={e => { if (!isPast) e.currentTarget.style.background="#fff0f0"; }}
                          onMouseLeave={e => { if (!isPast) e.currentTarget.style.background=idx%2===0?"#fff":"#fff8f8"; }}
                        >
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{exam.date ? exam.date.toLocaleDateString("en-US",{day:"numeric",month:"short"}) : ""}</div>
                            <div style={{ fontSize:11, color:"#64748b" }}>{exam.date ? exam.date.toLocaleDateString("en-US",{weekday:"short"}) : ""}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", fontSize:13, fontWeight:600, color:"#1e293b" }}>{exam.subject || ""}</div>
                          <div style={{ display:"flex", alignItems:"center" }}>
                            <div style={{ fontSize:12, fontWeight:600, color:M, padding:"4px 10px", background:"#fff0f0", borderRadius:6, border:"1px solid #f0c0c0" }}>{exam.code || ""}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", fontSize:12, color:"#64748b" }}>{exam.time || ""}</div>
                          <div style={{ display:"flex", alignItems:"center", fontSize:13, fontWeight:600, color:"#1e293b" }}>{exam.credits || ""}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding:"14px 20px", background:"#fff8f8", borderTop:`2px solid #f0d0d0`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Total Examinations: <span style={{ color:M, fontWeight:700 }}>{displayedTimetable.length}</span></div>
                    <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Total Credits: <span style={{ color:M, fontWeight:700 }}>{displayedTimetable.reduce((s,e)=>s+(Number(e.credits)||0),0)||""}</span></div>
                  </div>
                </>
              ) : activeTimetable && activeTimetable.fileType === "image" ? (
                <div style={{ padding:"24px", textAlign:"center" }}>
                  <img
                    src={`${API_URL}/timetables/${activeTimetable._id}/view`}
                    alt={activeTimetable.title || "Timetable"}
                    style={{ maxWidth:"100%", borderRadius:12, border:"1px solid #f0d0d0", boxShadow:"0 2px 10px rgba(0,0,0,0.08)" }}
                  />
                  <div style={{ marginTop:12, fontSize:12, color:"#64748b" }}>
                    {activeTimetable.title || activeTimetable.originalName}
                  </div>
                </div>
              ) : timetableRows.length > 0 ? (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>{Object.keys(timetableRows[0]).map(h => <th key={h} style={{ textAlign:"left", padding:"12px 14px", background:`linear-gradient(135deg,${MB},${M})`, color:"#fff", fontSize:12, textTransform:"uppercase" }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {timetableRows.map((row,i) => (
                        <tr key={i} style={{ background: i%2===0?"#fff":"#fff8f8" }}
                          onMouseEnter={e => e.currentTarget.style.background="#fff0f0"}
                          onMouseLeave={e => e.currentTarget.style.background=i%2===0?"#fff":"#fff8f8"}
                        >
                          {Object.keys(timetableRows[0]).map(h => <td key={h} style={{ padding:"10px 14px", borderBottom:"1px solid #f0d0d0", fontSize:12, color:"#334155" }}>{String(row[h]??"")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding:"40px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
                  <p style={{ color:"#64748b", fontSize:15, fontWeight:600, marginBottom:8 }}>Timetable Uploaded</p>
                  <p style={{ color:"#94a3b8", fontSize:13 }}>The timetable was uploaded as a file. Contact admin for details.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeNav === "profile" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
              <div>
                <h1 style={{ margin:0, fontSize:26, fontWeight:700, color:"#1e293b" }}>👤 Student Profile</h1>
                <p style={{ margin:"6px 0 0", fontSize:14, color:"#94a3b8" }}>Your complete academic profile and details</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {editMode ? (
                  <>
                    <button onClick={handleEditToggle} disabled={saving} style={{ padding:"10px 20px", borderRadius:8, border:"1px solid #f0d0d0", background:"#fff", color:"#64748b", fontSize:14, fontWeight:600, cursor: saving?"not-allowed":"pointer", opacity: saving?0.5:1 }}>Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${M},${M2})`, color:"#fff", fontSize:14, fontWeight:600, cursor: saving?"not-allowed":"pointer", boxShadow:`0 2px 8px rgba(128,0,0,0.3)`, opacity: saving?0.5:1 }}>{saving?"Saving...":"💾 Save Changes"}</button>
                  </>
                ) : (
                  <button onClick={handleEditToggle} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${M},${M2})`, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", boxShadow:`0 2px 8px rgba(128,0,0,0.3)` }}>✏️ Edit Profile</button>
                )}
              </div>
            </div>

            <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 8px rgba(128,0,0,0.08)", border:"1px solid #f0d0d0", marginBottom:24 }}>
              <div style={{ height:120, background:`linear-gradient(135deg,${MB} 0%,${M} 50%,${M2} 100%)`, position:"relative" }}>
                <div style={{ position:"absolute", bottom:-50, left:32 }}>
                  <div style={{ width:100, height:100, borderRadius:"50%", background:`linear-gradient(135deg,${M},${M2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, fontWeight:700, color:"#fff", boxShadow:"0 0 0 6px #fff, 0 4px 20px rgba(0,0,0,0.15)" }}>
                    {(student?.fullName||"ST").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
                  </div>
                </div>
              </div>
              <div style={{ padding:"60px 32px 32px" }}>
                <div style={{ marginBottom:24 }}>
                  {editMode ? (
                    <input type="text" value={editedStudent?.fullName||""} onChange={e=>handleInputChange("fullName",e.target.value)} style={{ fontSize:24, fontWeight:700, color:"#1e293b", marginBottom:6, padding:"8px 12px", border:`2px solid ${M}`, borderRadius:8, width:400 }} />
                  ) : (
                    <h2 style={{ margin:"0 0 6px", fontSize:24, fontWeight:700, color:"#1e293b" }}>{student?.fullName||"Student Name"}</h2>
                  )}
                  <p style={{ margin:"0 0 8px", fontSize:15, color:M, fontWeight:600 }}>{student?.rollNumber||"Roll No"}</p>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <span style={{ padding:"4px 12px", borderRadius:20, background:"#fff0f0", border:"1px solid #f0c0c0", fontSize:11, fontWeight:700, color:M }}>{student?._id||"ID"}</span>
                    <span style={{ padding:"4px 12px", borderRadius:20, background:"#ecfdf5", border:"1px solid #6ee7b7", fontSize:11, fontWeight:700, color:"#059669" }}>● Active</span>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:20 }}>
                  {[
                    { icon:"✉️", label:"Email",      field:"email",      editable:true  },
                    { icon:"📞", label:"Phone",      field:"phone",      editable:true  },
                    { icon:"🏛️", label:"Department", field:"department", editable:false },
                    { icon:"📚", label:"Semester",   field:"semester",   editable:false },
                  ].filter(item => item.field !== "phone").map((item,i) => (
                    <div key={i} style={{ padding:"16px 18px", borderRadius:12, background:"#fff8f8", border: editMode&&item.editable ? `2px solid ${M}` : "1px solid #f0d0d0", display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:20 }}>{item.icon}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 4px", fontSize:13, color:"#64748b" }}>{item.label}</p>
                        {editMode && item.editable ? (
                          <input type={item.field==="email"?"email":"text"} value={editedStudent?.[item.field]||""} onChange={e=>handleInputChange(item.field,e.target.value)} style={{ width:"100%", padding:"6px 8px", border:"1px solid #f0d0d0", borderRadius:6, fontSize:14, fontWeight:600 }} />
                        ) : (
                          <p style={{ margin:0, fontWeight:600, fontSize:14, color:"#1e293b" }}>{student?.[item.field]||"—"}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #f0c0c0; border-radius: 3px; }
      `}</style>
    </div>
  );
}
