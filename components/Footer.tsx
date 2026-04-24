import React, { useState } from 'react';
import { Facebook, Twitter, Linkedin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import TermsAndPrivacyModal from './TermsAndPrivacyModal';

interface FooterProps {
  scrollToSection: (id: string) => void;
  onContactClick?: () => void;
  onNavigateToAbout?: () => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToSection, onContactClick, onNavigateToAbout }) => {
  const { isDark } = useTheme();
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleAboutClick = () => {
    if (onNavigateToAbout) {
      onNavigateToAbout();
    } else {
      scrollToSection('about');
    }
  };

  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick();
    } else {
      scrollToSection('contact');
    }
  };

  return (
    <>
      <footer id="resources" className={`${isDark ? 'bg-[#0a0a0a]' : 'bg-slate-800'} text-white mt-auto`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-8 mb-8 text-center md:text-left">
            {/* Brand Section */}
            <div className="flex flex-col items-center md:items-start">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2 mb-4 md:flex-row md:items-center">
                <img src="/logo.png" alt="Koncite Logo" className="w-14 h-14 object-contain shrink-0" />
                <span className="text-xl font-black tracking-tight text-[#C2D642]">KONCITE</span>
              </div>
              <p className="text-sm text-slate-300 mb-6 max-w-md md:max-w-none">
                Koncite connects businesses and users through seamless digital experiences built on trust, transparency, and innovation.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#C2D642] rounded-full flex items-center justify-center hover:bg-[#A8B838] transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5 text-white" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#C2D642] rounded-full flex items-center justify-center hover:bg-[#A8B838] transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5 text-white" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#C2D642] rounded-full flex items-center justify-center hover:bg-[#A8B838] transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-white" />
                </a>
              </div>
            </div>

            {/* Links Section */}
            <div className="flex flex-col items-center md:items-start">
              <h4 className="font-bold mb-4 text-white uppercase tracking-wide">LINK</h4>
              <ul className="space-y-2 text-sm flex flex-col items-center md:items-start">
                <li>
                  <button 
                    onClick={() => scrollToSection('home')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handleAboutClick} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handleContactClick} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowTermsModal(true)} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Features Section */}
            <div className="flex flex-col items-center md:items-start">
              <h4 className="font-bold mb-4 text-white uppercase tracking-wide">FEATURES</h4>
              <ul className="space-y-2 text-sm flex flex-col items-center md:items-start">
                <li>
                  <button 
                    onClick={() => scrollToSection('daily-work-progress')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Daily Work Progress
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('inventory-management')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Inventory & Materials
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('document-management')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Document Management
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('labour-management')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Labour Management
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('reports-dashboards')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Reports & Dashboards
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Section */}
            <div className="flex flex-col items-center md:items-start">
              <h4 className="font-bold mb-4 text-white uppercase tracking-wide">CONTACT</h4>
              <ul className="space-y-2 text-sm flex flex-col items-center md:items-start">
                <li>
                  <button 
                    onClick={handleContactClick} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left"
                  >
                    Contact Form
                  </button>
                </li>
                <li>
                  <a 
                    href="mailto:info@koncite.com" 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-center md:text-left inline-block"
                  >
                    info@koncite.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Copyright — extra bottom padding on small screens clears fixed corner controls (e.g. dev tooling) */}
        <div className="bg-[#C2D642] pt-4 pb-14 sm:pb-4 relative z-10">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl text-center text-xs leading-relaxed text-slate-900 sm:text-sm sm:leading-relaxed [text-wrap:balance] space-y-2">
              <p>
                Koncite is owned and operated by{' '}
                <strong className="font-semibold text-slate-950">SUSTRIX SOFTWARES PRIVATE LIMITED</strong>.
              </p>
              <p>
                All rights reserved © 2026{' '}
                <strong className="font-semibold text-slate-950">SUSTRIX SOFTWARES PRIVATE LIMITED</strong>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Terms and Privacy Modal */}
      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </>
  );
};

export default Footer;
