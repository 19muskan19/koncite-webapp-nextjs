'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  gstNo?: string;
  address: string;
  type: 'contractor' | 'supplier' | 'both';
  contactPersonName: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
}

interface CreateVendorModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultVendors?: Vendor[];
  userVendors?: Vendor[];
  onVendorCreated?: (vendor: Vendor) => void;
}

const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  defaultVendors = [],
  userVendors = [],
  onVendorCreated
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    gstNo: '',
    address: '',
    type: '',
    contactPersonName: '',
    phone: '',
    email: ''
  });

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        gstNo: '',
        address: '',
        type: '',
        contactPersonName: '',
        phone: '',
        email: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateVendor = () => {
    const missingFields: string[] = [];
    
    if (!formData.name) missingFields.push('Vendor Name');
    if (!formData.address) missingFields.push('Address');
    if (!formData.type) missingFields.push('Type');
    if (!formData.contactPersonName) missingFields.push('Contact Person Name');
    if (!formData.phone) missingFields.push('Phone');
    if (!formData.email) missingFields.push('Email');
    
    if (missingFields.length > 0) {
      toast.showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    const newVendor: Vendor = {
      id: Date.now().toString(),
      name: formData.name,
      gstNo: formData.gstNo || undefined,
      address: formData.address,
      type: formData.type as 'contractor' | 'supplier' | 'both',
      contactPersonName: formData.contactPersonName,
      phone: formData.phone,
      email: formData.email,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const savedVendors = localStorage.getItem('vendors');
    let existingVendors: any[] = [];
    if (savedVendors) {
      try {
        existingVendors = JSON.parse(savedVendors);
      } catch (e) {
        console.error('Error parsing vendors:', e);
      }
    }

    existingVendors.push(newVendor);
    localStorage.setItem('vendors', JSON.stringify(existingVendors));
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('vendorsUpdated'));

    toast.showSuccess('Vendor created successfully!');
    
    if (onVendorCreated) {
      onVendorCreated(newVendor);
    }
    
    if (onSuccess) {
      onSuccess();
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>Create New Vendor</h2>
            <p className={`text-sm ${textSecondary} mt-1`}>Enter vendor details below</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Vendor Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Name */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter Vendor Name"
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              />
            </div>

            {/* Type */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none ${!formData.type ? 'border-red-500' : ''}`}
              >
                <option value="">----Select Vendor Type----</option>
                <option value="supplier">Supplier</option>
                <option value="contractor">Contractor</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* GST No */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                GST No (If any)
              </label>
              <input
                type="text"
                name="gstNo"
                value={formData.gstNo}
                onChange={handleInputChange}
                placeholder="Enter Your GST No. (If Any)"
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              />
            </div>

            {/* Address */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter Your Address"
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
              />
            </div>
          </div>

          {/* Separator */}
          <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}></div>

          {/* Contact Details Section */}
          <div className="space-y-4">
            <h3 className={`text-lg font-black ${textPrimary}`}>CONTACT DETAILS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Person Name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleInputChange}
                  placeholder="Enter Contact Person Name"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Mobile No */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Mobile No <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter Your Mobile No."
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter Your Email Id"
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateVendor}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateVendorModal;
