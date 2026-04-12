import React, { useState } from 'react';
import { Brain, Mail, Lock, User, Calendar, BookOpen, ArrowRight, AlertCircle, CheckCircle, Hash, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    email: '',
    dateOfBirth: '',
    department: 'Computer Science & Engineering',
    semester: '',
    division: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const divisions = ['A', 'B', 'C', 'D'];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.rollNumber.trim()) newErrors.rollNumber = 'Roll number is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    else if (!formData.email.endsWith('@vidyaacademy.ac.in')) newErrors.email = 'Use your Vidya Academy email (@vidyaacademy.ac.in)';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.semester) newErrors.semester = 'Semester is required';
    if (!formData.division) newErrors.division = 'Division is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error(error);
      alert('Server error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-12 pr-4 py-4 rounded-xl border outline-none transition-all text-slate-800 ${errors[field] ? 'border-red-400' : ''}`;

  const inputStyle = (field) => ({
    backgroundColor: '#fdf8f8',
    borderColor: errors[field] ? '#f87171' : '#e0c0c0'
  });

  const handleFocus = (e) => { e.target.style.boxShadow = '0 0 0 3px rgba(128,0,0,0.15)'; };
  const handleBlur  = (e) => { e.target.style.boxShadow = 'none'; };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ backgroundColor: '#fdf0f0' }}>
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow-md transition-all border"
          style={{ backgroundColor: 'white', borderColor: '#e0b0b0', color: '#800000' }}
        >
          <Home className="w-4 h-4" /> Home
        </button>
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center border" style={{ borderColor: '#f0d0d0' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(to bottom right, #800000, #a00000)' }}>
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Registration Successful!</h2>
          <p className="text-slate-600 mb-6">Your account has been created. Redirecting to login...</p>
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#f0c0c0', borderTopColor: '#800000' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 relative" style={{ backgroundColor: '#fdf0f0' }}>

      {/* Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(128,0,0,0.1)' }}></div>
        <div className="absolute top-40 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(160,0,0,0.08)', animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(100,0,0,0.07)', animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">

        {/* Home button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow-md transition-all border"
          style={{ backgroundColor: 'white', borderColor: '#e0b0b0', color: '#800000' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff5f5'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          <Home className="w-4 h-4" /> Home
        </button>

        {/* Header */}
        <div className="text-center mb-8 mt-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(to bottom right, #800000, #a00000)' }}>
              <Brain className="w-9 h-9 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #800000, #a00000)' }}>InExa</h1>
              <p className="text-sm text-slate-500 font-medium">Exam Management System</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Student Registration</h2>
          <p className="text-slate-500">Create your account to access the exam management system</p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl shadow-2xl p-8 md:p-12 border" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#f0d0d0' }}>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                  placeholder="Enter your full name" className={inputClass('fullName')} style={inputStyle('fullName')}
                  onFocus={handleFocus} onBlur={handleBlur} />
              </div>
              {errors.fullName && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.fullName}</p>}
            </div>

            {/* Roll Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Roll Number *</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleInputChange}
                  placeholder="Enter your roll number" className={inputClass('rollNumber')} style={inputStyle('rollNumber')}
                  onFocus={handleFocus} onBlur={handleBlur} />
              </div>
              {errors.rollNumber && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.rollNumber}</p>}
            </div>

            {/* Email */}
            <div className="grid md:grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    placeholder="your.email@vidyaacademy.ac.in" className={inputClass('email')} style={inputStyle('email')}
                    onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email}</p>}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth *</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange}
                  className={inputClass('dateOfBirth')} style={inputStyle('dateOfBirth')}
                  onFocus={handleFocus} onBlur={handleBlur} />
              </div>
              {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.dateOfBirth}</p>}
            </div>

            {/* Department + Semester + Division */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department *</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select name="department" value={formData.department} onChange={handleInputChange} disabled
                    className="w-full pl-12 pr-4 py-4 rounded-xl border outline-none text-slate-800 opacity-80 cursor-not-allowed"
                    style={{ backgroundColor: '#fdf8f8', borderColor: '#e0c0c0' }}>
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Semester *</label>
                <select name="semester" value={formData.semester} onChange={handleInputChange}
                  className="w-full px-4 py-4 rounded-xl border outline-none text-slate-800 transition-all"
                  style={{ backgroundColor: '#fdf8f8', borderColor: errors.semester ? '#f87171' : '#e0c0c0' }}
                  onFocus={handleFocus} onBlur={handleBlur}>
                  <option value="">Select Semester</option>
                  {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
                {errors.semester && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.semester}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Division *</label>
                <select name="division" value={formData.division} onChange={handleInputChange}
                  className="w-full px-4 py-4 rounded-xl border outline-none text-slate-800 transition-all"
                  style={{ backgroundColor: '#fdf8f8', borderColor: errors.division ? '#f87171' : '#e0c0c0' }}
                  onFocus={handleFocus} onBlur={handleBlur}>
                  <option value="">Select Division</option>
                  {divisions.map(d => <option key={d} value={d}>Division {d}</option>)}
                </select>
                {errors.division && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.division}</p>}
              </div>
            </div>

            {/* Password + Confirm */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                    placeholder="Create a password" className={inputClass('password')} style={inputStyle('password')}
                    onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                    placeholder="Confirm your password" className={inputClass('confirmPassword')} style={inputStyle('confirmPassword')}
                    onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(to right, #800000, #a00000)', boxShadow: '0 8px 24px rgba(128,0,0,0.3)' }}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Register <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <a href="/login" className="font-semibold transition-colors" style={{ color: '#800000' }}
                onMouseEnter={e => e.target.style.color = '#600000'}
                onMouseLeave={e => e.target.style.color = '#800000'}>
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
