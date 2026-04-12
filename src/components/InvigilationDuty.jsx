import React, { useState } from 'react';
import { 
  Brain, Upload, Download, Calendar, Clock, Users, MapPin, BookOpen, 
  Plus, Trash2, Edit2, Save, X, FileSpreadsheet, CheckCircle, 
  AlertCircle, Filter, Search, ChevronDown, UserCheck, Award
} from 'lucide-react';

export default function InvigilationDutyManagement() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [facultyData, setFacultyData] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [slots, setSlots] = useState([]);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

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

  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const timeSlots = ['09:00 AM - 12:00 PM', '02:00 PM - 05:00 PM'];
  const slotNumbers = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4'];

  const facultyRanks = [
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Senior Lecturer',
    'Lecturer',
    'Lab Staff',
    'Teaching Assistant'
  ];

  // Sample faculty data structure
  const sampleFacultyData = [
    { id: 1, name: 'Dr. Rajesh Kumar', designation: 'Professor', department: 'CSE', available: true },
    { id: 2, name: 'Dr. Priya Sharma', designation: 'Associate Professor', department: 'ECE', available: true },
    { id: 3, name: 'Mr. Arun Menon', designation: 'Assistant Professor', department: 'CSE', available: true },
    { id: 4, name: 'Ms. Lakshmi Nair', designation: 'Lecturer', department: 'IT', available: true },
    { id: 5, name: 'Mr. Suresh Babu', designation: 'Lab Staff', department: 'CSE', available: true }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      // Simulate file processing - in real app, use libraries like xlsx or papaparse
      setTimeout(() => {
        setFacultyData(sampleFacultyData);
        setActiveTab('slots');
      }, 1000);
    }
  };

  const handleSlotFormChange = (e) => {
    setSlotForm({
      ...slotForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddSlot = () => {
    if (!slotForm.date || !slotForm.time || !slotForm.semester || !slotForm.subject || !slotForm.classroom || !slotForm.capacity || !slotForm.invigilatorsNeeded) {
      alert('Please fill all required fields');
      return;
    }

    const newSlot = {
      id: Date.now(),
      ...slotForm,
      assignedInvigilators: []
    };

    if (editingSlot) {
      setSlots(slots.map(s => s.id === editingSlot.id ? { ...newSlot, id: editingSlot.id } : s));
      setEditingSlot(null);
    } else {
      setSlots([...slots, newSlot]);
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
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setSlotForm({
      date: slot.date,
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

  const handleDeleteSlot = (slotId) => {
    if (window.confirm('Are you sure you want to delete this slot?')) {
      setSlots(slots.filter(s => s.id !== slotId));
    }
  };

  const handleAutoAssign = () => {
    // Simple auto-assignment logic
    const updatedSlots = slots.map(slot => {
      const needed = parseInt(slot.invigilatorsNeeded);
      const available = facultyData.filter(f => f.available).slice(0, needed);
      return {
        ...slot,
        assignedInvigilators: available.map(f => f.id)
      };
    });
    setSlots(updatedSlots);
    alert('Invigilation duties assigned automatically!');
  };

  const handleExportSchedule = () => {
    alert('Schedule exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Invigilation Duty Management</h1>
                <p className="text-slate-600">Series Exam - Internal Assessment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAutoAssign}
                disabled={slots.length === 0 || facultyData.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                Auto Assign
              </button>
              <button 
                onClick={handleExportSchedule}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5" />
                Export Schedule
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Faculty Upload
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === 'slots'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Exam Slots
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === 'assignments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Duty Assignments
            </button>
          </div>
        </div>

        {/* Faculty Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-blue-600" />
                Upload Faculty List
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Semester *
                    </label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    >
                      <option value="">Choose Semester</option>
                      {semesters.map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center bg-blue-50 hover:bg-blue-100 transition-all">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="faculty-upload"
                    />
                    <label htmlFor="faculty-upload" className="cursor-pointer">
                      <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
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

                  {uploadedFile && (
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
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Faculty Name
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Designation (Professor, Associate Professor, etc.)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Department
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Email
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Availability Status
                      </li>
                    </ul>

                    <button className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                      <Download className="w-4 h-4" />
                      Download Sample Template
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Faculty List Preview */}
            {facultyData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-6">
                  Uploaded Faculty List ({facultyData.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Designation</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyData.map((faculty, index) => (
                        <tr key={faculty.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-800">{faculty.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{faculty.designation}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{faculty.department}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              faculty.available
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {faculty.available ? 'Available' : 'Unavailable'}
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

        {/* Exam Slots Tab */}
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
                    semester: '',
                    slot: '',
                    subject: '',
                    classroom: '',
                    capacity: '',
                    invigilatorsNeeded: ''
                  });
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Add New Slot
              </button>
            </div>

            {/* Add/Edit Slot Form */}
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
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        name="date"
                        value={slotForm.date}
                        onChange={handleSlotFormChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Time Slot *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        name="time"
                        value={slotForm.time}
                        onChange={handleSlotFormChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      >
                        <option value="">Select Time</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Semester *
                    </label>
                    <select
                      name="semester"
                      value={slotForm.semester}
                      onChange={handleSlotFormChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    >
                      <option value="">Select Semester</option>
                      {semesters.map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Slot Number *
                    </label>
                    <select
                      name="slot"
                      value={slotForm.slot}
                      onChange={handleSlotFormChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    >
                      <option value="">Select Slot</option>
                      {slotNumbers.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Subject *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="subject"
                        value={slotForm.subject}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., Data Structures"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Classroom *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="classroom"
                        value={slotForm.classroom}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., Hall A"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Classroom Capacity *
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={slotForm.capacity}
                      onChange={handleSlotFormChange}
                      placeholder="e.g., 60"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Invigilators Needed *
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        name="invigilatorsNeeded"
                        value={slotForm.invigilatorsNeeded}
                        onChange={handleSlotFormChange}
                        placeholder="e.g., 3"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
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
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                  >
                    <Save className="w-5 h-5" />
                    {editingSlot ? 'Update Slot' : 'Add Slot'}
                  </button>
                </div>
              </div>
            )}

            {/* Slots List */}
            <div className="grid gap-6">
              {slots.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No exam slots added yet</p>
                  <p className="text-slate-400 text-sm">Click "Add New Slot" to create your first exam slot</p>
                </div>
              ) : (
                slots.map((slot) => (
                  <div key={slot.id} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{slot.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
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
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{slot.date}</span>
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
                          {slot.assignedInvigilators.map(facultyId => {
                            const faculty = facultyData.find(f => f.id === facultyId);
                            return faculty ? (
                              <span key={facultyId} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                                {faculty.name}
                              </span>
                            ) : null;
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

        {/* Duty Assignments Tab */}
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
                  <div key={slot.id} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">{slot.subject}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-slate-600">
                            <span className="font-semibold">Date:</span> {slot.date}
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
                          {slot.assignedInvigilators?.map(facultyId => {
                            const faculty = facultyData.find(f => f.id === facultyId);
                            return faculty ? (
                              <div key={facultyId} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {faculty.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{faculty.name}</p>
                                  <p className="text-xs text-slate-500">{faculty.designation}</p>
                                </div>
                              </div>
                            ) : null;
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
