import React, { useState } from 'react';
import { ArrowRight, FileText, Users, ClipboardList, Sparkles, Check, Zap, Shield, TrendingUp, Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AboutPageProps {
  onBookDemo: () => void;
  onContact: () => void;
  onNavigateToHome?: () => void;
  onLoginClick?: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBookDemo, onContact, onNavigateToHome, onLoginClick }) => {
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme-aware classes
  const bgClass = isDark ? 'theme-dark' : 'theme-light';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const sectionBg = isDark ? 'bg-slate-900' : 'bg-white';
  const sectionBgAlt = isDark ? 'bg-slate-950' : 'bg-slate-50';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${bgClass}`}>
      {/* Header / Navbar - Always visible */}
      <header className={`sticky top-0 z-50 ${isDark ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${borderClass} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Koncite Logo" className="w-8 h-8 object-contain" />
              <span className={`font-black text-xl tracking-tight ${textPrimary}`}>Koncite</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              {onNavigateToHome && (
                <button 
                  onClick={onNavigateToHome}
                  className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                >
                  Home
                </button>
              )}
              <button 
                className={`text-sm font-semibold ${textPrimary} border-b-2 border-indigo-500`}
              >
                About
              </button>
              {onNavigateToHome && (
                <>
                  <button 
                    onClick={() => {
                      onNavigateToHome();
                      setTimeout(() => {
                        const featuresSection = document.getElementById('features');
                        if (featuresSection) {
                          featuresSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                    className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                  >
                    Features
                  </button>
                  <button 
                    onClick={() => {
                      onNavigateToHome();
                      setTimeout(() => {
                        const resourcesSection = document.getElementById('resources');
                        if (resourcesSection) {
                          resourcesSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                    className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                  >
                    Resources
                  </button>
                  <button 
                    onClick={() => {
                      onNavigateToHome();
                      setTimeout(() => {
                        const pricingSection = document.getElementById('pricing');
                        if (pricingSection) {
                          pricingSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                    className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                  >
                    Pricing
                  </button>
                  <button 
                    onClick={() => {
                      onNavigateToHome();
                      setTimeout(() => {
                        const contactSection = document.getElementById('contact');
                        if (contactSection) {
                          contactSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                    className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                  >
                    Contact Us
                  </button>
                </>
              )}
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors border ${borderClass}`}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              {onLoginClick && (
                <button
                  onClick={onLoginClick}
                  className={`hidden sm:block text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors`}
                >
                  Log In
                </button>
              )}
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
                {onNavigateToHome && (
                  <>
                    <button 
                      onClick={() => {
                        onNavigateToHome();
                        setMobileMenuOpen(false);
                      }}
                      className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                    >
                      Home
                    </button>
                    <button 
                      className={`text-sm font-semibold ${textPrimary} border-b-2 border-indigo-500 text-left`}
                    >
                      About
                    </button>
                    <button 
                      onClick={() => {
                        onNavigateToHome();
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const featuresSection = document.getElementById('features');
                          if (featuresSection) {
                            featuresSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                    >
                      Features
                    </button>
                    <button 
                      onClick={() => {
                        onNavigateToHome();
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const resourcesSection = document.getElementById('resources');
                          if (resourcesSection) {
                            resourcesSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                    >
                      Resources
                    </button>
                    <button 
                      onClick={() => {
                        onNavigateToHome();
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const pricingSection = document.getElementById('pricing');
                          if (pricingSection) {
                            pricingSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                    >
                      Pricing
                    </button>
                    <button 
                      onClick={() => {
                        onNavigateToHome();
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const contactSection = document.getElementById('contact');
                          if (contactSection) {
                            contactSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      className={`text-sm font-semibold ${textSecondary} hover:text-indigo-400 transition-colors text-left`}
                    >
                      Contact Us
                    </button>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Section 1: Hero / Intro */}
      <section className={`py-20 lg:py-32 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-gradient-to-br from-slate-950 to-slate-900' : 'bg-gradient-to-br from-slate-50 to-white'}`}>
        <div className="max-w-5xl mx-auto text-center">
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tight ${textPrimary} mb-6 leading-tight`}>
            Modernizing construction management
          </h1>
          <p className={`text-xl md:text-2xl ${textSecondary} max-w-3xl mx-auto leading-relaxed`}>
            Koncite is building a unified, intelligent platform that helps construction teams manage documents, labour, reporting, and site operations with speed and clarity.
          </p>
        </div>
      </section>

      {/* Section 2: Why We Exist */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-6`}>
                Why Koncite exists
              </h2>
              <p className={`text-lg ${textSecondary} leading-relaxed`}>
                Construction teams operate in complex environments, yet they are often held back by disconnected tools, manual processes, and outdated systems. Koncite exists to simplify this reality by replacing fragmented workflows with a single, reliable platform built for modern construction.
              </p>
            </div>
            
         <div className="relative">
  <div
    className={`${cardClass} rounded-xl overflow-hidden border ${borderClass} aspect-video`}
    style={{ width: "520px", height: "300px" }}
  >
    <img
      src="/about/image.png"
      alt="Koncite platform simplifying construction workflows"
      className="w-full h-full object-cover"
    />
  </div>
</div>

          </div>
        </div>
      </section>

      {/* Section 3: What We Are Building */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-4`}>
              What we are building
            </h2>
            <p className={`text-lg ${textSecondary} max-w-3xl mx-auto`}>
              Koncite is a next-generation construction management platform designed to bring structure, automation, and intelligence to daily construction operations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: FileText,
                title: 'Document management',
                description: 'Access control and fast search for all your construction documents'
              },
              {
                icon: Users,
                title: 'Labour management',
                description: 'Manage rates, hiring, and reporting for your construction teams'
              },
              {
                icon: ClipboardList,
                title: 'Daily progress reports',
                description: 'Generate professional reports in minutes, not hours'
              },
              {
                icon: Sparkles,
                title: 'AI-powered assistance',
                description: 'Get faster decisions with intelligent automation and insights'
              }
            ].map((feature, idx) => (
              <div key={idx} className={`${cardClass} p-6 rounded-xl border ${borderClass} hover:shadow-lg transition-all`}>
                <div className={`w-12 h-12 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>{feature.title}</h3>
                <p className={textSecondary}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: How We Help Modernize Construction */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-12 text-center`}>
            How Koncite helps modernize construction
          </h2>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                'Replace manual paperwork with digital workflows',
                'Improve real-time visibility across projects',
                'Reduce repetitive work using AI',
                'Enable seamless collaboration between site and office teams'
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`w-6 h-6 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Check className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className={`text-lg ${textSecondary} flex-1`}>{item}</p>
                </div>
              ))}
            </div>
            <div className="relative">
  <div
    className={`${cardClass} rounded-xl overflow-hidden border ${borderClass} aspect-[4/3]`}
  >
    <img
      src="/about/img1.png"
      alt="Koncite construction workflow platform"
      className="w-full h-full object-cover"
    />
  </div>
</div>

          </div>
        </div>
      </section>

      {/* Section 5: Image Showcase Grid with Text */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBgAlt}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Text Content */}
            <div>
              <h2 className={`text-3xl md:text-4xl font-black ${textPrimary} mb-6`}>
                Built for real construction environments
              </h2>
              <p className={`text-lg ${textSecondary} mb-6 leading-relaxed`}>
                Koncite is designed and tested in real construction environments. Our platform reflects the actual challenges and workflows that construction teams face every day—from busy construction sites to project offices.
              </p>
              <p className={`text-lg ${textSecondary} mb-6 leading-relaxed`}>
                We understand that construction management isn't just about software—it's about people, processes, and the physical reality of building. That's why every feature in Koncite is built with field teams in mind.
              </p>
              <ul className={`space-y-4 ${textSecondary}`}>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Designed for mobile and tablet use on construction sites</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Works offline and syncs when connection is available</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Simple enough for field teams, powerful enough for managers</span>
                </li>
              </ul>
            </div>

            {/* Right Side - Collage Grid (matching image style) */}
            <div className="grid grid-cols-4 gap-1">
  {/* Row 1 */}
  <div className={`col-span-2 aspect-[2/1] border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img2.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img3.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`row-span-3 aspect-[1/3] border ${borderClass} relative overflow-hidden`}>
    <img src="/about/image4.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  {/* Row 2 */}
  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img5.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img6.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img7.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  {/* Row 3 */}
  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img8.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img2.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img3.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  {/* Row 4 */}
  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img4.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`col-span-2 aspect-[2/1] border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img5.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>

  <div className={`aspect-square border ${borderClass} relative overflow-hidden`}>
    <img src="/about/img6.jpg" alt="Image" className="w-full h-full object-cover" />
  </div>
</div>

          </div>
        </div>
      </section>

      {/* Section 6: Our Approach & Values */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${sectionBg}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Simplicity first',
                description: 'Software should be easy to adopt by field teams and powerful enough for managers.'
              },
              {
                icon: TrendingUp,
                title: 'Practical innovation',
                description: 'We focus on features that solve real problems, not unnecessary complexity.'
              },
              {
                icon: Shield,
                title: 'Built for growth',
                description: 'Koncite scales with your projects, teams, and business.'
              }
            ].map((value, idx) => (
              <div key={idx} className={`${cardClass} p-8 rounded-xl border ${borderClass} text-center`}>
                <div className={`w-16 h-16 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                  <value.icon className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className={`text-xl font-bold mb-4 ${textPrimary}`}>{value.title}</h3>
                <p className={textSecondary}>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Closing CTA */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-indigo-700`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Building better projects starts with better tools
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Koncite helps construction teams stay organized, informed, and in control—every day, on every project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onBookDemo}
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Get a demo
            </button>
            <button
              onClick={onContact}
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl border-2 border-white/20"
            >
              Contact us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`bg-slate-900 ${isDark ? '' : 'bg-slate-800'} text-slate-300 mt-auto`}>
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
                    <button className="hover:text-indigo-400 transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-indigo-400 transition-colors">Pricing</button></li>
                <li><button className="hover:text-indigo-400 transition-colors">Case Studies</button></li>
                <li><button className="hover:text-indigo-400 transition-colors">Help Center</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                {onNavigateToHome && (
                  <li><button onClick={onNavigateToHome} className="hover:text-indigo-400 transition-colors">Home</button></li>
                )}
                <li><button className="hover:text-indigo-400 transition-colors text-indigo-400 border-b border-indigo-400">About</button></li>
                <li><button onClick={onContact} className="hover:text-indigo-400 transition-colors">Contact</button></li>
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

export default AboutPage;
