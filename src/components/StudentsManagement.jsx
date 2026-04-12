import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Trash2, Mail, Hash, ArrowLeft } from 'lucide-react';

export default function StudentsManagement() {
const navigate = useNavigate();
const [students, setStudents] = useState([]);
useEffect(() => {
  const fetchStudents = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/students");
      const data = await response.json();

      if (response.ok) {
        setStudents(data); // assuming backend sends array
      } else {
        console.error("Failed to fetch students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  fetchStudents();
}, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const departments = Array.from(
    new Set(
      students
        .map((student) => student.department)
        .filter((department) => typeof department === 'string' && department.trim() !== '')
    )
  ).sort();
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

 const filteredStudents = students.filter((student) => {
  const query = searchQuery.toLowerCase();
  const fullName = (student.fullName ?? '').toString().toLowerCase();
  const rollNumber = (student.rollNumber ?? '').toString().toLowerCase();
  const email = (student.email ?? '').toString().toLowerCase();

  const matchesSearch = searchQuery
    ? fullName.includes(query) || rollNumber.includes(query) || email.includes(query)
    : true;

  const matchesDepartment = filterDepartment ? student.department === filterDepartment : true;
  const matchesSemester = filterSemester
    ? (student.semester ?? '').toString() === filterSemester
    : true;

  return matchesSearch && matchesDepartment && matchesSemester;
});

  const handleDeleteStudent = (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      setStudents(students.filter(s => s._id !== id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Students Management</h1>
          <p className="text-slate-600">Manage student records and information</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/AdminDashboard')} 
            className="flex items-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="w-12 h-12 bg-gradient-to-br from-[#800000] to-[#b02020] rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Total Students</h3>
          <p className="text-3xl font-bold text-slate-800">{students.length}</p>
        </div>


        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="w-12 h-12 bg-gradient-to-br from-[#901010] to-[#c03030] rounded-xl flex items-center justify-center mb-4">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">Semesters</h3>
          <p className="text-3xl font-bold text-slate-800">{semesters.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b]"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b]"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c0392b]"
            >
              <option value="">All Semesters</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-600">
          Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> students
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Roll Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Department</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#800000] to-[#b02020] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {student.rollNumber?.slice(-2)}
                      </div>
                      <span className="font-semibold text-slate-800">{student.rollNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{student.fullName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-[#ffe0e0] text-[#b02020] rounded-full text-xs font-semibold">
                      {student.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 text-[#800000] rounded-full text-xs font-semibold">
                      Sem {student.semester}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-3 h-3" />
                      {student.email}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                    
                      {/* <button className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button> */}
                      <button
                        onClick={() => handleDeleteStudent(student._id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
