import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Upload, Download, Calendar, Clock, Users, MapPin, BookOpen, 
  Plus, Trash2, Edit2, Save, X, FileSpreadsheet, CheckCircle, 
  AlertCircle, UserCheck, Shuffle, Loader, Home
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const formatDateDisplay = (value) => {
  const key = getDateKey(value);
  if (!key) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${key}T00:00:00Z`));
};

export default function SeriesInvigilation() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [facultyData, setFacultyData] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [slots, setSlots] = useState([]);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [slotForm, setSlotForm] = useState({
    date: '',
    time: '',
    semester: '',
    slot: '',
    subject: '',
    classroom: '',
    capacity: '',
    invigilatorsNeeded: ''
  });

  const semesters = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const fetchFaculty = useCallback(async () => {
    if (!selectedSemester) return;
    
    try {
      const response = await axios.get(`${API_URL}/faculty`, {
        params: { semester: selectedSemester }
      });
      setFacultyData(response.data);
    } catch (error) {
      console.error('Fetch faculty error:', error);
      showMessage('error', 'Failed to fetch faculty data');
    }
  }, [selectedSemester, showMessage]);

  const fetchSlots = useCallback(async () => {
    if (!selectedSemester) return;
    
    try {
      const response = await axios.get(`${API_URL}/slots`, {
        params: { semester: selectedSemester }
      });
      console.log('✅ Fetched slots:', response.data);
      setSlots(response.data);
    } catch (error) {
      console.error('❌ Fetch slots error:', error);
      showMessage('error', 'Failed to fetch slots');
    }
  }, [selectedSemester, showMessage]);

  useEffect(() => {
    if (selectedSemester) {
      fetchFaculty();
      fetchSlots();
    }
  }, [selectedSemester, fetchFaculty, fetchSlots]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedSemester) {
      showMessage('error', 'Please select a semester first');
      return;
    }

    setUploadedFile(file);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('semester', selectedSemester);
      formData.append('mode', 'upsert');
      
      const response = await axios.post(`${API_URL}/faculty/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showMessage('success', response.data.message);
      await fetchFaculty();
      setActiveTab('slots');
    } catch (error) {
      console.error('Upload error:', error);
      showMessage('error', error.response?.data?.error || 'Upload failed');
      setUploadedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/faculty/template`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'faculty_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showMessage('success', 'Template downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      showMessage('error', 'Failed to download template');
    }
  };

  const handleSlotFormChange = (e) => {
    setSlotForm({
      ...slotForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddSlot = async () => {
    if (!slotForm.date || !slotForm.time || !slotForm.semester || 
        !slotForm.slot || !slotForm.subject || !slotForm.classroom || 
        !slotForm.capacity || !slotForm.invigilatorsNeeded) {
      showMessage('error', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      if (editingSlot) {
        await axios.put(`${API_URL}/slots/${editingSlot._id}`, slotForm);
        showMessage('success', 'Slot updated successfully');
      } else {
        await axios.post(`${API_URL}/slots`, {
          ...slotForm,
          assignedInvigilators: []
        });
        showMessage('success', 'Slot created successfully');
      }

      if (slotForm.semester !== selectedSemester) {
        setSelectedSemester(slotForm.semester);
      } else {
        await fetchSlots();
      }
      
      setSlotForm({
        date: '',
        time: '',
        semester: '',
        slot: '',
        subject: '',
        classroom: '',
        capacity: '',
        invigilatorsNeeded: ''
      });
      setShowAddSlot(false);
      setEditingSlot(null);
    } catch (error) {
      console.error('Add slot error:', error);
      showMessage('error', error.response?.data?.error || 'Failed to save slot');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setSlotForm({
      date: getDateKey(slot.date),
      time: slot.time,
      semester: slot.semester,
      slot: slot.slot,
      subject: slot.subject,
      classroom: slot.classroom,
      capacity: slot.capacity,
      invigilatorsNeeded: slot.invigilatorsNeeded
    });
    setShowAddSlot(true);
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;

    setLoading(true);

    try {
      await axios.delete(`${API_URL}/slots/${slotId}`);
      showMessage('success', 'Slot deleted successfully');
      await fetchSlots();
      await fetchFaculty();
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('error', 'Failed to delete slot');
    } finally {
      setLoading(false);
    }
  };

  // AUTO ASSIGN WITH ENHANCED LOGGING
  const handleAutoAssign = async () => {
    if (!selectedSemester) {
      showMessage('error', 'Please select a semester first');
      return;
    }

    if (slots.length === 0) {
      showMessage('error', 'Please add exam slots first');
      return;
    }

    if (facultyData.length === 0) {
      showMessage('error', 'Please upload faculty data first');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Auto-assign request - Semester:', selectedSemester);
      const response = await axios.post(`${API_URL}/slots/auto-assign`, {
        semester: selectedSemester
      });
      
      console.log('✅ Auto-assign success:', response.data);
      showMessage('success', response.data.message || 'Faculty assigned successfully');
      
      // Refresh data with small delay to ensure DB write completed
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchSlots();
      await fetchFaculty();
    } catch (error) {
      console.error('❌ Auto-assign failed:', error);
      console.error('Error details:', error.response?.data);
      showMessage('error', error.response?.data?.error || 'Auto-assignment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSchedule = async () => {
    try {
      const response = await axios.get(`${API_URL}/slots/export/schedule`, {
        params: { semester: selectedSemester },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedule_sem${selectedSemester}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showMessage('success', 'Schedule exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('error', 'Failed to export schedule');
    }
  };

  // Helper function to safely get invigilator data
  const getInvigilatorData = (invig) => {
    return {
      name: invig.name || invig.facultyId?.name || 'Unknown',
      designation: invig.designation || invig.facultyId?.designation || 'N/A'
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf0f0] to-[#fce8e8] p-6">
      <div className="max-w-7xl mx-auto">
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
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

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#b02020] to-[#d04040] rounded-2xl flex items-center justify-center shadow-lg">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Invigilation Duty Management</h1>
                <p className="text-slate-600">Series Exam - Internal Assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { window.location.href = '/AdminDashboard'; }}
                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </button>
              <button 
                onClick={handleAutoAssign}
                disabled={!selectedSemester || selectedSemester === 'All' || slots.length === 0 || facultyData.length === 0 || loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#800000] to-[#b02020] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Shuffle className="w-5 h-5" />}
                Auto Assign
              </button>
              <button 
                onClick={handleExportSchedule}
                disabled={slots.length === 0 || loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#901010] to-[#c03030] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Export Schedule
              </button>
            </div>
          </div>

          {selectedSemester && facultyData.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded-xl shadow border border-slate-200">
                <p className="text-sm text-slate-600">Total Faculty (Global)</p>
                <p className="text-2xl font-bold text-slate-800">{facultyData.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow border border-slate-200">
                <p className="text-sm text-slate-600">Exam Slots</p>
                <p className="text-2xl font-bold text-[#b02020]">{slots.length}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow border border-slate-200">
            <label className="font-bold text-slate-700">Active Semester for Series:</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-4 py-2 w-64 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b02020] text-slate-800 font-semibold"
            >
              <option value="">-- Choose Semester --</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem === 'All' ? 'All Semesters' : `Semester ${sem}`}</option>
              ))}
            </select>
            {!selectedSemester && <span className="text-[#b02020] text-sm font-semibold ml-2">Please select a semester first.</span>}
          </div>

          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'text-[#b02020] border-b-2 border-[#b02020]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Faculty Upload
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === 'slots'
                  ? 'text-[#b02020] border-b-2 border-[#b02020]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Exam Slots ({slots.length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === 'assignments'
                  ? 'text-[#b02020] border-b-2 border-[#b02020]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Duty Assignments
            </button>
          </div>
        </div>

        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-[#b02020]" />
                Upload Faculty List
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>


                  <div className="border-2 border-dashed border-[#e0b0b0] rounded-2xl p-8 text-center bg-[#fff0f0] hover:bg-[#ffe0e0] transition-all">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="faculty-upload"
                      disabled={!selectedSemester || selectedSemester === 'All' || loading}
                    />
                    <label htmlFor="faculty-upload" className={`cursor-pointer ${(!selectedSemester || selectedSemester === 'All' || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {loading ? (
                        <Loader className="w-16 h-16 text-[#b02020] mx-auto mb-4 animate-spin" />
                      ) : (
                        <Upload className="w-16 h-16 text-[#b02020] mx-auto mb-4" />
                      )}
                      <p className="text-lg font-semibold text-slate-800 mb-2">
                        {uploadedFile ? uploadedFile.name : 'Upload Faculty Excel File'}
                      </p>
                      <p className="text-sm text-slate-600">
                        Click to browse or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Supported formats: .xlsx, .xls, .csv
                      </p>
                    </label>
                  </div>

                  {uploadedFile && !loading && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">File Uploaded Successfully</p>
                        <p className="text-xs text-green-600">{uploadedFile.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Excel Format Requirements</h3>
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <p className="text-sm text-slate-700 mb-4 font-semibold">Required Columns:</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#b02020] rounded-full"></div>
                        Faculty Name
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#b02020] rounded-full"></div>
                        Designation
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#b02020] rounded-full"></div>
                        Department
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#b02020] rounded-full"></div>
                        Email
                      </li>

                    </ul>

                    <button 
                      onClick={handleDownloadTemplate}
                      className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#b02020] text-white rounded-lg hover:bg-[#901010] transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download Sample Template
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {facultyData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-6">
                  Global Faculty List ({facultyData.length} members)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Designation</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Duty Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyData.map((faculty) => (
                        <tr key={faculty._id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-800">{faculty.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{faculty.designation}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{faculty.department}</td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 bg-[#ffe0e0] text-[#a00000] rounded-full text-xs font-semibold">
                              {faculty.dutyCount} duties
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'slots' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Exam Slots Management</h2>
              <button
                onClick={() => {
                  setShowAddSlot(true);
                  setEditingSlot(null);
                  setSlotForm({
                    date: '',
                    time: '',
                    semester: selectedSemester || '',
                    slot: '',
                    subject: '',
                    classroom: '',
                    capacity: '',
                    invigilatorsNeeded: ''
                  });
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#b02020] to-[#d04040] text-white rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Add New Slot
              </button>
            </div>

            {showAddSlot && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingSlot ? 'Edit Exam Slot' : 'Add New Exam Slot'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddSlot(false);
                      setEditingSlot(null);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        name="date"
                        value={slotForm.date}
                        onChange={handleSlotFormChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Time Slot *</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="time"
                        value={slotForm.time}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., 09:15 AM - 10:45 AM"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Semester *</label>
                    <select
                      name="semester"
                      value={slotForm.semester}
                      onChange={handleSlotFormChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                    >
                      <option value="">Select Semester</option>
                      {semesters.map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Slot Number *</label>
                    <input
                      type="text"
                      name="slot"
                      value={slotForm.slot}
                      onChange={handleSlotFormChange}
                      placeholder="e.g., Slot 1"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Subject *</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="subject"
                        value={slotForm.subject}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., Data Structures"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Classroom *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="classroom"
                        value={slotForm.classroom}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., Hall A"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Capacity *</label>
                    <input
                      type="number"
                      name="capacity"
                      value={slotForm.capacity}
                      onChange={handleSlotFormChange}
                      placeholder="e.g., 60"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Invigilators Needed *</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        name="invigilatorsNeeded"
                        value={slotForm.invigilatorsNeeded}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., 3"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b] text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddSlot(false);
                      setEditingSlot(null);
                    }}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSlot}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#b02020] to-[#d04040] text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {editingSlot ? 'Update Slot' : 'Add Slot'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-6">
              {slots.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No exam slots added yet</p>
                  <p className="text-slate-400 text-sm">Click "Add New Slot" to create your first exam slot</p>
                </div>
              ) : (
                slots.map((slot) => (
                  <div key={slot._id} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{slot.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <span className="px-3 py-1 bg-[#ffe0e0] text-[#a00000] rounded-full font-semibold">
                            Semester {slot.semester}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                            {slot.slot}
                          </span>

                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSlot(slot)}
                          className="p-2 hover:bg-[#fff0f0] text-[#b02020] rounded-lg transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot._id)}
                          disabled={loading}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{formatDateDisplay(slot.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{slot.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{slot.classroom} (Cap: {slot.capacity})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{slot.assignedInvigilators?.length || 0} / {slot.invigilatorsNeeded} Assigned</span>
                      </div>
                    </div>

                    {slot.assignedInvigilators && slot.assignedInvigilators.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Assigned Invigilators:</p>
                        <div className="flex flex-wrap gap-2">
                          {slot.assignedInvigilators.map((invig, idx) => {
                            const data = getInvigilatorData(invig);
                            return (
                              <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                                {data.name} ({data.designation})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Complete Duty Schedule</h2>
            
            {slots.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No slots created yet</p>
                <p className="text-slate-400 text-sm">Please add exam slots first</p>
              </div>
            ) : (
              <div className="space-y-6">
                {slots.map((slot) => (
                  <div key={slot._id} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">{slot.subject}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-slate-600">
                            <span className="font-semibold">Date:</span> {formatDateDisplay(slot.date)}
                          </div>
                          <div className="text-slate-600">
                            <span className="font-semibold">Time:</span> {slot.time}
                          </div>
                          <div className="text-slate-600">
                            <span className="font-semibold">Classroom:</span> {slot.classroom}
                          </div>
                          <div className="text-slate-600">
                            <span className="font-semibold">Semester:</span> {slot.semester}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">
                          Assigned Faculty ({slot.assignedInvigilators?.length || 0}/{slot.invigilatorsNeeded})
                        </p>
                        <div className="space-y-2">
                          {slot.assignedInvigilators?.map((invig, idx) => {
                            const data = getInvigilatorData(invig);
                            return (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                <div className="w-8 h-8 bg-gradient-to-br from-[#b02020] to-[#d04040] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {data.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{data.name}</p>
                                  <p className="text-xs text-slate-500">{data.designation}</p>
                                </div>
                              </div>
                            );
                          })}
                          {(!slot.assignedInvigilators || slot.assignedInvigilators.length === 0) && (
                            <p className="text-sm text-slate-400 italic">No faculty assigned yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
