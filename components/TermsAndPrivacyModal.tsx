'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-4xl mx-4 p-6 md:p-8 relative border ${borderClass} max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition-colors z-10`}
        >
          <X className={`w-5 h-5 ${textSecondary}`} />
        </button>

        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isDark ? 'bg-[#C2D642]/20' : 'bg-[#C2D642]/10'} rounded-full mb-4`}>
            <FileText className="w-8 h-8 text-[#C2D642]" />
          </div>
          <h2 className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2`}>TERMS & CONDITIONS & PRIVACY POLICY</h2>
          <p className={`text-sm ${textSecondary}`}>Last Updated: 1/02/2026</p>
        </div>

        <div className={`space-y-6 ${textSecondary} text-sm leading-relaxed`}>
          <div>
            <p className={textPrimary}>
              This Agreement governs the access to and use of Koncite, a product and trademark of SUSTRIX SOFTWARES PRIVATE LIMITED ("Company", "we", "our", "us").
            </p>
            <p className="mt-2">
              By accessing or using the Koncite web application or mobile application (collectively, the "Service"), you agree to be bound by this Agreement. If you do not agree, you must not use the Service.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>1. Eligibility</h3>
            <p>You must be at least 18 years of age and legally capable of entering into a binding agreement to use the Service.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>2. User Accounts & Responsibility</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
              <li>All activities performed under your account are your responsibility</li>
              <li>You agree to provide accurate and up-to-date account information</li>
            </ul>
            <p className="mt-2">The Company reserves the right to suspend or terminate accounts for violations of this Agreement.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>3. Acceptable Use</h3>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Use the Service for unlawful or unauthorized purposes</li>
              <li>Attempt to reverse engineer, copy, or misuse the platform</li>
              <li>Interfere with security, integrity, or availability of the Service</li>
              <li>Introduce malicious code or attempt unauthorized access</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>4. Data Collection (Minimal & Purpose-Limited)</h3>
            <p className="mb-2">The Company follows a data minimization principle and collects only information strictly necessary to operate and secure the Service.</p>
            <h4 className={`font-semibold ${textPrimary} mt-3 mb-1`}>4.1 Categories of Data Collected</h4>
            <p className="mb-2"><strong>a. Account Information</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Company or organization details</li>
            </ul>
            <p className="mb-2 mt-2"><strong>b. Technical & Operational Metadata</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Device type, operating system, and application version</li>
              <li>IP address</li>
              <li>Usage logs for security, auditing, and system performance</li>
            </ul>
            <p className="mt-2">
              The Company does not collect, inspect, monitor, analyze, or process any business, operational, or content data entered by users within the application.
              All such data remains logically segregated and accessible only to the user and their authorized organization members.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>5. Purpose Limitation & Use of Data</h3>
            <p className="mb-2">Collected data is used solely for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Account creation and user authentication</li>
              <li>Access control and identity verification</li>
              <li>Platform security, abuse prevention, and fraud detection</li>
              <li>System monitoring, reliability, and performance improvement</li>
              <li>Compliance with applicable legal and regulatory obligations</li>
            </ul>
            <p className="mt-2 mb-2">The Company does not:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Sell or rent personal data</li>
              <li>Use customer data for advertising or profiling</li>
              <li>Access application data for analytics, training, or commercial use</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>6. Data Ownership, Confidentiality & Access Controls</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Users retain full ownership of all their data entered into the application</li>
              <li>SUSTRIX SOFTWARES PRIVATE LIMITED does not claim ownership over user data</li>
              <li>Customer data is treated as confidential information</li>
            </ul>
            <p className="mt-2 mb-2">Access is controlled through:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Role-based access controls</li>
              <li>Logical tenant isolation</li>
              <li>Authentication and authorization mechanisms</li>
            </ul>
            <p className="mt-2">
              Company personnel do not access customer application data, except where technically unavoidable to maintain system availability or when required by law.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>7. Automated & AI-Based Processing</h3>
            <p className="mb-2">Where automation or AI-based systems are enabled:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Processing occurs strictly within user-initiated workflows</li>
              <li>Outputs are assistive and informational only</li>
              <li>The Company does not guarantee accuracy or suitability of outputs</li>
            </ul>
            <p className="mt-2">Users are solely responsible for validating results before making decisions.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>8. Subscriptions & Payments</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The Service may be offered via subscription plans</li>
              <li>Fees are payable monthly or annually as per selected plans</li>
              <li>Payments are non-refundable, unless required by applicable law</li>
              <li>Pricing and plans may be modified</li>
            </ul>
            <p className="mt-2">Failure to pay may result in suspension or termination.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>9. Information Security & Data Loss Disclaimer</h3>
            <p className="mb-2">
              The Company implements commercially reasonable administrative, technical, and organizational safeguards aligned with industry best practices.
            </p>
            <p className="mb-2">However:</p>
            <p className="mb-2">The Service is provided "as is" and "as available."</p>
            <p className="mb-2">
              SUSTRIX SOFTWARES PRIVATE LIMITED shall not be responsible for any data loss, corruption, unauthorized access, or service interruption arising from:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Third-party infrastructure or cloud service failures</li>
              <li>Cybersecurity incidents beyond reasonable control</li>
              <li>Force majeure events</li>
            </ul>
            <p className="mt-2">Users are responsible for maintaining independent backups of critical data.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>10. Intellectual Property</h3>
            <p className="mb-2">
              All rights, title, and interest in the Service, including software, trademarks, logos, and systems, belong exclusively to SUSTRIX SOFTWARES PRIVATE LIMITED.
            </p>
            <p className="mb-2">"Koncite" is a trademark of SUSTRIX SOFTWARES PRIVATE LIMITED.</p>
            <p>No rights are granted except as expressly stated in this Agreement.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>11. Third-Party Services</h3>
            <p>The Service may integrate with third-party platforms or providers. The Company is not responsible for the availability, security, or practices of such third parties.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>12. Disclaimer of Warranties</h3>
            <p>
              The Service is provided without warranties of any kind, express or implied, including guarantees of uninterrupted availability, accuracy, or fitness for a particular purpose.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>13. Limitation of Liability</h3>
            <p className="mb-2">
              To the maximum extent permitted by law, SUSTRIX SOFTWARES PRIVATE LIMITED shall not be liable for indirect, incidental, special, or consequential damages, including loss of data, business, or profits.
            </p>
            <p>Total liability shall not exceed the amount paid by the user to the Company in the preceding 6 months.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>14. Indemnification</h3>
            <p className="mb-2">You agree to indemnify and hold harmless SUSTRIX SOFTWARES PRIVATE LIMITED from any claims, damages, or losses arising from:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Misuse of the Service</li>
              <li>Violation of this Agreement</li>
              <li>Violation of applicable laws or third-party rights</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>15. Termination</h3>
            <p className="mb-2">The Company may suspend or terminate access to the Service for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Violation of this Agreement</li>
              <li>Non-payment</li>
              <li>Legal or regulatory requirements</li>
            </ul>
            <p className="mt-2">Upon termination, access to the Service will cease.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>16. Governing Law & Jurisdiction</h3>
            <p>This Agreement shall be governed by the laws of India, with exclusive jurisdiction in Pune, Maharashtra.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>17. Changes to This Agreement</h3>
            <p>The Company may update this Agreement periodically. Continued use of the Service constitutes acceptance of the updated terms.</p>
          </div>

          <div>
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>18. Contact Information</h3>
            <p className="mb-1">📧 info@koncite.com</p>
            <p>📍 SUSTRIX SOFTWARES PRIVATE LIMITED, Pune, Maharashtra, India</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-[#C2D642] hover:bg-[#A8B838] text-white rounded-lg font-semibold transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndPrivacyModal;
