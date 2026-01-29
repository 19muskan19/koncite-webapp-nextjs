import React from 'react';
import { Facebook, Twitter, Linkedin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface FooterProps {
  scrollToSection: (id: string) => void;
  onContactClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToSection, onContactClick }) => {
  const { isDark } = useTheme();

  return (
    <footer id="resources" className={`${isDark ? 'bg-[#0a0a0a]' : 'bg-slate-800'} text-slate-300 mt-auto`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Koncite Logo" className="w-14 h-14 object-contain" />
              <span className="font-black text-2xl tracking-tight text-white">
                Koncite
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              All-in-one construction management software built for speed, clarity, and control.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-[#C2D642] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-[#C2D642] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-[#C2D642] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-white">Features</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Daily Work Progress', id: 'daily-work-progress' },
                { label: 'Inventory & Materials Management', id: 'inventory-management' },
                { label: 'Document Management', id: 'document-management' },
                { label: 'Labour Management', id: 'labour-management' },
                { label: 'Reports & Dashboards', id: 'reports-dashboards' }
              ].map((item, idx) => (
                <li key={idx}>
                  <button onClick={() => scrollToSection(item.id)} className="hover:text-[#C2D642] transition-colors">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => scrollToSection('about')} className="hover:text-[#C2D642] transition-colors">About Us</button></li>
              <li><button onClick={() => onContactClick ? onContactClick() : scrollToSection('contact')} className="hover:text-[#C2D642] transition-colors">Contact</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
          <p>© 2026 Koncite</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
