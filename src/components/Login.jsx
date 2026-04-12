import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Home, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../inexa-logo.jpeg';

const ROLES = [
  { id: 'student', label: 'Student', icon: '🧑‍🎓' },
  { id: 'faculty', label: 'Faculty', icon: '🧑‍🏫' },
  { id: 'admin',   label: 'Admin',   icon: '🧑‍💻' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [formData, setFormData]         = useState({ email: '', password: '' });
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [step, setStep]                 = useState('email');

  const handleInputChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleEmailNext = e => {
    e.preventDefault();
    if (!formData.email) { setError('Please enter your email address'); return; }
    if (!selectedRole)   { setError('Please select your role');          return; }
    setError('');
    setStep('password');
  };

  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!formData.password) { setError('Please enter your password'); setLoading(false); return; }

    try {
      // ── STUDENT ─────────────────────────────────────────────
      if (selectedRole === 'student') {
        const res  = await fetch('http://localhost:5000/api/students/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('studentId',    data.student._id);
          localStorage.setItem('studentName',  data.student.name);
          localStorage.setItem('studentEmail', data.student.email);
          window.location.href = '/StudentDashboard';
        } else {
          setError(data.message || 'Invalid email or password');
          setLoading(false);
        }

      // ── FACULTY ─────────────────────────────────────────────
      } else if (selectedRole === 'faculty') {
        if (formData.password !== 'faculty123') {
          setError('Invalid password');
          setLoading(false);
          return;
        }

        const res  = await fetch('http://localhost:5000/api/slots/faculty-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });

        // ── handle non-JSON or network errors ──
        if (!res.ok) {
          const text = await res.text();
          console.error('verify-email failed:', res.status, text);
          setError(`Server error (${res.status}). Check that /api/faculty/verify-email exists.`);
          setLoading(false);
          return;
        }

        const data = await res.json();
        console.log('verify-email response:', data); // ← tells us the exact shape

        // ── support ALL common response shapes ──
        // shape A: { exists: true, faculty: { _id, name, ... } }
        // shape B: { exists: true, data:    { _id, name, ... } }
        // shape C: { _id, name, email, ... }  (direct object)
        const faculty = data.faculty || data.data || (data._id ? data : null);

        if (data.exists === false || !faculty) {
          setError(data.message || 'Faculty email not found in system');
          setLoading(false);
          return;
        }

        const fid = faculty._id || faculty.id;
        if (!fid) {
          setError('Faculty record found but ID is missing. Check your /api/faculty/verify-email route.');
          setLoading(false);
          return;
        }

        localStorage.setItem('facultyId',          fid);
        localStorage.setItem('facultyName',        faculty.name        || '');
        localStorage.setItem('facultyEmail',       faculty.email       || formData.email);
        localStorage.setItem('facultyDesignation', faculty.designation || '');
        localStorage.setItem('facultyDepartment',  faculty.department  || '');
        console.log('✅ Faculty saved, id =', fid);
        window.location.href = '/TeachersDashboard';

      // ── ADMIN ────────────────────────────────────────────────
      } else if (selectedRole === 'admin') {
        if (formData.email === 'admin@inexa.edu' && formData.password === 'admin123') {
          localStorage.setItem('adminEmail', formData.email);
          window.location.href = '/AdminDashboard';
        } else {
          setError('Invalid admin credentials');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Cannot reach server. Make sure backend is running on port 5000.');
      setLoading(false);
    }
  };

  const currentRole = ROLES.find(r => r.id === selectedRole);

  return (
    <div style={s.page}>
      <div style={s.bgDots} />

      <button onClick={() => navigate('/')} style={s.homeBtn}
        onMouseEnter={e => e.currentTarget.style.background = '#F0D8D0'}
        onMouseLeave={e => e.currentTarget.style.background = '#FDF6F3'}
      >
        <Home size={14} /> Home
      </button>

      <div style={s.wrapper}>
        {/* Brand */}
        <div style={s.brand}>
          <img src={logo} alt="InExa Logo" style={{ width: 50, height: 50, borderRadius: 15, objectFit: 'cover', boxShadow: '0 6px 20px rgba(139,26,26,0.32)' }} />
          <div>
            <div style={s.brandName}>InExa</div>
            <div style={s.brandSub}>Exam Management System</div>
          </div>
        </div>

        {/* Card */}
        <div style={s.card}>
          <div style={s.cardStripe} />
          <div style={s.cardInner}>

            {step === 'email' ? (
              <form onSubmit={handleEmailNext}>
                <h2 style={s.h2}>Sign in</h2>
                <p style={s.p}>Choose your role and enter your email</p>

                {/* Role */}
                <div style={s.field}>
                  <label style={s.lbl}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <select value={selectedRole}
                      onChange={e => { setSelectedRole(e.target.value); setError(''); }}
                      style={s.sel}
                    >
                      <option value="" disabled>Select your role</option>
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
                    </select>
                    <ChevronDown size={15} style={s.chevron} />
                  </div>
                </div>

                {/* Email */}
                <div style={s.field}>
                  <label style={s.lbl}>Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={s.ico} />
                    <input type="email" name="email" value={formData.email}
                      onChange={handleInputChange} placeholder="you@example.com"
                      style={s.inp} autoFocus />
                  </div>
                </div>

                {error && <Err msg={error} />}

                <div style={s.actions}>
                  <a href="/register" style={s.link}>Create account</a>
                  <Btn type="submit">Next <ArrowRight size={14} /></Btn>
                </div>
              </form>

            ) : (
              <form onSubmit={handleLogin}>
                <button type="button"
                  onClick={() => { setStep('email'); setError(''); setFormData(f => ({ ...f, password: '' })); }}
                  style={s.chip}
                >
                  <Mail size={12} />
                  {formData.email}
                  <span style={{ color: '#C09898', marginLeft: 2 }}>×</span>
                </button>

                <h2 style={s.h2}>Welcome back {currentRole?.icon}</h2>
                <p style={s.p}>Signing in as <strong style={{ color: '#8B1A1A' }}>{currentRole?.label}</strong></p>

                <div style={{ ...s.field, marginTop: 20 }}>
                  <label style={s.lbl}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={s.ico} />
                    <input type="password" name="password" value={formData.password}
                      onChange={handleInputChange} placeholder="Enter your password"
                      style={s.inp} autoFocus />
                  </div>
                  {selectedRole === 'faculty' && (
                    <p style={s.hint}>Use the common faculty password</p>
                  )}
                </div>

                {error && <Err msg={error} />}

                <div style={s.actions}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: '#8B1A1A', width: 15, height: 15 }} />
                    <span style={{ fontSize: 13, color: '#9A7070' }}>Remember me</span>
                  </label>
                  <Btn type="submit" disabled={loading}>
                    {loading ? <Spinner /> : <> Sign in <ArrowRight size={14} /> </>}
                  </Btn>
                </div>
              </form>
            )}
          </div>
        </div>

        <p style={s.foot}>© 2026 InExa · Exam Management System</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Figtree:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus {
          outline: none;
          border-color: #8B1A1A !important;
          box-shadow: 0 0 0 3px rgba(139,26,26,0.1) !important;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Btn({ children, ...props }) {
  return (
    <button {...props} style={{
      display:'flex', alignItems:'center', gap:7,
      padding:'11px 22px',
      background:'linear-gradient(135deg,#8B1A1A,#6B1414)',
      color:'#fff', border:'none', borderRadius:10,
      fontSize:14, fontFamily:'inherit', fontWeight:500,
      cursor:'pointer',
      boxShadow:'0 4px 16px rgba(139,26,26,0.3)',
      opacity: props.disabled ? 0.65 : 1,
      transition:'opacity 0.15s',
    }}>
      {children}
    </button>
  );
}

function Err({ msg }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'10px 13px', marginBottom:8,
      background:'#FEF2F2', border:'1px solid #FECACA',
      borderRadius:9, fontSize:13, color:'#991B1B',
    }}>
      <AlertCircle size={14} style={{ flexShrink:0 }} />
      {msg}
    </div>
  );
}

function Spinner() {
  return <span style={{
    display:'inline-block', width:15, height:15,
    border:'2px solid rgba(255,255,255,0.3)',
    borderTop:'2px solid #fff',
    borderRadius:'50%', animation:'spin 0.65s linear infinite',
  }} />;
}

const MAROON='#8B1A1A', BG='#F5E6E0', BORDER='#E8C8BE', CARD='#FDF6F3';

const s = {
  page:{ minHeight:'100vh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Figtree',sans-serif", padding:'32px 16px', position:'relative' },
  bgDots:{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`radial-gradient(#D4A898 1.5px,transparent 1.5px)`, backgroundSize:'26px 26px', opacity:0.5 },
  homeBtn:{ position:'absolute', top:20, right:20, display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#FDF6F3', border:`1px solid ${BORDER}`, borderRadius:10, fontSize:13, color:MAROON, cursor:'pointer', fontWeight:500, fontFamily:'inherit', transition:'background 0.15s' },
  wrapper:{ width:'100%', maxWidth:410, animation:'fadeUp 0.4s ease both', position:'relative', zIndex:1 },
  brand:{ display:'flex', alignItems:'center', gap:14, marginBottom:26, justifyContent:'center' },
  logoBox:{ width:50, height:50, borderRadius:15, background:`linear-gradient(145deg,${MAROON},#6B1414)`, display:'none', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 20px rgba(139,26,26,0.32)' },
  brandName:{ fontFamily:"'Playfair Display',serif", fontSize:27, color:MAROON, lineHeight:1, letterSpacing:'-0.3px' },
  brandSub:{ fontSize:11.5, color:'#B07878', marginTop:3, fontWeight:400 },
  card:{ background:CARD, borderRadius:18, border:`1px solid ${BORDER}`, overflow:'hidden', boxShadow:'0 12px 48px rgba(139,26,26,0.15),0 2px 8px rgba(139,26,26,0.08)' },
  cardStripe:{ height:4, background:`linear-gradient(90deg,${MAROON},#D06060,#F0A080)` },
  cardInner:{ padding:'30px 34px 34px' },
  h2:{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#1C0A0A', marginBottom:5, letterSpacing:'-0.2px' },
  p:{ fontSize:13.5, color:'#9A7070', marginBottom:24, lineHeight:1.5 },
  field:{ marginBottom:18 },
  lbl:{ display:'block', fontSize:11.5, fontWeight:500, color:'#7A5050', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.6px' },
  sel:{ width:'100%', appearance:'none', padding:'10px 38px 10px 13px', background:'#FFF8F6', border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:14, fontFamily:'inherit', color:'#2A1010', cursor:'pointer', transition:'border-color 0.15s' },
  chevron:{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:MAROON, pointerEvents:'none' },
  ico:{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#C09090', pointerEvents:'none' },
  inp:{ width:'100%', padding:'10px 13px 10px 36px', background:'#FFF8F6', border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:14, fontFamily:'inherit', color:'#2A1010', transition:'border-color 0.15s' },
  hint:{ fontSize:11.5, color:'#B09090', marginTop:5 },
  actions:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:22 },
  link:{ fontSize:13.5, color:MAROON, textDecoration:'none', fontWeight:500 },
  chip:{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#FFF0EE', border:'1px solid #F0C0B8', borderRadius:20, fontSize:13, color:MAROON, marginBottom:20, cursor:'pointer', fontFamily:'inherit' },
  foot:{ textAlign:'center', fontSize:11.5, color:'#C0A0A0', marginTop:20 },
};