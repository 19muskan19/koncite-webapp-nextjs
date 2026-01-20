import React, { useState } from 'react';
import { LogIn, ArrowRight, Check, Zap, Shield, Cloud, FileText, Users, ClipboardList, Sparkles, Search, MessageSquare, FileCheck, TrendingUp, Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HomePageProps {
  onLoginClick: () => void;
  onBookDemo: () => void;
  onNavigateToAbout?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick, onBookDemo, onNavigateToAbout }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  // Theme-aware classes
  const bgClass = isDark ? 'theme-dark' : 'theme-light';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const headerBg = isDark ? 'bg-slate-900/95' : 'bg-white/95';
  const sectionBg = isDark ? 'bg-slate-900' : 'bg-white';
  const sectionBgAlt = isDark ? 'bg-slate-950' : 'bg-slate-50';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${bgClass}`}>
      {/* Header / Navbar */}
      <header className={`sticky top-0 z-50 ${headerBg} backdrop-blur-sm border-b ${borderClass} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Koncite Logo" className="w-8 h-8 object-contain" />
              <span className={`font-black text-xl tracking-tight ${textPrimary}`}>Koncite</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('home')}
                className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                Home
              </button>
              {onNavigateToAbout && (
                <button 
                  onClick={onNavigateToAbout}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                >
                  About
                </button>
              )}
              <button 
                onClick={() => scrollToSection('features')}
                className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('resources')}
                className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                Resources
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                Contact Us
              </button>
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors border ${borderClass}`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button
                onClick={onLoginClick}
                className={`hidden sm:block text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                Log In
              </button>
              <button
                onClick={onBookDemo}
                className="hidden sm:block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Book a Demo
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 ${textSecondary} hover:text-indigo-400 transition-colors`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className={`md:hidden border-t ${borderClass} py-4`}>
              <nav className="flex flex-col gap-4">
                <button 
                  onClick={() => scrollToSection('home')}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                >
                  Home
                </button>
                {onNavigateToAbout && (
                  <button 
                    onClick={onNavigateToAbout}
                    className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                  >
                    About
                  </button>
                )}
                <button 
                  onClick={() => scrollToSection('features')}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection('resources')}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                >
                  Resources
                </button>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                >
                  Pricing
                </button>
                <button 
                  onClick={() => scrollToSection('contact')}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                >
                  Contact Us
                </button>
                <div className={`flex flex-col gap-2 pt-4 border-t ${borderClass}`}>
                  <button
                    onClick={onLoginClick}
                    className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                  >
                    Log In
                  </button>
                  <button
                    onClick={onBookDemo}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all w-full"
                  >
                    Book a Demo
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className={`py-20 lg:py-32 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-gradient-to-br from-slate-950 to-slate-900' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tight ${textPrimary} mb-6 leading-tight`}>
                  All-in-one construction management software built for speed, clarity, and control
                </h1>
                <p className={`text-xl ${textSecondary} mb-8 leading-relaxed`}>
                  Manage documents, labour, daily progress reports, and site operations effortlessly—powered by AI and designed for modern construction teams.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onBookDemo}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    See it in action
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onBookDemo}
                    className={`px-6 py-3 ${isDark ? 'bg-slate-800 text-white border-2 border-slate-700 hover:bg-slate-700' : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'} rounded-lg font-semibold transition-all flex items-center justify-center gap-2`}
                  >
                    Book a demo
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className={`${cardClass} rounded-2xl p-8 shadow-2xl border ${borderClass}`}>
                  <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
                    <div className="space-y-4">
                      <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-3/4`}></div>
                      <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-full`}></div>
                      <div className={`h-4 ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'} rounded w-2/3`}></div>
                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className={`h-20 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded`}></div>
                        <div className={`h-20 ${isDark ? 'bg-indigo-900' : 'bg-indigo-100'} rounded`}></div>
                        <div className={`h-20 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust / Social Proof Section */}
        <section className={`py-12 px-4 sm:px-6 lg:px-8 ${sectionBg} border-y ${borderClass}`}>
          <div className="max-w-7xl mx-auto">
            <p className={`text-center text-sm font-semibold ${textSecondary} mb-8`}>
              Trusted by growing construction teams
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`h-12 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-lg flex items-center justify-center`}>
                  <span className={`${textSecondary} font-bold text-xs`}>LOGO</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Made for Modern Construction */}
        <section id="features" className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                Made for modern construction teams
              </h2>
              <p className={`text-lg ${textSecondary} max-w-3xl mx-auto`}>
                Koncite is shaped by real-world construction workflows—not generic software assumptions. Every feature is built to reduce paperwork, improve coordination, and help teams focus on building—not chasing information.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className={`p-8 rounded-xl border ${borderClass} ${cardClass} hover:shadow-lg transition-shadow`}>
                <div className={`w-12 h-12 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg flex items-center justify-center mb-4`}>
                  <Zap className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${textPrimary}`}>Purpose-built for construction</h3>
                <p className={textSecondary}>
                  Built specifically for construction workflows, not adapted from generic project management tools.
                </p>
              </div>
              <div className={`p-8 rounded-xl border ${borderClass} ${cardClass} hover:shadow-lg transition-shadow`}>
                <div className={`w-12 h-12 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg flex items-center justify-center mb-4`}>
                  <TrendingUp className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${textPrimary}`}>Designed to move fast, anywhere</h3>
                <p className={textSecondary}>
                  Access your project data from any device, anywhere—office, site, or on the go.
                </p>
              </div>
              <div className={`p-8 rounded-xl border ${borderClass} ${cardClass} hover:shadow-lg transition-shadow`}>
                <div className={`w-12 h-12 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg flex items-center justify-center mb-4`}>
                  <Shield className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${textPrimary}`}>Simple, powerful, reliable</h3>
                <p className={textSecondary}>
                  Intuitive interface that doesn't require training, backed by enterprise-grade reliability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Document Management */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                  Document management that actually works on site
                </h2>
                <p className={`text-lg ${textSecondary} mb-8`}>
                  Upload, organize, share, and control access to your construction documents—all in one secure place.
                </p>
                <ul className={`space-y-4 mb-8`}>
                  {[
                    'Upload and organize drawings, contracts, and reports',
                    'Role-based access control',
                    'Powerful document search',
                    'Version tracking',
                    'Secure sharing'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onBookDemo}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Document Management
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-4">
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} rounded w-3/4 mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded w-1/2`}></div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'} rounded-lg`}>
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-indigo-800' : 'bg-indigo-300'} rounded w-full mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'} rounded w-2/3`}></div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} rounded w-5/6 mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded w-3/4`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Labour Management */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                        <div className={`h-8 ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'} rounded mb-2`}></div>
                        <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-3/4`}></div>
                      </div>
                      <div className={`p-4 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'} rounded-lg`}>
                        <div className={`h-8 ${isDark ? 'bg-indigo-800' : 'bg-indigo-300'} rounded mb-2`}></div>
                        <div className={`h-4 ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'} rounded w-2/3`}></div>
                      </div>
                    </div>
                    <div className={`h-32 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}></div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                  Complete labour management—from hiring to reporting
                </h2>
                <p className={`text-lg ${textSecondary} mb-8`}>
                  Manage labour rates, hiring, assignments, and generate accurate labour reports effortlessly.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    'Labour hiring and assignments',
                    'Manage labour rates and categories',
                    'Track labour across projects',
                    'Generate labour cost and performance reports'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onBookDemo}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Labour Management
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Progress Reports */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                  Create Daily Progress Reports in minutes—not hours
                </h2>
                <p className={`text-lg ${textSecondary} mb-8`}>
                  Select project, sub-project, activities, materials, labour, and staff to auto-generate structured DPRs within minutes.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    'Project and sub-project selection',
                    'Activities, materials, labour, and staff tracking',
                    'Auto-generated professional DPRs',
                    'Shareable report formats'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onBookDemo}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Daily Progress Reports
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-3">
                    <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-full`}></div>
                    <div className={`h-4 ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'} rounded w-3/4`}></div>
                    <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-5/6`}></div>
                    <div className="mt-6 space-y-2">
                      <div className={`h-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded w-full`}></div>
                      <div className={`h-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded w-4/5`}></div>
                      <div className={`h-3 ${isDark ? 'bg-indigo-900' : 'bg-indigo-100'} rounded w-3/4`}></div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <div className={`h-16 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded`}></div>
                      <div className={`h-16 ${isDark ? 'bg-indigo-900' : 'bg-indigo-50'} rounded`}></div>
                      <div className={`h-16 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Features */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                AI-powered tools built for construction workflows
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Search, title: 'AI Document Search', desc: 'Ask questions in plain language' },
                { icon: MessageSquare, title: 'AI Chat Assistant', desc: 'Instant project and document help' },
                { icon: FileCheck, title: 'AI-assisted report generation', desc: 'Automated professional reports' },
                { icon: Sparkles, title: 'Smart recommendations', desc: 'Based on project context' }
              ].map((item, idx) => (
                <div key={idx} className={`p-6 rounded-xl border ${borderClass} ${cardClass} hover:shadow-lg transition-shadow`}>
                  <div className={`w-10 h-10 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg flex items-center justify-center mb-4`}>
                    <item.icon className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>{item.title}</h3>
                  <p className={`text-sm ${textSecondary}`}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                Simple, transparent pricing
              </h2>
              <p className={`text-lg ${textSecondary}`}>
                Choose the plan that fits your team size and needs
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { name: 'Starter', price: '$99', features: ['Up to 5 users', 'Document management', 'Basic reporting', 'Email support'], popular: false },
                { name: 'Professional', price: '$299', features: ['Up to 25 users', 'All features included', 'AI-powered tools', 'Priority support', 'Advanced analytics'], popular: true },
                { name: 'Enterprise', price: 'Custom', features: ['Unlimited users', 'Custom integrations', 'Dedicated support', 'Advanced security', 'Custom training'], popular: false }
              ].map((plan, idx) => (
                <div key={idx} className={`p-8 rounded-xl border ${plan.popular ? 'border-2 border-indigo-600' : borderClass} ${plan.popular ? (isDark ? 'bg-indigo-900/20' : 'bg-indigo-50') : cardClass} hover:shadow-lg transition-shadow relative`}>
                  {plan.popular && (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">POPULAR</span>
                  )}
                  <h3 className={`text-2xl font-bold mb-2 ${textPrimary}`}>{plan.name}</h3>
                  <p className="text-3xl font-black mb-4 text-indigo-500">
                    {plan.price}
                    {plan.price !== 'Custom' && <span className={`text-lg ${textSecondary} font-normal`}>/mo</span>}
                  </p>
                  <ul className={`space-y-3 mb-6 ${textSecondary}`}>
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={plan.name === 'Enterprise' ? () => scrollToSection('contact') : onBookDemo}
                    className={`w-full px-4 py-2 ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : `border border-indigo-600 text-indigo-600 hover:${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50'}`} rounded-lg font-semibold transition-colors`}
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Foundations */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                Fast, secure, and reliable—by design
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: 'Lightning-fast performance', desc: 'Built for speed with optimized architecture and modern technology stack.' },
                { icon: Shield, title: 'Enterprise-grade security', desc: 'Your data is protected with industry-leading security measures and compliance standards.' },
                { icon: Cloud, title: 'Offline-ready workflows with sync', desc: 'Work seamlessly even without internet connection, with automatic sync when online.' }
              ].map((item, idx) => (
                <div key={idx} className={`p-8 rounded-xl border ${borderClass} ${cardClass} text-center`}>
                  <div className={`w-16 h-16 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${textPrimary}`}>{item.title}</h3>
                  <p className={textSecondary}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
          <div className="max-w-4xl mx-auto text-center">
            <div className={`${cardClass} rounded-2xl p-12 border ${borderClass}`}>
              <p className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-6 leading-relaxed`}>
                "Koncite transformed how we manage documents, labour, and daily reports. What used to take hours now takes minutes."
              </p>
              <p className={`text-lg ${textSecondary} font-semibold`}>
                Project Manager, Construction Company
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
                Get in touch
              </h2>
              <p className={`text-lg ${textSecondary}`}>
                Have questions? We'd love to hear from you.
              </p>
            </div>
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Name</label>
                  <input 
                    type="text" 
                    className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none`}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Email</label>
                  <input 
                    type="email" 
                    className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none`}
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Company</label>
                <input 
                  type="text" 
                  className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none`}
                  placeholder="Your company"
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Message</label>
                <textarea 
                  rows={4}
                  className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none`}
                  placeholder="Your message"
                />
              </div>
              <button 
                type="submit"
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                Send Message
              </button>
            </form>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-indigo-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Build smarter. Work faster. Stay in control.
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Modern construction needs modern tools. Koncite brings everything together in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onBookDemo}
                className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get a demo
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl border-2 border-white/20"
              >
                Talk to our team
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="resources" className={`bg-slate-900 ${isDark ? '' : 'bg-slate-800'} text-slate-300 mt-auto`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Koncite Logo" className="w-8 h-8 object-contain" />
                <span className="font-black text-lg tracking-tight text-white">Koncite</span>
              </div>
              <p className="text-sm text-slate-400">
                All-in-one construction management software built for speed, clarity, and control.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Features</h4>
              <ul className="space-y-2 text-sm">
                {['Document Management', 'Labour Management', 'Daily Progress Reports', 'AI Assistance'].map((item, idx) => (
                  <li key={idx}>
                    <button onClick={() => scrollToSection('features')} className="hover:text-indigo-400 transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-indigo-400 transition-colors">Pricing</button></li>
                <li><button className="hover:text-indigo-400 transition-colors">Case Studies</button></li>
                <li><button className="hover:text-indigo-400 transition-colors">Help Center</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-indigo-400 transition-colors">About Us</button></li>
                <li><button onClick={() => scrollToSection('contact')} className="hover:text-indigo-400 transition-colors">Contact</button></li>
                <li><button className="hover:text-indigo-400 transition-colors">Careers</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>© 2026 Koncite</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
