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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Koncite Logo" className="w-14 h-14 object-contain" />
              </div>
              <p className="text-sm text-slate-300 mb-6">
                Koncite connects businesses and users through seamless digital experiences built on trust, transparency, and innovation.
              </p>
              <div className="flex items-center gap-3">
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
            <div>
              <h4 className="font-bold mb-4 text-white uppercase tracking-wide">LINK</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => scrollToSection('home')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handleAboutClick} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handleContactClick} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowTermsModal(true)} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Features Section */}
            <div>
              <h4 className="font-bold mb-4 text-white uppercase tracking-wide">FEATURES</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={() => scrollToSection('daily-work-progress')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Daily Work Progress
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('inventory-management')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Inventory & Materials
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('document-management')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Document Management
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('labour-management')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Labour Management
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('reports-dashboards')} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Reports & Dashboards
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="font-bold mb-4 text-white uppercase tracking-wide">CONTACT</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button 
                    onClick={handleContactClick} 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors text-left"
                  >
                    Contact Form
                  </button>
                </li>
                <li>
                  <a 
                    href="mailto:info@koncite.com" 
                    className="text-slate-300 hover:text-[#C2D642] transition-colors"
                  >
                    info@koncite.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Copyright Section with Lime Green Background */}
        <div className="bg-[#C2D642] py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-slate-900">
              Koncite is owned and operated by <strong>SUSTRIX SOFTWARES PRIVATE LIMITED</strong>.
              <br></br> All rights reserved © 2025 <strong>SUSTRIX SOFTWARES PRIVATE LIMITED</strong>
            </p>
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
