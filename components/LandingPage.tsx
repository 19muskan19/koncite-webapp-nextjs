import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-black text-lg tracking-tight">KONCITE</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('home')}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('subscription-plans')}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Subscription Plans
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Contact Us
              </button>
            </nav>

            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
              Construction Management Platform
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Transform your health data into actionable insights with AI-powered analytics and personalized coaching.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => scrollToSection('subscription-plans')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg font-semibold transition-all hover:shadow-lg"
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-12 text-slate-900 dark:text-white">About Us</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">AI-Powered Analytics</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Leverage advanced machine learning algorithms to analyze your health data and provide personalized insights.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Real-Time Monitoring</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track your health metrics in real-time with comprehensive dashboards and automated alerts.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Personalized Coaching</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Get tailored recommendations and coaching from our AI-powered health assistant.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Plans Section */}
        <section id="subscription-plans" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-12 text-slate-900 dark:text-white">Subscription Plans</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Basic</h3>
                <p className="text-3xl font-black mb-4 text-indigo-600">$29<span className="text-lg text-slate-600 dark:text-slate-400">/mo</span></p>
                <ul className="space-y-3 mb-6 text-slate-600 dark:text-slate-400">
                  <li>✓ Basic health tracking</li>
                  <li>✓ Monthly reports</li>
                  <li>✓ Email support</li>
                </ul>
                <button className="w-full px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  Choose Plan
                </button>
              </div>
              <div className="p-8 rounded-xl border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 relative">
                <span className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">POPULAR</span>
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Pro</h3>
                <p className="text-3xl font-black mb-4 text-indigo-600">$79<span className="text-lg text-slate-600 dark:text-slate-400">/mo</span></p>
                <ul className="space-y-3 mb-6 text-slate-600 dark:text-slate-400">
                  <li>✓ Advanced analytics</li>
                  <li>✓ Real-time monitoring</li>
                  <li>✓ AI coaching</li>
                  <li>✓ Priority support</li>
                </ul>
                <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                  Choose Plan
                </button>
              </div>
              <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Enterprise</h3>
                <p className="text-3xl font-black mb-4 text-indigo-600">Custom</p>
                <ul className="space-y-3 mb-6 text-slate-600 dark:text-slate-400">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Custom integrations</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ Advanced security</li>
                </ul>
                <button className="w-full px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-12 text-slate-900 dark:text-white">Contact Us</h2>
            <div className="max-w-2xl mx-auto">
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-white">Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-white">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-900 dark:text-white">Message</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="font-black text-lg tracking-tight text-white">KONCITE</span>
              </div>
              <p className="text-sm text-slate-400">
                Construction Management Platform
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Navigation</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => scrollToSection('home')}
                    className="text-sm hover:text-indigo-400 transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('about')}
                    className="text-sm hover:text-indigo-400 transition-colors"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('subscription-plans')}
                    className="text-sm hover:text-indigo-400 transition-colors"
                  >
                    Subscription Plans
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('contact')}
                    className="text-sm hover:text-indigo-400 transition-colors"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Support Center</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>© 2026 Koncite. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
