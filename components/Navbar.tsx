'use client';

import React, { useState } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface NavbarProps {
  onLoginClick: () => void;
  onNavigateToAbout?: () => void;
  scrollToSection: (id: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onNavigateToAbout, scrollToSection }) => {
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');

  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
    scrollToSection(id);
    setMobileMenuOpen(false);
  };

  const handleAboutClick = () => {
    setActiveSection('about');
    if (onNavigateToAbout) {
      onNavigateToAbout();
    }
    setMobileMenuOpen(false);
  };

  // Theme-aware classes
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-800' : 'border-slate-300';
  const headerBg = isDark ? 'bg-[#0a0a0a]/95' : 'bg-[#e8e6e0]';

  return (
    <header className={`sticky top-0 z-50 ${headerBg} backdrop-blur-sm border-b ${borderClass} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Koncite Logo" className="w-8 h-8 object-contain" />
            <span className={`font-black text-xl tracking-tight ${textPrimary}`}>
              Koncite
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => handleScrollToSection('home')}
              className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors relative pb-1 ${
                activeSection === 'home' ? 'text-[#6B8E23]' : ''
              }`}
            >
              Home
              {activeSection === 'home' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
              )}
            </button>
            <button
              onClick={() => handleScrollToSection('features')}
              className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors relative pb-1 ${
                activeSection === 'features' ? 'text-[#6B8E23]' : ''
              }`}
            >
              Features
              {activeSection === 'features' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
              )}
            </button>
            {onNavigateToAbout && (
              <button
                onClick={handleAboutClick}
                className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors relative pb-1 ${
                  activeSection === 'about' ? 'text-[#6B8E23]' : ''
                }`}
              >
                About
                {activeSection === 'about' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
                )}
              </button>
            )}
            <button
              onClick={() => handleScrollToSection('pricing')}
              className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors relative pb-1 ${
                activeSection === 'pricing' ? 'text-[#6B8E23]' : ''
              }`}
            >
              Pricing
              {activeSection === 'pricing' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
              )}
            </button>
            <button
              onClick={() => handleScrollToSection('contact')}
              className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors relative pb-1 ${
                activeSection === 'contact' ? 'text-[#6B8E23]' : ''
              }`}
            >
              Contact Us
              {activeSection === 'contact' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
              )}
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'} rounded-lg transition-colors border ${borderClass}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <button
              onClick={onLoginClick}
              className={`hidden sm:block text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors`}
            >
              Log In
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:block px-4 py-2 border-2 border-[#6B8E23] hover:bg-[#6B8E23] text-[#6B8E23] hover:text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Book a Demo
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 ${textSecondary} hover:text-[#6B8E23] transition-colors`}
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
                onClick={() => handleScrollToSection('home')}
                className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors text-left relative pb-1 ${
                  activeSection === 'home' ? 'text-[#6B8E23]' : ''
                }`}
              >
                Home
                {activeSection === 'home' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
                )}
              </button>
              {onNavigateToAbout && (
                <button
                  onClick={handleAboutClick}
                  className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors text-left relative pb-1 ${
                    activeSection === 'about' ? 'text-[#6B8E23]' : ''
                  }`}
                >
                  About
                  {activeSection === 'about' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
                  )}
                </button>
              )}
              <button
                onClick={() => handleScrollToSection('features')}
                className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors text-left relative pb-1 ${
                  activeSection === 'features' ? 'text-[#6B8E23]' : ''
                }`}
              >
                Features
                {activeSection === 'features' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
                )}
              </button>
              <button
                onClick={() => handleScrollToSection('pricing')}
                className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors text-left relative pb-1 ${
                  activeSection === 'pricing' ? 'text-[#6B8E23]' : ''
                }`}
              >
                Pricing
                {activeSection === 'pricing' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
                )}
              </button>
              <button
                onClick={() => handleScrollToSection('contact')}
                className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors text-left relative pb-1 ${
                  activeSection === 'contact' ? 'text-[#6B8E23]' : ''
                }`}
              >
                Contact Us
                {activeSection === 'contact' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6B8E23]"></span>
                )}
              </button>
              <div className={`flex flex-col gap-2 pt-4 border-t ${borderClass}`}>
                <button
                  onClick={onLoginClick}
                  className={`text-sm font-semibold ${textSecondary} hover:text-[#6B8E23] transition-colors text-left`}
                >
                  Log In
                </button>
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 border-2 border-[#6B8E23] hover:bg-[#6B8E23] text-[#6B8E23] hover:text-white rounded-lg text-sm font-semibold transition-all w-full"
                >
                  Book a Demo
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
