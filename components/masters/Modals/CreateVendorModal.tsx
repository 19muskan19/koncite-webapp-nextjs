'use client';

import React, { useState, useEffect } from 'react';
import { ThemeType } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { X, Loader2 } from 'lucide-react';
import { masterDataAPI } from '@/services/api';
import { getExactErrorMessage } from '@/utils/errorUtils';

interface Vendor {
  id: string;
  uuid?: string;
  name: string;
  gstNo?: string;
  gst_no?: string;
  address: string;
  type: 'contractor' | 'supplier' | 'both';
  contactPersonName?: string;
  contact_person_name?: string;
  phone: string;
  email: string;
  country_code?: string;
  status?: 'Active' | 'Inactive';
}

interface CreateVendorModalProps {
  theme: ThemeType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingVendorId?: string | null;
  vendors?: Vendor[];
}

const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  theme,
  isOpen,
  onClose,
  onSuccess,
  editingVendorId = null,
  vendors = []
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: '',
    contact_person_name: '',
    country_code: '91',
    phone: '',
    email: '',
    gst_no: '',
    is_active: 1 as number
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-[#0a0a0a]' : 'bg-white';

  const isEditing = !!editingVendorId;

  const countryCodeOptions = [
    { value: '91', label: '+91 (India)' },
    { value: '971', label: '+971 (UAE)' },
  ];

  const typeOptions = [
    { value: 'supplier', label: 'Supplier' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'both', label: 'Both' },
  ];

  // Load vendor data when editing
  useEffect(() => {
    if (isOpen && editingVendorId) {
      const loadVendorData = async () => {
        try {
          const vendorData = await masterDataAPI.getVendor(editingVendorId);
          const isActive = vendorData.is_active === 1 || vendorData.is_active === true || vendorData.is_active === '1';
          setFormData({
            name: vendorData.name || '',
            address: vendorData.address || '',
            type: vendorData.type || '',
            contact_person_name: vendorData.contact_person_name || vendorData.contactPersonName || '',
            country_code: vendorData.country_code || '91',
            phone: vendorData.phone || '',
            email: vendorData.email || '',
            gst_no: vendorData.gst_no || vendorData.gstNo || '',
            is_active: isActive ? 1 : 0
          });
        } catch (error: any) {
          console.error('Failed to load vendor data:', error);
          toast.showError('Failed to load vendor data');
        }
      };
      loadVendorData();
    } else if (isOpen && !editingVendorId) {
      // Reset form for new vendor
      setFormData({
        name: '',
        address: '',
        type: '',
        contact_person_name: '',
        country_code: '91',
        phone: '',
        email: '',
        gst_no: '',
        is_active: 1
      });
    }
  }, [isOpen, editingVendorId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        address: '',
        type: '',
        contact_person_name: '',
        country_code: '91',
        phone: '',
        email: '',
        gst_no: '',
        is_active: 1
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = (): boolean => {
    const missingFields: string[] = [];

    if (!formData.name.trim()) missingFields.push('Vendor Name');
    if (!formData.address.trim()) missingFields.push('Address');
    if (!formData.type || !['both', 'supplier', 'contractor'].includes(formData.type)) missingFields.push('Type');
    if (!formData.gst_no.trim()) missingFields.push('GST No');
    if (!formData.contact_person_name.trim()) missingFields.push('Contact Person Name');
    if (!formData.country_code || !['91', '971'].includes(formData.country_code)) missingFields.push('Country Code');
    if (!formData.phone.trim()) missingFields.push('Phone');
    if (!formData.email.trim()) missingFields.push('Email');

    if (missingFields.length > 0) {
      const msg = missingFields.length === 1
        ? `Required field "${missingFields[0]}" is empty. Please fill it before submitting.`
        : `The following required fields are empty: ${missingFields.join(', ')}. Please fill them before submitting.`;
      toast.showWarning(msg);
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.showWarning('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        type: formData.type,
        contact_person_name: formData.contact_person_name.trim(),
        country_code: formData.country_code,
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase()
      };

      if (formData.gst_no.trim()) {
        payload.gst_no = formData.gst_no.trim();
      }
      payload.is_active = formData.is_active;

      if (isEditing && editingVendorId) {
        // Update existing vendor
        await masterDataAPI.updateVendor(editingVendorId, payload);
        toast.showSuccess('Vendor updated successfully!');
      } else {
        // Create new vendor
        await masterDataAPI.createVendor(payload);
        toast.showSuccess('Vendor created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save vendor:', error);
      toast.showError(getExactErrorMessage(error) || 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${bgPrimary} rounded-xl border ${cardClass} w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-inherit">
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>
              {isEditing ? 'Edit Vendor' : 'Create New Vendor'}
            </h2>
            <p className={`text-sm ${textSecondary} mt-1`}>
              {isEditing ? 'Update vendor details below' : 'Enter vendor details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'} transition-colors disabled:opacity-50`}
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
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
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
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
              >
                <option value="">----Select Vendor Type----</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* GST No */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                GST No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="gst_no"
                value={formData.gst_no}
                onChange={handleInputChange}
                placeholder="Enter Your GST No. (If Any)"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
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
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
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
                  name="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={handleInputChange}
                  placeholder="Enter Contact Person Name"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                />
              </div>

              {/* Country Code and Phone */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                  Country Code & Phone <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="country_code"
                    value={formData.country_code}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-32 px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  >
                    {countryCodeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter Your Mobile No."
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  />
                </div>
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
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700 text-slate-100 focus:border-[#C2D642]' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#C2D642]'
                  } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                />
              </div>

              {/* Status - only show when editing */}
              {isEditing && (
                <div>
                  <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
                    Status
                  </label>
                  <select
                    name="is_active"
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' ? 1 : 0 })}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all appearance-none cursor-pointer ${
                      isDark 
                        ? 'bg-slate-800/50 border-slate-700 text-slate-100 hover:bg-slate-800' 
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } border focus:ring-2 focus:ring-[#C2D642]/20 outline-none disabled:opacity-50`}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-inherit`}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200'
            } disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#C2D642] hover:bg-[#C2D642]/90 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateVendorModal;
