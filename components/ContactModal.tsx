'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, User, Phone, FileText, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

// Helper function to get flag image URL
const getFlagUrl = (countryCode: string) => {
  return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
};

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '91', // Default to India
    phone: '',
    subject: '',
    message: ''
  });
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  // Fetch countries from API when modal opens
  useEffect(() => {
    if (isOpen && countryCodes.length === 0 && !isLoadingCountries) {
      fetchCountries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    setCountriesError(null);
    try {
      // Using REST Countries API v3.1
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
      
      if (!response.ok) {
        throw new Error('Failed to fetch countries');
      }

      const data = await response.json();
      
      // Transform API data to our format
      const transformedCountries: CountryCode[] = data
        .filter((country: any) => {
          // Only include countries with calling codes
          return country.idd && country.idd.root && country.cca2;
        })
        .map((country: any) => {
          // Extract dial code (remove + and root)
          const root = country.idd.root || '';
          const suffixes = country.idd.suffixes || [''];
          // Use first suffix if available, otherwise just root
          const dialCode = suffixes.length > 0 && suffixes[0] 
            ? `${root}${suffixes[0]}`.replace(/\+/g, '')
            : root.replace(/\+/g, '');
          
          return {
            code: country.cca2, // ISO 3166-1 alpha-2 code
            dialCode: dialCode || '',
            name: country.name.common || country.name.official,
            flag: country.flags?.png || getFlagUrl(country.cca2)
          };
        })
        .filter((country: CountryCode) => country.dialCode) // Remove entries without dial codes
        .sort((a: CountryCode, b: CountryCode) => {
          // Sort by dial code (as number) then by name
          const dialA = parseInt(a.dialCode) || 0;
          const dialB = parseInt(b.dialCode) || 0;
          if (dialA !== dialB) {
            return dialA - dialB;
          }
          return a.name.localeCompare(b.name);
        });

      setCountryCodes(transformedCountries);
    } catch (error) {
      console.error('Error fetching countries:', error);
      setCountriesError('Failed to load countries. Please try again.');
      // Fallback to a few common countries
      setCountryCodes([
        { code: 'IN', dialCode: '91', name: 'India', flag: getFlagUrl('IN') },
        { code: 'US', dialCode: '1', name: 'United States', flag: getFlagUrl('US') },
        { code: 'GB', dialCode: '44', name: 'United Kingdom', flag: getFlagUrl('GB') },
        { code: 'AE', dialCode: '971', name: 'United Arab Emirates', flag: getFlagUrl('AE') },
      ]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-white';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 10 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({
      ...formData,
      phone: value
    });
  };

  const selectedCountry = countryCodes.find(c => c.dialCode === formData.countryCode) || 
    countryCodes.find(c => c.dialCode === '91') || // Default to India
    countryCodes[0] || 
    { code: 'IN', dialCode: '91', name: 'India', flag: getFlagUrl('IN') };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        countryCode: '91',
        phone: '',
        subject: '',
        message: ''
      });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus(null);
      }, 2000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 md:p-8 relative border ${borderClass} max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors z-10`}
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <MessageSquare className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>Get in Touch</h2>
          <div className={`mt-4 ${textSecondary}`}>
            <p className="text-sm font-semibold mb-1">Mail Us</p>
            <a href="mailto:info@koncite.com" className={`text-sm ${isDark ? 'text-[#C2D642] hover:text-[#C2D642]/80' : 'text-[#a8b835] hover:text-[#a8b835]/80'} transition-colors`}>
              info@koncite.com
            </a>
          </div>
        </div>

        {submitStatus === 'success' && (
          <div className={`p-4 mb-4 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} border ${isDark ? 'border-[#C2D642]/30' : 'border-[#C2D642]/20'} rounded-lg`}>
            <p className={`text-sm ${isDark ? 'text-[#C2D642]' : 'text-[#a8b835]'}`}>
              Thank you! Your message has been sent successfully.
            </p>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Your Email"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Phone
            </label>
            <div className="flex gap-2">
              {/* Country Code Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none min-w-[120px] hover:bg-opacity-80 transition-colors`}
                >
                  <img 
                    src={selectedCountry.flag || getFlagUrl(selectedCountry.code)} 
                    alt={selectedCountry.name}
                    className="w-5 h-4 object-cover rounded border border-slate-300"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to flagcdn if API flag fails
                      const target = e.target as HTMLImageElement;
                      target.src = getFlagUrl(selectedCountry.code);
                    }}
                  />
                  <span className="text-sm font-medium">+{selectedCountry.dialCode}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isCountryDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsCountryDropdownOpen(false)}
                    />
                    <div className={`absolute top-full left-0 mt-1 z-[60] w-64 max-h-60 overflow-y-auto ${inputBg} border ${borderClass} rounded-lg shadow-xl`}>
                      {isLoadingCountries ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-[#C2D642]" />
                          <span className={`ml-2 text-sm ${textSecondary}`}>Loading countries...</span>
                        </div>
                      ) : countriesError ? (
                        <div className="p-4">
                          <p className={`text-sm ${textSecondary}`}>{countriesError}</p>
                        </div>
                      ) : countryCodes.length > 0 ? (
                        <div className="p-2">
                          {countryCodes.map((country) => (
                            <button
                              key={`${country.code}-${country.dialCode}`}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, countryCode: country.dialCode });
                                setIsCountryDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-opacity-80 transition-colors ${
                                formData.countryCode === country.dialCode 
                                  ? isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'
                                  : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                              }`}
                            >
                              <img 
                                src={country.flag || getFlagUrl(country.code)} 
                                alt={country.name}
                                className="w-6 h-4 object-cover rounded border border-slate-300"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to flagcdn if API flag fails
                                  const target = e.target as HTMLImageElement;
                                  target.src = getFlagUrl(country.code);
                                }}
                              />
                              <span className={`flex-1 text-left text-sm ${textPrimary}`}>{country.name}</span>
                              <span className={`text-sm ${textSecondary}`}>+{country.dialCode}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className={`text-sm ${textSecondary}`}>No countries available</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Phone Number Input */}
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onKeyPress={(e) => {
                    // Only allow numbers
                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                      e.preventDefault();
                    }
                  }}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={10}
                  className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                  placeholder="Your Phone"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Subject
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none`}
                placeholder="Enter Subject"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-4 py-3 border ${borderClass} rounded-lg ${inputBg} ${textPrimary} focus:ring-2 focus:ring-[#C2D642] focus:border-transparent outline-none resize-none`}
              placeholder="Your message"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 border-2 border-[#C2D642] hover:bg-[#C2D642] text-[#C2D642] hover:text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                submit now
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
