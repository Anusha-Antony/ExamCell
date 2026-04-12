import React, { useState, useEffect } from 'react';
import logo from '../inexa-logo.jpeg';
import {
  Calendar,
  Users,
  Shield,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  MapPin,
  BarChart3,
  Database,
  LogIn,
  UserPlus
} from 'lucide-react';

import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Calendar,
      title: "Intelligent Scheduling",
      description: "Genetic algorithm-based timetable generation with automated conflict detection and optimal resource allocation for seamless exam planning.",
      color: "from-[#800000] to-[#a00000]",
      stats: "99% conflict-free"
    },
    {
      icon: MapPin,
      title: "Smart Hall Allocation",
      description: "AI-powered hall and seating arrangement system ensuring optimal space utilization, collision-free allocation, and compliance with capacity constraints.",
      color: "from-[#800000] to-[#600000]",
      stats: "100% optimized"
    },
    {
      icon: Users,
      title: "Duty Assignment",
      description: "Fair and equitable distribution of invigilation duties using advanced optimization algorithms and workload balancing mechanisms.",
      color: "from-[#800000] to-[#9a0000]",
      stats: "Equal distribution"
    },
    {
      icon: Database,
      title: "Centralized Management",
      description: "Unified database system for managing students, faculty, examination halls, and schedules with instant updates and data synchronization.",
      color: "from-[#800000] to-[#700000]",
      stats: "Single source of truth"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive performance metrics, resource utilization reports, and predictive insights for data-driven decision making.",
      color: "from-[#800000] to-[#b00000]",
      stats: "Actionable insights"
    }
  ];

  const benefits = [
    { text: "Eliminates manual and paper-based processes", impact: "80% time saved" },
    { text: "Reduces errors in scheduling and allocation", impact: "95% accuracy" },
    { text: "Ensures fair distribution of invigilation duties", impact: "100% balanced" },
    { text: "Centralizes all examination operations", impact: "Single platform" },
    { text: "Increases transparency and accountability", impact: "Full visibility" },
    { text: "Real-time notifications and updates", impact: "Instant alerts" }
  ];


  return (
    <div id="top" className="min-h-screen" style={{ backgroundColor: '#fdf0f0' }}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-lg shadow-lg' : ''}`} style={{ backgroundColor: scrolled ? 'rgba(253,240,240,0.97)' : '#fdf0f0' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img src={logo} alt="InExa Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white animate-pulse" style={{ backgroundColor: '#c0392b' }}></div>
              </div>
              <div>
                <span className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #800000, #a00000)' }}>InExa</span>
                <p className="text-xs text-slate-500 -mt-1 font-medium">Exam Management System</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#top" className="text-slate-700 transition-colors font-medium hover:text-[#800000]">Home</a>
              <a href="#features" className="text-slate-700 transition-colors font-medium hover:text-[#800000]">Features</a>
              <a href="#benefits" className="text-slate-700 transition-colors font-medium hover:text-[#800000]">Benefits</a>
              <a href="#about" className="text-slate-700 transition-colors font-medium hover:text-[#800000]">About</a>

              <button
                onClick={() => navigate("/Login")}
                className="flex items-center gap-2 px-5 py-2 transition-colors font-medium"
                style={{ color: '#800000' }}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>

              <button
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                style={{ background: 'linear-gradient(to right, #800000, #a00000)', boxShadow: '0 10px 25px rgba(128,0,0,0.3)' }}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-slate-700" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-4 border-t pt-4">
              <a href="#top" className="block text-slate-700 transition-colors font-medium hover:text-[#800000]">Home</a>
              <a href="#features" className="block text-slate-700 transition-colors font-medium hover:text-[#800000]">Features</a>
              <a href="#benefits" className="block text-slate-700 transition-colors font-medium hover:text-[#800000]">Benefits</a>
              <a href="#about" className="block text-slate-700 transition-colors font-medium hover:text-[#800000]">About</a>
              <a href="#contact" className="block text-slate-700 transition-colors font-medium hover:text-[#800000]">Contact</a>
              <button
                className="w-full flex items-center justify-center gap-2 px-5 py-2 rounded-xl transition-colors font-medium border"
                style={{ color: '#800000', borderColor: '#c0a0a0', backgroundColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff0f0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl font-semibold"
                style={{ background: 'linear-gradient(to right, #800000, #a00000)' }}
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, #fdf0f0, #fce8e8, #fdf0f0)' }}></div>
          <div className="absolute top-20 left-10 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(128,0,0,0.15)' }}></div>
          <div className="absolute top-40 right-10 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(160,0,0,0.12)', animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(100,0,0,0.1)', animationDelay: '2s' }}></div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(to right, rgb(128 0 0) 1px, transparent 1px),
                             linear-gradient(to bottom, rgb(128 0 0) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full text-sm font-semibold mb-8 shadow-lg border" style={{ color: '#800000', borderColor: '#e0b0b0' }}>
              <Shield className="w-4 h-4" />
              <span>Designed for our Institution's Success</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #800000, #a00000)' }}>
                InExa
              </span>
              <br />
              <span className="text-slate-800 text-5xl md:text-6xl">AI-Enhanced Exam Cell</span>
              <br />
              <span className="text-slate-600 text-4xl md:text-5xl font-semibold">Management System</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto mb-12 leading-relaxed font-light">
              Streamline our institution's examination processes with intelligent automation, AI-powered monitoring, and comprehensive resource optimization.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center mb-16">
              <button
                onClick={() => navigate("/register")}
                className="group px-12 py-5 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(to right, #800000, #a00000)', boxShadow: '0 20px 40px rgba(128,0,0,0.35)' }}
              >
                Get Started
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>


          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-6 text-white" style={{ background: 'linear-gradient(to bottom right, #1a0000, #3a0000, #2a0000)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: 'rgba(128,0,0,0.3)', border: '1px solid rgba(200,80,80,0.3)', color: '#f0a0a0' }}>
              Why Choose InExa
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Transform our Institution's
              <span className="block mt-2" style={{ color: '#f08080' }}>Examination Management</span>
            </h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed" style={{ color: '#d0a0a0' }}>
              Experience complete automation and efficiency with our comprehensive solution designed specifically for educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="group p-8 rounded-xl border transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,80,80,0.4)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform shadow-lg" style={{ background: 'linear-gradient(to bottom right, #800000, #a00000)' }}>
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2 text-lg">{benefit.text}</p>
                    <p className="text-sm font-semibold" style={{ color: '#f08080' }}>{benefit.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: '#fff0f0', color: '#800000' }}>
              Powerful Capabilities
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #800000, #a00000)' }}>
                Comprehensive Features
              </span>
              <br />
              <span className="text-slate-800">for our Institution</span>
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto">
              Advanced algorithms and AI technology working together for seamless examination management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = activeFeature === index;
              return (
                <div
                  key={index}
                  className="group p-8 bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 transition-all duration-500"
                  style={{
                    borderColor: isActive ? '#800000' : '#e2e8f0',
                    boxShadow: isActive ? '0 25px 50px rgba(128,0,0,0.2)' : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)'
                  }}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl`}
                    style={{ background: 'linear-gradient(to bottom right, #800000, #a00000)' }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="mb-3">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: '#800000', backgroundColor: '#fff0f0' }}>
                      {feature.stats}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6" style={{ background: 'linear-gradient(to bottom right, #f9f9f9, #fff5f5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6" style={{ backgroundColor: '#fff0f0', color: '#800000' }}>
                About InExa
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
                Built Specifically for
                <span className="block bg-clip-text text-transparent mt-2" style={{ backgroundImage: 'linear-gradient(to right, #800000, #a00000)' }}>
                  Educational Excellence
                </span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                InExa is a comprehensive AI-enhanced examination management system developed to address the unique challenges faced by educational institutions in managing examinations efficiently.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Our platform combines cutting-edge artificial intelligence with practical examination management needs, ensuring our institution operates at peak efficiency while maintaining the highest standards of academic integrity.
              </p>
              <div className="space-y-4">
                {[
                  "Designed for institutional workflows",
                  "Scalable for any institution size",
                  "Secure and reliable infrastructure",
                  "Continuous updates and support"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, #800000, #a00000)' }}>
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-slate-700 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-2xl" style={{ background: 'linear-gradient(to bottom right, rgba(128,0,0,0.2), rgba(160,0,0,0.2))' }}></div>
              <div className="relative p-12 rounded-3xl shadow-2xl text-white" style={{ background: 'linear-gradient(to bottom right, #800000, #a00000)' }}>
                <h3 className="text-3xl font-bold mb-8">Key Capabilities</h3>
                <div className="space-y-6">
                  {[
                    { icon: Calendar, text: "Automated seating arrangement" },
                    { icon: MapPin, text: "Intelligent hall allocation" },
                    { icon: Users, text: "Fair duty distribution" },
                    { icon: BarChart3, text: "Real-time analytics" },
                    { icon: Shield, text: "Secure data management" }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-lg font-medium">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #800000, #600000, #900000)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Ready to Modernize our
            <br />Examination Management?
          </h2>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto" style={{ color: '#ffd0d0' }}>
            Join our institution in revolutionizing exam processes with InExa's intelligent automation platform
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => navigate("/register")}
              className="group px-12 py-5 bg-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              style={{ color: '#800000' }}
            >
              Get Started Now
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-6" style={{ backgroundColor: '#1a0000' }}>
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img src={logo} alt="InExa Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
            <div className="text-left">
              <span className="text-2xl font-bold text-white">InExa</span>
              <p className="text-xs text-[#f0d0d0]">Exam Management System</p>
            </div>
          </div>
          <p className="leading-relaxed max-w-lg mb-8" style={{ color: '#f0d0d0' }}>
            Empowering educational institutions with intelligent examination management solutions for a more efficient and transparent academic environment.
          </p>

          <div className="pt-8 border-t w-full max-w-3xl" style={{ borderColor: 'rgba(240, 208, 208, 0.2)' }}>
            <p style={{ color: '#e0b0b0' }}>&copy; 2026 InExa. Transforming examination management for educational institutions.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}