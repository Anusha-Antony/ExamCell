import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Search, Filter, Trash2, Download, 
  Mail, Award, UserCheck, Loader, AlertCircle, X, ArrowLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function FacultyManagement() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    professors: 0,
    departments: 0
  });


  const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Senior Lecturer', 'Lecturer', 'Lab Staff', 'Teaching Assistant'];

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Fetch all faculty from database
  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/faculty`);
      setFaculty(response.data);
      
      // Calculate stats
      const uniqueDepartments = [...new Set(response.data.map(f => f.department).filter(Boolean))].length;
      const professorsCount = response.data.filter(f => (f.designation || '').toLowerCase().includes('professor')).length;
      const activeCount = response.data.filter(f => f.available).length;
      
      setStats({
        total: response.data.length,
        active: activeCount,
        professors: professorsCount,
        departments: uniqueDepartments
      });
    } catch (error) {
      console.error('Fetch faculty error:', error);
      showMessage('error', 'Failed to fetch faculty data');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  // Filter faculty
  const filteredFaculty = faculty.filter(member => {
    const matchesSearch = searchQuery
      ? (member.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.department || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesDepartment = filterDepartment ? member.department === filterDepartment : true;
    const matchesDesignation = filterDesignation ? member.designation === filterDesignation : true;
    return matchesSearch && matchesDepartment && matchesDesignation;
  });

  // Delete faculty
  const handleDeleteFaculty = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/faculty/${id}`);
      showMessage('success', 'Faculty member deleted successfully');
      fetchFaculty(); // Refresh list
    } catch (error) {
      console.error('Delete faculty error:', error);
      showMessage('error', 'Failed to delete faculty member');
    } finally {
      setLoading(false);
    }
  };

  // Delete ALL faculty
  const handleDeleteAllFaculty = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL faculty members? This action cannot be undone!')) return;

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/faculty/all`);
      showMessage('success', 'All faculty members deleted successfully');
      fetchFaculty(); // Refresh list
    } catch (error) {
      console.error('Delete all faculty error:', error);
      showMessage('error', 'Failed to delete all faculty members');
    } finally {
      setLoading(false);
    }
  };



  // Export faculty data
  const handleExportData = async () => {
    try {
      const response = await axios.get(`${API_URL}/faculty/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date();
      const fileDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      link.setAttribute('download', `faculty_data_${fileDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showMessage('success', 'Faculty data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('error', 'Failed to export faculty data');
    }
  };

  const getDesignationColor = (designation) => {
    const colors = {
      'Professor': 'from-[#800000] to-[#a00000]',
      'Associate Professor': 'from-[#901010] to-[#b01010]',
      'Assistant Professor': 'from-[#a00000] to-[#c02020]',
      'Senior Lecturer': 'from-[#b02020] to-[#d03030]',
      'Lecturer': 'from-[#c03030] to-[#e04040]',
      'Lab Staff': 'from-slate-500 to-slate-600',
      'Teaching Assistant': 'from-[#d04040] to-[#f05050]'
    };
    return colors[designation] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#fff0f0] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <UserCheck className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{message.text}</span>
            <button 
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Faculty Management</h1>
            <p className="text-slate-600">Manage faculty members and staff</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/AdminDashboard')} 
              className="flex items-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <button 
              onClick={handleDeleteAllFaculty}
              disabled={loading || faculty.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-[#ffe0e0] text-[#b02020] rounded-xl font-bold hover:bg-[#ffc0c0] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Trash2 className="w-5 h-5" />
              Delete All
            </button>
            <button 
              onClick={handleExportData}
              disabled={loading || faculty.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#800000] to-[#b02020] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Export Data
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="w-12 h-12 bg-gradient-to-br from-[#800000] to-[#b02020] rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">Total Faculty</h3>
            <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="w-12 h-12 bg-gradient-to-br from-[#901010] to-[#b00000] rounded-xl flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-slate-600 text-sm font-medium mb-1">Professors</h3>
            <p className="text-3xl font-bold text-slate-800">{stats.professors}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b]"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b]"
              >
                <option value="">All Designations</option>
                {designations.map(des => (
                  <option key={des} value={des}>{des}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600">
            Showing <strong>{filteredFaculty.length}</strong> of <strong>{faculty.length}</strong> faculty members
          </div>
        </div>

        {/* Loading State */}
        {loading && faculty.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
            <Loader className="w-16 h-16 text-[#800000] mx-auto mb-4 animate-spin" />
            <p className="text-slate-500 text-lg">Loading faculty data...</p>
          </div>
        )}

        {/* Faculty Cards */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFaculty.map((member) => (
              <div key={member._id} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 bg-gradient-to-br ${getDesignationColor(member.designation)} rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                      {(member.name || 'NA').split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{member.name || 'Unnamed'}</h3>
                      <p className="text-sm text-slate-500">Sem {member.semester || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{member.designation || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 truncate">{member.email || 'No email'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">Duty Count</span>
                    <span className="px-3 py-1 bg-[#ffe0e0] text-[#b02020] rounded-full text-sm font-bold">
                      {member.dutyCount ?? 0} duties
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteFaculty(member._id, member.name)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#ffe0e0] text-[#c00000] rounded-lg hover:bg-[#ffc0c0] transition-all disabled:opacity-50 font-semibold text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Member
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFaculty.length === 0 && faculty.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No faculty members found</p>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && faculty.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No faculty data available</p>
            <p className="text-slate-400 text-sm">Upload faculty data to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
