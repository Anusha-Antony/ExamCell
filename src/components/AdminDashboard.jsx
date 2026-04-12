import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Users, FileText, LogOut, Menu, Clock,
  CheckCircle, AlertCircle, BarChart3, MapPin, Bell, Search,
  Plus, Upload, RefreshCw, UserCheck, XCircle, Filter
} from 'lucide-react';
import axios from 'axios';
import logo from '../inexa-logo.jpeg';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function getDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES = {
  Pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  Confirmed: { bg: 'bg-[#fff0f0]', text: 'text-[#800000]',  border: 'border-[#f0c0c0]',  dot: 'bg-[#800000]'  },
  Rejected:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
};

/* ── Leave Adjustments Panel ── */
function LeaveAdjustmentsPanel() {
  const [adjustments, setAdjustments]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('All');
  const [search, setSearch]               = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast]                 = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/slots/adjustments/all`);
      setAdjustments(Array.isArray(res.data) ? res.data : []);
    } catch {
      try {
        const res = await axios.get(`${API_URL}/leave-adjustments`);
        setAdjustments(Array.isArray(res.data) ? res.data : []);
      } catch { setAdjustments([]); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  const handleApprove = async (adj) => {
    setActionLoading(adj._id);
    try {
      await axios.post(`${API_URL}/slots/adjustments/${adj._id}/approve`);
      showToast(`✅ Swap approved: ${adj.absentTeacher} ↔ ${adj.replacedBy}`);
      fetchAdjustments();
    } catch { showToast('Failed to approve adjustment.', 'error'); }
    setActionLoading(null);
  };

  const handleReject = async (adj) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setActionLoading(adj._id);
    try {
      await axios.post(`${API_URL}/slots/adjustments/${adj._id}/reject`, { reason });
      showToast(`❌ Swap rejected for ${adj.absentTeacher}`);
      fetchAdjustments();
    } catch { showToast('Failed to reject adjustment.', 'error'); }
    setActionLoading(null);
  };

  const counts = {
    All:       adjustments.length,
    Pending:   adjustments.filter(a => a.status === 'Pending').length,
    Confirmed: adjustments.filter(a => a.status === 'Confirmed').length,
    Rejected:  adjustments.filter(a => a.status === 'Rejected').length,
  };

  const filtered = adjustments.filter(a => {
    const matchStatus = filter === 'All' || a.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || a.absentTeacher?.toLowerCase().includes(q)
      || a.replacedBy?.toLowerCase().includes(q)
      || a.exam?.toLowerCase().includes(q)
      || a.reason?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[#fff0f0] border-[#f0c0c0]'
        }`} style={{ color: toast.type === 'error' ? undefined : '#800000' }}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Adjustments</h1>
          <p className="text-sm text-slate-500 mt-1">Review and action faculty duty-swap requests.</p>
        </div>
        <button onClick={fetchAdjustments} className="p-2 rounded-lg transition-colors" style={{ color: '#800000' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffe8e8'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        ><RefreshCw className="w-5 h-5" /></button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',    count: counts.All,       icon: Users,       color: 'from-[#800000] to-[#a00000]' },
          { label: 'Pending',  count: counts.Pending,   icon: Clock,       color: 'from-amber-400 to-orange-500' },
          { label: 'Approved', count: counts.Confirmed, icon: CheckCircle, color: 'from-[#800000] to-[#600000]' },
          { label: 'Rejected', count: counts.Rejected,  icon: XCircle,     color: 'from-red-500 to-rose-600'    },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4" style={{ border: '1px solid #f0d0d0' }}>
              <div className={`w-11 h-11 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{s.count}</div>
                <div className="text-xs text-slate-500 font-medium">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl p-1" style={{ background: '#ffe8e8', border: '1px solid #f0d0d0' }}>
          <Filter className="w-4 h-4 ml-2" style={{ color: '#800000' }} />
          {['All', 'Pending', 'Confirmed', 'Rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: filter === f ? 'linear-gradient(135deg,#800000,#a00000)' : 'transparent',
                color: filter === f ? 'white' : '#800000',
              }}
            >
              {f}{f !== 'All' && counts[f] > 0 && <span className="ml-1 text-xs opacity-75">({counts[f]})</span>}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search faculty, exam, reason..."
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl text-sm focus:outline-none"
            style={{ border: '1px solid #f0d0d0' }}
            onFocus={e => { e.target.style.borderColor = '#800000'; e.target.style.boxShadow = '0 0 0 3px rgba(128,0,0,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#f0d0d0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#800000' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-slate-400" style={{ border: '1px solid #f0d0d0' }}>
          <FileText className="w-14 h-14 mb-4 opacity-30" style={{ color: '#800000' }} />
          <p className="text-lg font-semibold text-slate-600">No adjustment requests found</p>
          <p className="text-sm mt-1">
            {filter !== 'All' ? `No ${filter.toLowerCase()} requests match your search.` : "Faculty members haven't submitted any swap requests yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((adj, idx) => {
            const ss = STATUS_STYLES[adj.status] || STATUS_STYLES['Pending'];
            const isPending   = adj.status === 'Pending';
            const isActioning = actionLoading === adj._id;
            return (
              <div key={adj._id || idx} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                style={{ border: isPending ? '1px solid #fde68a' : '1px solid #f0d0d0' }}
              >
                <div className="h-1" style={{
                  background: isPending ? 'linear-gradient(90deg,#f59e0b,#fb923c)' :
                    adj.status === 'Confirmed' ? 'linear-gradient(90deg,#800000,#a00000)' :
                    'linear-gradient(90deg,#ef4444,#f87171)'
                }} />
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ss.bg} ${ss.text} ${ss.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />{adj.status}
                        </span>
                        <span className="text-xs text-slate-400">{adj.requestedAt ? fmtDate(adj.requestedAt) : ''}</span>
                      </div>

                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#fff0f0', border: '1px solid #f0c0c0' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#800000,#a00000)' }}>
                            {getInitials(adj.absentTeacher)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#800000', opacity: 0.7 }}>Requesting</div>
                            <div className="text-sm font-bold" style={{ color: '#800000' }}>{adj.absentTeacher || '—'}</div>
                          </div>
                        </div>
                        <div className="text-slate-300 text-xl">⟶</div>
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(adj.replacedBy || adj.swapWithName)}
                          </div>
                          <div>
                            <div className="text-xs text-emerald-500 font-semibold uppercase tracking-wide">Swap With</div>
                            <div className="text-sm font-bold text-emerald-700">{adj.replacedBy || adj.swapWithName || '—'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#fff8f8', border: '1px solid #f0d0d0' }}>
                        <div className="text-sm font-bold text-slate-800 mb-2">{adj.exam || '—'}</div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: '#800000' }} />{fmtDate(adj.originalDate || adj.date)}</span>
                          <span className="flex items-center gap-1"><Clock    className="w-3 h-3" style={{ color: '#800000' }} />{adj.time || '—'}</span>
                          <span className="flex items-center gap-1"><MapPin   className="w-3 h-3" style={{ color: '#800000' }} />{adj.room || '—'}</span>
                          <span className="flex items-center gap-1"><Users    className="w-3 h-3" style={{ color: '#800000' }} />{adj.class || '—'}</span>
                        </div>
                      </div>

                      {adj.reason && (
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span><span className="font-semibold">Reason:</span> {adj.reason}</span>
                        </div>
                      )}
                      {adj.status === 'Rejected' && adj.rejectionReason && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span><span className="font-semibold">Rejection:</span> {adj.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                        <button onClick={() => handleApprove(adj)} disabled={isActioning}
                          className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg,#800000,#a00000)', boxShadow: '0 4px 12px rgba(128,0,0,0.3)' }}
                        >
                          <CheckCircle className="w-4 h-4" />{isActioning ? 'Processing…' : 'Approve'}
                        </button>
                        <button onClick={() => handleReject(adj)} disabled={isActioning}
                          className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all disabled:opacity-60"
                        >
                          <XCircle className="w-4 h-4" />{isActioning ? 'Processing…' : 'Reject'}
                        </button>
                      </div>
                    )}
                    {!isPending && (
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${ss.bg} ${ss.text} ${ss.border}`}>
                        {adj.status === 'Confirmed' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {adj.status === 'Confirmed' ? 'Approved' : 'Rejected'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main AdminDashboard ── */
export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen]             = useState(true);
  const [activeTab, setActiveTab]                 = useState('overview');
  const [searchQuery, setSearchQuery]             = useState('');
  const [notifications, setNotifications]         = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats]                         = useState({ totalFaculty: 0, scheduledSlots: 0, dutyAssignments: 0, pendingLeaveRequests: 0, totalSeating: 0 });
  const [upcomingExams, setUpcomingExams]         = useState([]);
  const [recentActivities, setRecentActivities]   = useState([]);
  const [loading, setLoading]                     = useState(true);
  const timetableFileRef                          = useRef(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const facultyRes = await axios.get(`${API_URL}/faculty`);
      const slotsRes   = await axios.get(`${API_URL}/slots`);
      const seatingRes = await axios.get(`${API_URL}/seating`).catch(() => ({ data: { data: [] } }));
      let allAdjustments = [];
      try {
        const adjRes = await axios.get(`${API_URL}/slots/adjustments/all`);
        allAdjustments = Array.isArray(adjRes.data) ? adjRes.data : [];
      } catch {
        try { const r = await axios.get(`${API_URL}/leave-adjustments/pending`); allAdjustments = Array.isArray(r.data) ? r.data : []; } catch {}
      }
      const pendingAdjustments = allAdjustments.filter(a => a.status === 'Pending');
      const totalAssignments   = slotsRes.data.reduce((sum, slot) => sum + (slot.assignedInvigilators?.length || 0), 0);
      
      const allSeating = seatingRes.data.data || [];
      const publishedSeating = allSeating.filter(a => a.status === 'Published').length;

      setStats({ 
        totalFaculty: facultyRes.data.length, 
        scheduledSlots: slotsRes.data.length, 
        dutyAssignments: totalAssignments, 
        pendingLeaveRequests: pendingAdjustments.length,
        totalSeating: publishedSeating 
      });
      const upcomingSlots = slotsRes.data.filter(slot => new Date(slot.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5).map(slot => ({
        subject: slot.subject, date: getDateKey(slot.date), time: slot.time, hall: slot.classroom,
        invigilators: slot.assignedInvigilators?.length || 0, needed: slot.invigilatorsNeeded,
        status: (slot.assignedInvigilators?.length || 0) >= slot.invigilatorsNeeded ? 'scheduled' : 'pending'
      }));
      setUpcomingExams(upcomingSlots);
      setRecentActivities([
        { action: 'Faculty uploaded',   subject: `${facultyRes.data.length} faculty members`,     time: 'Today', type: 'success' },
        { action: 'Exam slots created', subject: `${slotsRes.data.length} slots scheduled`,       time: 'Today', type: 'info'    },
        { action: 'Duty assignments',   subject: `${totalAssignments} assignments completed`,     time: 'Today', type: 'success' },
        { action: 'Leave requests',     subject: `${pendingAdjustments.length} pending requests`, time: 'Today', type: pendingAdjustments.length > 0 ? 'warning' : 'info' }
      ]);
      setLoading(false);
    } catch (error) { console.error('Error:', error); setLoading(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const slotsRes = await axios.get(`${API_URL}/slots`);
      const notifs = [];
      try {
        const adjRes = await axios.get(`${API_URL}/slots/adjustments/all`);
        const adjustments = Array.isArray(adjRes.data) ? adjRes.data : [];
        adjustments.filter(a => a.status === 'Pending').forEach(adj => {
          notifs.push({ id: adj._id, message: `${adj.absentTeacher} requested a duty swap with ${adj.replacedBy}`, time: adj.requestedAt ? new Date(adj.requestedAt).toLocaleString() : 'Recently', type: 'leave', unread: true });
        });
      } catch {}
      const unassigned = slotsRes.data.filter(slot => (slot.assignedInvigilators?.length || 0) < slot.invigilatorsNeeded);
      if (unassigned.length > 0) notifs.push({ id: 'unassigned', message: `${unassigned.length} exam slots need invigilation assignment`, time: 'Now', type: 'warning', unread: true });
      setNotifications(notifs);
    } catch (error) { console.error('Notifications error:', error); }
  }, []);

  useEffect(() => { fetchDashboardData(); fetchNotifications(); }, [fetchDashboardData, fetchNotifications]);

  const menuItems = [
    { id: 'overview', name: 'Overview',            icon: BarChart3, path: null                  },
    { id: 'series',   name: 'Series Invigilation', icon: Calendar,  path: '/SeriesInvigilation' },
    { id: 'seating',  name: 'Seating Arrangement', icon: MapPin,    path: '/SeatingArrangement' },
    { id: 'students', name: 'Students Management', icon: Users,     path: '/StudentsManagement' },
    { id: 'faculty',  name: 'Faculty Management',  icon: UserCheck, path: '/FacultyManagement'  },
    { id: 'leave',    name: 'Leave Adjustments',   icon: FileText,  path: null                  },
  ];

  const handleNavigation = (item) => {
    if (item.path) window.location.href = item.path;
    else setActiveTab(item.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    window.location.href = '/login';
  };

  const handleTimetableFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const title    = prompt('Enter timetable title (optional):', file.name) || '';
    const semester = prompt('Enter semester (optional):', '') || '';
    const formData = new FormData();
    formData.append('file', file);
    if (title)    formData.append('title', title);
    if (semester) formData.append('semester', semester);
    try {
      const response = await axios.post(`${API_URL}/timetables/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(`Timetable uploaded: ${response.data.timetable?.title || file.name}`);
    } catch (error) { alert('Failed to upload timetable: ' + (error.response?.data?.error || error.message)); }
    finally { e.target.value = ''; }
  };

  const handleAutoAssign = async () => {
    try {
      const semester = prompt('Enter semester for auto-assignment (e.g., "Semester 1"):');
      if (semester) { const response = await axios.post(`${API_URL}/slots/auto-assign`, { semester }); alert(`Auto-assignment completed! ${response.data.message}`); fetchDashboardData(); }
    } catch (error) { alert('Error during auto-assignment: ' + error.message); }
  };

  const statsConfig = [
    { title: 'Total Faculty',    value: stats.totalFaculty,         change: '+12%',                                              icon: UserCheck,   color: 'from-[#800000] to-[#a00000]', trend: 'up'                                              },
    { title: 'Scheduled Slots',  value: stats.scheduledSlots,       change: `+${stats.scheduledSlots}`,                         icon: Calendar,    color: 'from-[#800000] to-[#600000]', trend: 'up'                                              },
    { title: 'Duty Assignments', value: stats.dutyAssignments,      change: `+${stats.dutyAssignments}`,                        icon: CheckCircle, color: 'from-[#800000] to-[#9a0000]', trend: 'up'                                              },
    { title: 'Leave Requests',   value: stats.pendingLeaveRequests, change: stats.pendingLeaveRequests > 0 ? 'Pending' : 'None', icon: AlertCircle, color: 'from-[#800000] to-[#b00000]', trend: stats.pendingLeaveRequests > 0 ? 'warning' : 'neutral', onClick: () => setActiveTab('leave') }
  ];

  const unreadNotifications = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fce8e8' }}>

      {/* ── SIDEBAR ── */}
      <aside className={`fixed top-0 left-0 h-full shadow-xl transition-all duration-300 z-40 border-r border-slate-200 ${sidebarOpen ? 'w-64' : 'w-20'}`}
        style={{ background: '#800000' }}
      >
        <div className="flex flex-col h-full">
          <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center space-x-3">
              <img src={logo} alt="InExa Logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold text-white">InExa</h1>
                  <p className="text-xs text-white/70">Admin Panel</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
              const Icon     = item.icon;
              const isActive = activeTab === item.id;
              const badge    = item.id === 'leave' ? stats.pendingLeaveRequests : 0;
              return (
                <button key={item.id} onClick={() => handleNavigation(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                    borderLeft: isActive ? '3px solid #ffffff' : '3px solid transparent',
                    fontWeight: isActive ? 600 : 500,
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ffffff'; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium flex-1 text-left text-sm">{item.name}</span>}
                  {badge > 0 && sidebarOpen && (
                    <span className="text-[#800000] text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse" style={{ backgroundColor: '#ffffff' }}>
                      {badge}
                    </span>
                  )}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#ffffff', boxShadow: '0 0 4px #ffffff' }} />}
                </button>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <div className="text-xs font-bold uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>Quick Stats</div>
              <div className="grid grid-cols-2 gap-2">
                {[{ label: 'Slots', value: stats.scheduledSlots }, { label: 'Faculty', value: stats.totalFaculty }].map((s, i) => (
                  <div key={i} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{s.value}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ color: 'rgba(255,255,255,0.8)', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            >
              <LogOut className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>

        {/* Header */}
        <header className="sticky top-0 z-30" style={{ backgroundColor: '#fff0f0', borderBottom: '1px solid #e8c8c8', boxShadow: '0 2px 12px rgba(128,0,0,0.08)' }}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg transition-colors"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffe0e0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              ><Menu className="w-6 h-6" style={{ color: '#800000' }} /></button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {activeTab === 'leave' ? 'Leave Adjustments' : 'Admin Dashboard'}
                </h2>
                <p className="text-sm text-slate-500">Welcome back, {localStorage.getItem('adminName') || 'Administrator'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Search exams, faculty..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg w-64 focus:outline-none"
                  style={{ backgroundColor: '#ffe8e8', border: '1px solid #e0c0c0' }}
                  onFocus={e => { e.target.style.borderColor = '#800000'; e.target.style.boxShadow = '0 0 0 3px rgba(128,0,0,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e0c0c0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-lg transition-colors"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffe0e0'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Bell className="w-6 h-6" style={{ color: '#800000' }} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: '#800000' }}>
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50" style={{ background: '#fff5f5', border: '1px solid #e8c8c8' }}>
                    <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e8c8c8' }}>
                      <div>
                        <h3 className="font-bold text-slate-800">Notifications</h3>
                        <p className="text-xs text-slate-500">{unreadNotifications} unread</p>
                      </div>
                      {stats.pendingLeaveRequests > 0 && (
                        <button onClick={() => { setActiveTab('leave'); setShowNotifications(false); }}
                          className="text-xs font-medium hover:underline" style={{ color: '#800000' }}>
                          View leave requests →
                        </button>
                      )}
                    </div>
                    {notifications.length > 0 ? (
                      <div>
                        {notifications.map(notif => (
                          <div key={notif.id}
                            onClick={() => { setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n)); if (notif.type === 'leave') { setActiveTab('leave'); setShowNotifications(false); } }}
                            className="p-4 cursor-pointer transition-colors"
                            style={{ backgroundColor: notif.unread ? '#ffe8e8' : '#fff5f5', borderBottom: '1px solid #f0d0d0' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffe0e0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = notif.unread ? '#ffe8e8' : '#fff5f5'}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: notif.type === 'warning' ? '#fff5e6' : '#fff0f0' }}>
                                {notif.type === 'warning'
                                  ? <AlertCircle className="w-4 h-4" style={{ color: '#c05000' }} />
                                  : <CheckCircle className="w-4 h-4" style={{ color: '#800000' }} />
                                }
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{notif.message}</p>
                                <p className="text-xs text-slate-500">{notif.time}</p>
                              </div>
                              {notif.unread && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: '#800000', backgroundColor: '#ffd0d0' }}>New</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: '#800000' }} />
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button onClick={fetchDashboardData} className="p-2 rounded-lg transition-colors" title="Refresh"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffe0e0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              ><RefreshCw className="w-6 h-6" style={{ color: '#800000' }} /></button>

              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#800000,#a00000)' }}>
                <span className="text-white font-semibold">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-6 space-y-6">

          {activeTab === 'leave' && <LeaveAdjustmentsPanel />}

          {activeTab === 'overview' && (
            loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#800000' }} />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {statsConfig.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div key={index} onClick={stat.onClick}
                        className="rounded-2xl shadow-sm p-6 transition-all hover:shadow-md"
                        style={{ background: '#fff5f5', border: '1px solid #e8c8c8', cursor: stat.onClick ? 'pointer' : 'default' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#c08080'; e.currentTarget.style.background = '#ffe8e8'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8c8c8'; e.currentTarget.style.background = '#fff5f5'; }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-sm font-semibold px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: stat.trend === 'up' ? '#ffe0e0' : stat.trend === 'warning' ? '#fff5e6' : '#f5f5f5',
                              color: stat.trend === 'up' ? '#800000' : stat.trend === 'warning' ? '#c05000' : '#555'
                            }}
                          >{stat.change}</span>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.title}</h3>
                        <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                        {stat.onClick && stat.value > 0 && (
                          <p className="text-xs mt-2 font-medium" style={{ color: '#800000' }}>Click to review →</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Upcoming exams */}
                  <div className="lg:col-span-2 rounded-2xl shadow-sm p-6" style={{ background: '#fff5f5', border: '1px solid #e8c8c8' }}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Upcoming Exam Slots</h3>
                      <button onClick={() => { window.location.href = '/SeriesInvigilation'; }}
                        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#800000,#a00000)' }}
                      ><Plus className="w-4 h-4" />Create Slot</button>
                    </div>
                    <div className="space-y-4">
                      {upcomingExams.length > 0 ? upcomingExams.map((exam, index) => (
                        <div key={index} className="p-4 rounded-xl transition-all" style={{ backgroundColor: '#ffe8e8', border: '1px solid #e0c0c0' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#c08080'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#e0c0c0'}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-800">{exam.subject}</h4>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: exam.status === 'scheduled' ? '#ffd0d0' : '#fff5e6', color: exam.status === 'scheduled' ? '#800000' : '#9a5000' }}
                            >{exam.status}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: '#800000' }} />{exam.date}</div>
                            <div className="flex items-center gap-2"><Clock    className="w-4 h-4" style={{ color: '#800000' }} />{exam.time}</div>
                            <div className="flex items-center gap-2"><MapPin   className="w-4 h-4" style={{ color: '#800000' }} />{exam.hall}</div>
                            <div className="flex items-center gap-2"><Users    className="w-4 h-4" style={{ color: '#800000' }} />{exam.invigilators}/{exam.needed} assigned</div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-slate-400">
                          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: '#800000' }} />
                          <p>No upcoming exam slots</p>
                          <button onClick={() => { window.location.href = '/SeriesInvigilation'; }} className="mt-4 text-sm font-medium" style={{ color: '#800000' }}>Create your first exam slot</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent activities */}
                  <div className="rounded-2xl shadow-sm p-6" style={{ background: '#fff5f5', border: '1px solid #e8c8c8' }}>
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Activities</h3>
                    <div className="space-y-4">
                      {recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-start gap-3 pb-4 last:border-0" style={{ borderBottom: '1px solid #f0d0d0' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: activity.type === 'warning' ? '#fff5e6' : '#ffe8e8' }}
                          >
                            {activity.type === 'warning'
                              ? <AlertCircle className="w-4 h-4" style={{ color: '#c05000' }} />
                              : <CheckCircle className="w-4 h-4" style={{ color: '#800000' }} />
                            }
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{activity.action}</p>
                            <p className="text-xs text-slate-500">{activity.subject}</p>
                            <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl shadow-sm p-6" style={{ background: '#fff5f5', border: '1px solid #e8c8c8' }}>
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'Schedule Exam',    icon: Calendar,  onClick: () => { window.location.href = '/SeriesInvigilation'; } },
                      { name: 'Upload Faculty',   icon: Upload,    onClick: () => { window.location.href = '/FacultyManagement';  } },
                      { name: 'Auto-Assign',      icon: RefreshCw, onClick: handleAutoAssign },
                      { name: 'Upload Timetable', icon: Upload,    onClick: () => timetableFileRef.current?.click() },
                    ].map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button key={index} onClick={action.onClick}
                          className="p-6 rounded-xl border-2 transition-all group"
                          style={{ backgroundColor: '#ffe8e8', borderColor: '#e0c0c0' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#800000'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(128,0,0,0.15)'; e.currentTarget.style.backgroundColor = '#ffd8d8'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0c0c0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = '#ffe8e8'; }}
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform"
                            style={{ background: 'linear-gradient(135deg,#800000,#a00000)' }}
                          ><Icon className="w-6 h-6 text-white" /></div>
                          <p className="text-sm font-semibold text-slate-700">{action.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <input ref={timetableFileRef} type="file" accept="*/*" className="hidden" onChange={handleTimetableFileChange} />
              </>
            )
          )}
        </main>
      </div>
    </div>
  );
}
