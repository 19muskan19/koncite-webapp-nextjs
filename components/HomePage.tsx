import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, Zap, Shield, FileText, Users, ClipboardList, Sparkles, Search, MessageSquare, FileCheck, TrendingUp, Package, BarChart, Download, Bot, Lightbulb, FileBarChart, FileSearch, ClipboardCheck, Warehouse, FolderOpen, UserCog } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';
import Footer from './Footer';
import ContactModal from './ContactModal';

interface HomePageProps {
  onLoginClick: () => void;
  onBookDemo: () => void;
  onNavigateToAbout?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLoginClick, onBookDemo, onNavigateToAbout }) => {
  const { isDark } = useTheme();
  const [showContactModal, setShowContactModal] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const [aboutVisible, setAboutVisible] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);
  const [whatWeEnableVisible, setWhatWeEnableVisible] = useState(false);
  const whatWeEnableRef = useRef<HTMLDivElement>(null);
  const [dailyWorkVisible, setDailyWorkVisible] = useState(false);
  const dailyWorkRef = useRef<HTMLDivElement>(null);
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const [documentVisible, setDocumentVisible] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);
  const [labourVisible, setLabourVisible] = useState(false);
  const labourRef = useRef<HTMLDivElement>(null);
  const [reportsVisible, setReportsVisible] = useState(false);
  const reportsRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    // If trying to scroll to contact, open modal instead
    if (id === 'contact') {
      setShowContactModal(true);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getPlayStoreUrl = () => {
    // Check if user is on Android device
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // Use market:// protocol to directly open Play Store app
      return 'market://details?id=com.koncite';
    }
    // For non-Android devices, use web URL
    return 'https://play.google.com/store/apps/details?id=com.koncite&pcampaignid=web_share';
  };

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Small delay to ensure smooth animation trigger
            setTimeout(() => {
              setFeaturesVisible(true);
            }, 100);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '0px 0px -100px 0px' // Trigger when element is 100px from bottom of viewport
      }
    );

    const currentRef = featuresRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // Intersection Observer for about section animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setAboutVisible(true);
            }, 100);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    const currentRef = aboutRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // Intersection Observer for What We Enable section animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setWhatWeEnableVisible(true);
            }, 100);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    const currentRef = whatWeEnableRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // Intersection Observer for feature sections (Daily Work, Inventory, Document, Labour, Reports)
  useEffect(() => {
    const observers: { [key: string]: IntersectionObserver } = {};
    const refs = {
      dailyWork: { ref: dailyWorkRef, setter: setDailyWorkVisible },
      inventory: { ref: inventoryRef, setter: setInventoryVisible },
      document: { ref: documentRef, setter: setDocumentVisible },
      labour: { ref: labourRef, setter: setLabourVisible },
      reports: { ref: reportsRef, setter: setReportsVisible },
      cta: { ref: ctaRef, setter: setCtaVisible }
    };

    Object.entries(refs).forEach(([key, { ref, setter }]) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setter(true);
              }, 100);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -100px 0px'
        }
      );

      observers[key] = observer;
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      Object.entries(refs).forEach(([key, { ref }]) => {
        if (ref.current && observers[key]) {
          observers[key].unobserve(ref.current);
        }
      });
    };
  }, []);

  // Theme-aware classes
  const bgClass = isDark ? 'theme-dark' : 'theme-light';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const sectionBg = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const sectionBgAlt = isDark ? 'bg-[#0a0a0a]' : 'bg-[#faf9f6]'; // Cream/off-white for light theme
  const sectionBgCream = isDark ? 'bg-[#0a0a0a]' : 'bg-[#fefcf8]'; // Warm off-white for light theme

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRightScale {
          from {
            opacity: 0;
            transform: translateX(50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes slideInLeftRotate {
          from {
            opacity: 0;
            transform: translateX(-50px) rotate(-5deg);
          }
          to {
            opacity: 1;
            transform: translateX(0) rotate(0deg);
          }
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(50px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05) translateY(-10px);
          }
          70% {
            opacity: 1;
            transform: scale(0.9) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideArrow {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(4px);
          }
        }
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className={`min-h-screen flex flex-col transition-colors duration-500 ${bgClass}`}>
        <Navbar 
        onLoginClick={onLoginClick}
        onNavigateToAbout={onNavigateToAbout}
        scrollToSection={scrollToSection}
        onContactClick={() => setShowContactModal(true)}
      />

      <main className="flex-1">
        {/* Hero Section - Build Smarter with Koncite */}
        <section className={`py-24 px-4 sm:px-6 lg:px-8 ${sectionBgCream}`}>
          <div className="max-w-5xl mx-auto text-center">
            {/* AI-Powered Badge */}
            <div
              // onClick={() => scrollToSection('ai-features')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0a0a0a] mb-8 hover:border-[#C2D642] hover:shadow-md transition-all "
            >
              <div className="w-2 h-2 rounded-full bg-[#C2D642]"></div>
              <span className={`text-sm font-semibold ${isDark ? textSecondary : 'text-[#C2D642]'} hover:text-[#C2D642] transition-colors`}>AI-Powered Construction Management</span>
            </div>

            {/* Main Heading */}
            <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold ${textPrimary} mb-6 leading-tight`}>
              <span className="inline-block opacity-0 animate-[fadeInUp_1s_ease-out_0.2s_forwards]">Build Smarter with</span>
              <span className="inline-block opacity-0 animate-[slideInRight_0.8s_ease-out_0.5s_forwards] ml-2 md:ml-3">K</span>
              <span className="text-[#C2D642] inline-block opacity-0 animate-[bounceIn_0.8s_ease-out_0.7s_forwards]">O</span>
              <span className="inline-block opacity-0 animate-[slideInLeft_0.8s_ease-out_0.9s_forwards]">NCITE</span>
            </h1>

            {/* Tagline */}
            <p className={`text-xl md:text-2xl ${textSecondary} mb-10 max-w-3xl mx-auto leading-relaxed`}>
              Streamline construction projects using AI-driven document intelligence, real-time progress reports, smart inventory, and labour tracking </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onLoginClick}
                className="px-8 py-4 border-2 border-[#C2D642] bg-[#C2D642] text-white rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 opacity-0 animate-[fadeInUp_0.8s_ease-out_1.2s_forwards] hover:scale-105 active:scale-95 group"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:animate-[slideArrow_0.6s_ease-in-out_infinite]" />
              </button>
              {/* <button
                onClick={onLoginClick}
                className={`px-8 py-4 ${isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'} border-2 rounded-lg font-semibold text-lg transition-all flex items-center gap-2`}
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </button> */}
              <a
                href={getPlayStoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold text-lg transition-all flex items-center gap-2 opacity-0 animate-[fadeInUp_0.8s_ease-out_1.4s_forwards] hover:scale-105 active:scale-95"
              >
                <Download className="w-5 h-5 animate-bounce" />
                Download App
              </a>
            </div>
          </div>
        </section>

        {/* Features Header */}
        <section id="features" className={`py-12 md:py-16 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div id="ai-features" className="scroll-mt-20"></div>
          <div className="max-w-7xl mx-auto" ref={featuresRef}>
            <div className="text-center mb-6 md:mb-8">
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-black ${textPrimary} mb-3`}>
                Everything you need to manage construction
              </h2>
              <p className={`text-lg md:text-xl ${textSecondary} font-normal max-w-4xl mx-auto mb-6 md:mb-8`}>
                AI-powered assistants that simplify site data entries, reporting and data access.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">

              {[

                { icon: Bot, title: 'AI Agents', desc: 'Punch Instant daily progress, & inventory not in Hrs just in Minutes using natural language or voice commands' },
                { icon: Lightbulb, title: 'Smart recommendations & search', desc: 'Based on project context' },
                { icon: FileBarChart, title: 'AI-assisted information & report generation ', desc: 'Get quick insights on work progress, inventory, and pending work' },
                { icon: FileSearch, title: 'AI Document Upload & Search ', desc: 'Upload and search specific document, images or specific content' }

              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-6 rounded-xl border ${borderClass} ${cardClass} hover:shadow-2xl hover:scale-105 hover:-translate-y-2 hover:border-[#C2D642]/50 transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                  style={{ 
                    opacity: featuresVisible ? 1 : 0,
                    transform: featuresVisible ? 'translateY(0)' : 'translateY(40px)',
                    transition: featuresVisible ? `opacity 1s ease-out ${idx * 250 + 200}ms, transform 1s ease-out ${idx * 250 + 200}ms` : 'none'
                  }}
                >
                  {/* Hover background effect */}
                  <div className={`absolute inset-0 ${isDark ? 'bg-[#C2D642]/5' : 'bg-[#C2D642]/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`w-10 h-10 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#C2D642]/40 group-hover:scale-110 transition-all duration-300 group-hover:rotate-6`}>
                      <item.icon className="w-5 h-5 text-[#C2D642] group-hover:scale-125 transition-transform duration-300" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${textPrimary} group-hover:text-[#C2D642] transition-colors duration-300`}>{item.title}</h3>
                    <p className={`text-sm ${textSecondary} group-hover:text-opacity-90 transition-opacity duration-300`}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* Daily Work Progress */}
        <section id="daily-work-progress" className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto" ref={dailyWorkRef}>
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              <div style={{
                opacity: dailyWorkVisible ? 1 : 0,
                transform: dailyWorkVisible ? 'translateX(0)' : 'translateX(-50px)',
                transition: dailyWorkVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <ClipboardCheck className="w-8 h-8 text-[#C2D642]" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black ${textPrimary}`}>
                    Daily Work Progress
                  </h2>
                </div>
                <ul className={`space-y-4 mb-8`}>
                  {[
                    'Log activities, materials, labour, and machinery used',
                    'Record safety issues and site hindrances',
                    'Capture site photos and notes from mobile',
                    'Auto-generate DPRs with cumulative & pending work'
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      style={{
                        opacity: dailyWorkVisible ? 1 : 0,
                        transform: dailyWorkVisible ? 'translateX(0)' : 'translateX(-20px)',
                        transition: dailyWorkVisible ? `opacity 0.6s ease-out ${0.5 + idx * 0.15}s, transform 0.6s ease-out ${0.5 + idx * 0.15}s` : 'none'
                      }}
                    >
                      <Check className="w-6 h-6 text-[#C2D642] flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onLoginClick}
                  className="px-6 py-3 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Daily Work Progress
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative" style={{
                opacity: dailyWorkVisible ? 1 : 0,
                transform: dailyWorkVisible ? 'translateX(0)' : 'translateX(50px)',
                transition: dailyWorkVisible ? 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s' : 'none'
              }}>
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-4">
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                      <ClipboardList className="w-5 h-5 text-[#C2D642]" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} rounded w-3/4 mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded w-1/2`}></div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/5'} rounded-lg`}>
                      <ClipboardList className="w-5 h-5 text-[#C2D642]" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-[#C2D642]/60' : 'bg-[#C2D642]/30'} rounded w-full mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded w-2/3`}></div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                      <ClipboardList className="w-5 h-5 text-[#C2D642]" />
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

        {/* Inventory & Materials Management */}
        <section id="inventory-management" className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 ${sectionBgCream}`}>
          <div className="max-w-7xl mx-auto" ref={inventoryRef}>
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1" style={{
                opacity: inventoryVisible ? 1 : 0,
                transform: inventoryVisible ? 'translateX(0)' : 'translateX(-50px)',
                transition: inventoryVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
              }}>
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                        <div className={`h-8 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded mb-2`}></div>
                        <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-3/4`}></div>
                      </div>
                      <div className={`p-4 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/5'} rounded-lg`}>
                        <div className={`h-8 ${isDark ? 'bg-[#C2D642]/60' : 'bg-[#C2D642]/30'} rounded mb-2`}></div>
                        <div className={`h-4 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded w-2/3`}></div>
                      </div>
                    </div>
                    <div className={`h-32 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}></div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2" style={{
                opacity: inventoryVisible ? 1 : 0,
                transform: inventoryVisible ? 'translateX(0)' : 'translateX(50px)',
                transition: inventoryVisible ? 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s' : 'none'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <Warehouse className="w-8 h-8 text-[#C2D642]" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black ${textPrimary}`}>
                    Inventory & Materials Management
                  </h2>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Track material inward, outward, and consumption',
                    'Raise indents and purchase requests digitally',
                    'View real-time stock status',
                    'Reduce wastage and pilferage'
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      style={{
                        opacity: inventoryVisible ? 1 : 0,
                        transform: inventoryVisible ? 'translateX(0)' : 'translateX(-20px)',
                        transition: inventoryVisible ? `opacity 0.6s ease-out ${0.5 + idx * 0.15}s, transform 0.6s ease-out ${0.5 + idx * 0.15}s` : 'none'
                      }}
                    >
                      <Check className="w-6 h-6 text-[#C2D642] flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onLoginClick}
                  className="px-6 py-3 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Inventory & Materials Management
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Document Management */}
        <section id="document-management" className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto" ref={documentRef}>
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              <div style={{
                opacity: documentVisible ? 1 : 0,
                transform: documentVisible ? 'translateX(0)' : 'translateX(-50px)',
                transition: documentVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <FolderOpen className="w-8 h-8 text-[#C2D642]" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black ${textPrimary}`}>
                    Document Management
                  </h2>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Central repository for all project documents',
                    'AI-based classification and smart tagging',
                    'Centralized project image gallery',
                    'AI-assisted search across documents and images'
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      style={{
                        opacity: documentVisible ? 1 : 0,
                        transform: documentVisible ? 'translateX(0)' : 'translateX(-20px)',
                        transition: documentVisible ? `opacity 0.6s ease-out ${0.5 + idx * 0.15}s, transform 0.6s ease-out ${0.5 + idx * 0.15}s` : 'none'
                      }}
                    >
                      <Check className="w-6 h-6 text-[#C2D642] flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onLoginClick}
                  className="px-6 py-3 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Document Management
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative" style={{
                opacity: documentVisible ? 1 : 0,
                transform: documentVisible ? 'translateX(0)' : 'translateX(50px)',
                transition: documentVisible ? 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s' : 'none'
              }}>
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-4">
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                      <FileText className="w-5 h-5 text-[#C2D642]" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} rounded w-3/4 mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded w-1/2`}></div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/5'} rounded-lg`}>
                      <FileText className="w-5 h-5 text-[#C2D642]" />
                      <div className="flex-1">
                        <div className={`h-3 ${isDark ? 'bg-[#C2D642]/60' : 'bg-[#C2D642]/30'} rounded w-full mb-1`}></div>
                        <div className={`h-2 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded w-2/3`}></div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                      <FileText className="w-5 h-5 text-[#C2D642]" />
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
        <section id="labour-management" className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 ${sectionBgCream}`}>
          <div className="max-w-7xl mx-auto" ref={labourRef}>
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1" style={{
                opacity: labourVisible ? 1 : 0,
                transform: labourVisible ? 'translateX(0)' : 'translateX(-50px)',
                transition: labourVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
              }}>
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}>
                        <div className={`h-8 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded mb-2`}></div>
                        <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-3/4`}></div>
                      </div>
                      <div className={`p-4 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/5'} rounded-lg`}>
                        <div className={`h-8 ${isDark ? 'bg-[#C2D642]/60' : 'bg-[#C2D642]/30'} rounded mb-2`}></div>
                        <div className={`h-4 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded w-2/3`}></div>
                      </div>
                    </div>
                    <div className={`h-32 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-lg`}></div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2" style={{
                opacity: labourVisible ? 1 : 0,
                transform: labourVisible ? 'translateX(0)' : 'translateX(50px)',
                transition: labourVisible ? 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s' : 'none'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <UserCog className="w-8 h-8 text-[#C2D642]" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black ${textPrimary}`}>
                    Labour Management
                  </h2>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Punch attendance for staff and site labour',
                    'Track contractor labour separately',
                    'Manage labour rates and working logs',
                    'Make contractor labour payments'
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      style={{
                        opacity: labourVisible ? 1 : 0,
                        transform: labourVisible ? 'translateX(0)' : 'translateX(-20px)',
                        transition: labourVisible ? `opacity 0.6s ease-out ${0.5 + idx * 0.15}s, transform 0.6s ease-out ${0.5 + idx * 0.15}s` : 'none'
                      }}
                    >
                      <Check className="w-6 h-6 text-[#C2D642] flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onLoginClick}
                  className="px-6 py-3 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Labour Management
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Reports & Dashboards */}
        <section id="reports-dashboards" className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto" ref={reportsRef}>
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              <div style={{
                opacity: reportsVisible ? 1 : 0,
                transform: reportsVisible ? 'translateX(0)' : 'translateX(-50px)',
                transition: reportsVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'}`}>
                    <BarChart className="w-8 h-8 text-[#C2D642]" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black ${textPrimary}`}>
                    Reports & Dashboards
                  </h2>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Real-time dashboards for progress, inventory, and labour',
                    'One-click standardized reports',
                    'Track overall project health',
                    'Ask AI for project insights & reports'
                  ].map((item, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-3"
                      style={{
                        opacity: reportsVisible ? 1 : 0,
                        transform: reportsVisible ? 'translateX(0)' : 'translateX(-20px)',
                        transition: reportsVisible ? `opacity 0.6s ease-out ${0.5 + idx * 0.15}s, transform 0.6s ease-out ${0.5 + idx * 0.15}s` : 'none'
                      }}
                    >
                      <Check className="w-6 h-6 text-[#C2D642] flex-shrink-0 mt-0.5" />
                      <span className={textSecondary}>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onLoginClick}
                  className="px-6 py-3 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  Explore Reports & Dashboards
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative" style={{
                opacity: reportsVisible ? 1 : 0,
                transform: reportsVisible ? 'translateX(0)' : 'translateX(50px)',
                transition: reportsVisible ? 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s' : 'none'
              }}>
                <div className={`${cardClass} rounded-xl p-8 shadow-xl border ${borderClass}`}>
                  <div className="space-y-3">
                    <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-full`}></div>
                    <div className={`h-4 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/20'} rounded w-3/4`}></div>
                    <div className={`h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded w-5/6`}></div>
                    <div className="mt-6 space-y-2">
                      <div className={`h-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded w-full`}></div>
                      <div className={`h-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded w-4/5`}></div>
                      <div className={`h-3 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/10'} rounded w-3/4`}></div>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      <div className={`h-16 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded`}></div>
                      <div className={`h-16 ${isDark ? 'bg-[#C2D642]/70' : 'bg-[#C2D642]/5'} rounded`}></div>
                      <div className={`h-16 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Koncite */}
        <section id="about" className={`py-12 md:py-20 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12 md:mb-16">
              <h2 className={`text-4xl md:text-5xl lg:text-6xl font-black ${textPrimary} mb-4`}>
                About Koncite
              </h2>
              <div className="w-24 h-1 bg-[#C2D642] mx-auto mb-2"></div>
             
            </div>

            {/* Image and Content Side by Side */}
            <div className="max-w-6xl mx-auto mb-12 md:mb-16" ref={aboutRef}>
              <div className="grid lg:grid-cols-5 gap-8 md:gap-12 lg:gap-16 items-stretch">
                {/* Image - Left */}
                <div 
                  className="lg:col-span-2 relative h-full" 
                  style={{ 
                    opacity: aboutVisible ? 1 : 0,
                    transform: aboutVisible ? 'translateX(0)' : 'translateX(-50px)',
                    transition: aboutVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
                  }}
                >
                  <div className={`${cardClass} rounded-2xl overflow-hidden border-2 ${borderClass} shadow-2xl hover:shadow-3xl transition-shadow duration-300 w-full h-full`}>
                    <img
                      src="/about/image.png"
                      alt="Koncite platform simplifying construction workflows"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Content - Right */}
                <div 
                  className="lg:col-span-3 flex justify-center h-full" 
                  style={{ 
                    opacity: aboutVisible ? 1 : 0,
                    transform: aboutVisible ? 'translateX(0)' : 'translateX(50px)',
                    transition: aboutVisible ? 'opacity 0.8s ease-out 0.6s, transform 0.8s ease-out 0.6s' : 'none'
                  }}
                >
                  <div className={`${cardClass} p-6 md:p-8 lg:p-10 rounded-2xl border ${borderClass} w-full h-full flex flex-col justify-center`}>
                    <h3 className={`text-2xl md:text-3xl lg:text-4xl font-bold ${textPrimary} mb-6 text-center`}>
                      Built for the Future of Construction
                    </h3>
                    <div className="space-y-4 md:space-y-5">
                      <p className={`text-base md:text-lg ${textSecondary} leading-relaxed text-center`}>
                        Koncite brings practical, modern technology to construction, helping teams manage complex projects and multiple sites with ease.
                      </p>
                      <p className={`text-base md:text-lg ${textSecondary} leading-relaxed text-center`}>
                        With over 15 years of experience in technology adoption on construction sites, and as industry insiders, we understand real pain points and digitize on-site operations without disrupting workflows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What We Enable Section */}
            <div className="max-w-5xl mx-auto" ref={whatWeEnableRef}>
              <div className="text-center mb-10 md:mb-12">
                <h3 className={`text-3xl md:text-4xl font-bold ${textPrimary} mb-3`}>
                  What We Enable
                </h3>
                <div className="w-20 h-1 bg-[#C2D642] mx-auto"></div>
              </div>
              <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                {[
                  {
                    text: 'Faster, easier tech adoption with minimal training',
                    icon: Zap
                  },
                  {
                    text: 'Workflows users can easily relate to',
                    icon: TrendingUp
                  },
                  {
                    text: 'Real-time visibility across projects',
                    icon: Shield
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`${cardClass} p-6 md:p-8 rounded-xl border-2 border-[#C2D642]/20 hover:border-[#C2D642]/40 ${borderClass} transition-all duration-300 hover:shadow-lg group text-center`}
                    style={{
                      opacity: whatWeEnableVisible ? 1 : 0,
                      transform: whatWeEnableVisible ? 'translateY(0)' : 'translateY(50px)',
                      transition: whatWeEnableVisible ? `opacity 0.8s ease-out ${idx * 200 + 300}ms, transform 0.8s ease-out ${idx * 200 + 300}ms` : 'none'
                    }}
                  >
                    <div className={`w-14 h-14 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#C2D642]/30 transition-colors duration-300`}>
                      <item.icon className="w-7 h-7 text-[#C2D642]" />
                    </div>
                    <p className={`text-base md:text-lg font-medium ${textPrimary} leading-relaxed`}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* Pricing */}
        <section id="pricing" className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 ${sectionBgCream}`}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
              Plans and Pricing 
              </h2>
              <p className={`text-lg ${textSecondary}`}>
                Choose the plan that fits your team size and needs
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              {[
                { name: 'Starter', price: '$99', features: ['Up to 5 users', 'Document management', 'Basic reporting', 'Email support'], popular: false },
                { name: 'Professional', price: '$299', features: ['Up to 25 users', 'All features included', 'AI-powered tools', 'Priority support', 'Advanced analytics'], popular: true },
                { name: 'Enterprise', price: 'Custom', features: ['Unlimited users', 'Custom integrations', 'Dedicated support', 'Advanced security', 'Custom training'], popular: false }
              ].map((plan, idx) => (
                <div 
                  key={idx} 
                  className={`p-8 rounded-xl border ${plan.popular ? 'border-2 border-[#C2D642]' : borderClass} ${plan.popular ? (isDark ? 'bg-[#C2D642]/10' : 'bg-[#C2D642]/5') : cardClass} hover:shadow-2xl hover:scale-105 hover:-translate-y-2 transition-all duration-300 cursor-pointer group relative opacity-0 animate-[scaleIn_0.6s_ease-out_forwards] ${plan.popular ? 'hover:border-[#C2D642] hover:ring-2 hover:ring-[#C2D642]/20' : 'hover:border-[#C2D642]'}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {plan.popular && (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-[#C2D642] text-white text-xs font-bold rounded-full">POPULAR</span>
                  )}
                  <h3 className={`text-2xl font-bold mb-2 ${textPrimary} group-hover:text-[#C2D642] transition-colors duration-300`}>{plan.name}</h3>
                  <p className="text-3xl font-black mb-4 text-[#C2D642] group-hover:scale-110 transition-transform duration-300 inline-block">
                    {plan.price}
                    {plan.price !== 'Custom' && <span className={`text-lg ${textSecondary} font-normal`}>/mo</span>}
                  </p>
                  <ul className={`space-y-3 mb-6 ${textSecondary}`}>
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#C2D642] flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={plan.name === 'Enterprise' ? () => setShowContactModal(true) : onLoginClick}
                    className={`w-full px-4 py-2 border-2 border-[#C2D642] hover:bg-[#C2D642] ${plan.popular ? 'bg-[#C2D642] text-white' : 'text-[#C2D642] hover:text-white'} rounded-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg group-hover:shadow-xl`}
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* Ready to Transform CTA */}
        <section className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 'bg-[#0a0a0a]' }`}>
          <div className="max-w-5xl mx-auto" ref={ctaRef}>
            <div className={`${isDark ? 'bg-[#0a0a0a]' : 'bg-white'} rounded-2xl p-8 md:p-12 lg:p-16 shadow-2xl`}>
              <div className="text-center max-w-3xl mx-auto">
                <h2 className={`text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black ${isDark ? 'text-white' : 'text-slate-900'} mb-4 md:mb-6 leading-tight`}>
                  Ready to transform your construction projects?
                </h2>
                <p className={`text-base md:text-lg lg:text-xl ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-8 md:mb-10 leading-relaxed`}>
                  Join hundreds of construction companies already using Koncite to streamline their operations and deliver projects on time.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={onLoginClick}
                    className="px-8 py-4 border-2 border-[#C2D642] bg-[#C2D642] text-[#C2D642] text-white rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 group"
                    style={{
                      opacity: ctaVisible ? 1 : 0,
                      transform: ctaVisible ? 'translateY(0)' : 'translateY(30px)',
                      transition: ctaVisible ? 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' : 'none'
                    }}
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 group-hover:animate-[slideArrow_0.6s_ease-in-out_infinite]" />
                  </button>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="px-8 py-4 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold text-lg transition-all hover:scale-105 active:scale-95"
                    style={{
                      opacity: ctaVisible ? 1 : 0,
                      transform: ctaVisible ? 'translateY(0)' : 'translateY(30px)',
                      transition: ctaVisible ? 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s' : 'none'
                    }}
                  >
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer scrollToSection={scrollToSection} onContactClick={() => setShowContactModal(true)} />
      </div>
      
      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)} 
      />
    </>
  );
};

export default HomePage;
