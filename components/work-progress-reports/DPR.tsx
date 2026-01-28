'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ThemeType } from '../../types';
import { 
  ClipboardCheck,
  Calendar,
  FileDown,
  User,
  Building2
} from 'lucide-react';

interface Activity {
  id: string;
  slNo: number;
  activities: string;
  unit: string;
  estimateQty: number;
  estRate: number;
  estAmount: number;
  completedQty: number;
  estAmountForCompletion: number;
  completionPercentage: number;
  balanceQty: number;
  remarks: string;
}

interface Material {
  id: string;
  slNo: number;
  materialName: string;
  specification: string;
  unit: string;
  quantityUsed: number;
  workDetails: string;
  remarks: string;
}

interface Labour {
  id: string;
  slNo: number;
  labourDetails: string;
  unit: string;
  quantity: number;
  otQuantity: number;
  labourContractor: string;
  ratePerUnit: number;
  remarks: string;
}

interface Machinery {
  id: string;
  slNo: number;
  machineryName: string;
  specification: string;
  unit: string;
  quantity: number;
  contractor: string;
  ratePerUnit: number;
  remarks: string;
}

interface Hinderance {
  id: string;
  slNo: number;
  hinderanceTitle: string;
  concernTeamMembers: string;
  remarks: string;
}

interface Safety {
  id: string;
  slNo: number;
  safetyTitle: string;
  concernTeamMembers: string;
  remarks: string;
}

interface DPRProps {
  theme: ThemeType;
}

const DPR: React.FC<DPRProps> = ({ theme }) => {
  const [selectedProject, setSelectedProject] = useState<string>('Lotus Rise');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('test - Project Manager');
  const [fromDate, setFromDate] = useState<string>('2025-12-31');
  
  // Dummy data for preview - will be replaced with API data later
  const dummyActivities: Activity[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      activities: 'Site cleaning',
      unit: 'Sqm',
      estimateQty: 1000,
      estRate: 150,
      estAmount: 150000.00,
      completedQty: 122.00,
      estAmountForCompletion: 18300.00,
      completionPercentage: 12.20,
      balanceQty: 878.00,
      remarks: 'Completed as per schedule'
    },
    {
      id: '2',
      slNo: 2,
      activities: 'RCC M20',
      unit: 'Cum',
      estimateQty: 110,
      estRate: 7500,
      estAmount: 825000.00,
      completedQty: 2.00,
      estAmountForCompletion: 15000.00,
      completionPercentage: 1.82,
      balanceQty: 108.00,
      remarks: 'In progress'
    },
    {
      id: '3',
      slNo: 3,
      activities: 'Excavation',
      unit: 'Cum',
      estimateQty: 150,
      estRate: 200,
      estAmount: 30000.00,
      completedQty: 125.00,
      estAmountForCompletion: 25000.00,
      completionPercentage: 83.33,
      balanceQty: 25.00,
      remarks: 'Almost complete'
    }
  ], []);

  const dummyMaterials: Material[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      materialName: 'Cement',
      specification: 'OPC 53 Grade',
      unit: 'Bags',
      quantityUsed: 250,
      workDetails: 'Foundation work',
      remarks: 'Delivered on site'
    },
    {
      id: '2',
      slNo: 2,
      materialName: 'Steel',
      specification: 'TMT 500D',
      unit: 'MT',
      quantityUsed: 5.5,
      workDetails: 'Structural work',
      remarks: 'Quality approved'
    },
    {
      id: '3',
      slNo: 3,
      materialName: 'Sand',
      specification: 'River Sand',
      unit: 'Cum',
      quantityUsed: 45,
      workDetails: 'Concrete mixing',
      remarks: 'Available in stock'
    }
  ], []);

  const dummyLabours: Labour[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      labourDetails: 'Mason',
      unit: 'Nos',
      quantity: 8,
      otQuantity: 2,
      labourContractor: 'ABC Contractors',
      ratePerUnit: 800,
      remarks: 'Regular shift'
    },
    {
      id: '2',
      slNo: 2,
      labourDetails: 'Carpenter',
      unit: 'Nos',
      quantity: 4,
      otQuantity: 0,
      labourContractor: 'XYZ Builders',
      ratePerUnit: 750,
      remarks: 'Formwork installation'
    },
    {
      id: '3',
      slNo: 3,
      labourDetails: 'Helper',
      unit: 'Nos',
      quantity: 12,
      otQuantity: 3,
      labourContractor: 'ABC Contractors',
      ratePerUnit: 500,
      remarks: 'Material handling'
    }
  ], []);

  const dummyMachineries: Machinery[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      machineryName: 'Excavator',
      specification: 'JCB 3DX',
      unit: 'Hrs',
      quantity: 8,
      contractor: 'Heavy Equipment Co.',
      ratePerUnit: 1200,
      remarks: 'Site excavation'
    },
    {
      id: '2',
      slNo: 2,
      machineryName: 'Concrete Mixer',
      specification: '10/7 Capacity',
      unit: 'Hrs',
      quantity: 6,
      contractor: 'Machinery Rentals',
      ratePerUnit: 800,
      remarks: 'Concrete preparation'
    },
    {
      id: '3',
      slNo: 3,
      machineryName: 'Crane',
      specification: '25 Ton',
      unit: 'Hrs',
      quantity: 4,
      contractor: 'Lifting Solutions',
      ratePerUnit: 2500,
      remarks: 'Material lifting'
    }
  ], []);

  const dummyHinderances: Hinderance[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      hinderanceTitle: 'Heavy Rainfall',
      concernTeamMembers: 'Site Engineer, Supervisor',
      remarks: 'Work delayed by 2 hours'
    },
    {
      id: '2',
      slNo: 2,
      hinderanceTitle: 'Material Delay',
      concernTeamMembers: 'Store Keeper, Project Manager',
      remarks: 'Steel delivery delayed by 1 day'
    }
  ], []);

  const dummySafeties: Safety[] = useMemo(() => [
    {
      id: '1',
      slNo: 1,
      safetyTitle: 'Safety Helmet Check',
      concernTeamMembers: 'Safety Officer, Site Engineer',
      remarks: 'All workers wearing helmets'
    },
    {
      id: '2',
      slNo: 2,
      safetyTitle: 'Scaffolding Inspection',
      concernTeamMembers: 'Safety Officer, Supervisor',
      remarks: 'Scaffolding properly secured'
    },
    {
      id: '3',
      slNo: 3,
      safetyTitle: 'Fire Safety Equipment',
      concernTeamMembers: 'Safety Officer',
      remarks: 'Fire extinguishers checked and functional'
    }
  ], []);

  // Data states - will be populated from APIs later
  const [activities, setActivities] = useState<Activity[]>(dummyActivities);
  const [materials, setMaterials] = useState<Material[]>(dummyMaterials);
  const [labours, setLabours] = useState<Labour[]>(dummyLabours);
  const [machineries, setMachineries] = useState<Machinery[]>(dummyMachineries);
  const [hinderances, setHinderances] = useState<Hinderance[]>(dummyHinderances);
  const [safeties, setSafeties] = useState<Safety[]>(dummySafeties);
  
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{ name: string; designation: string }>>([]);
  
  const isDark = theme === 'dark';
  const cardClass = isDark ? 'card-dark' : 'card-light';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgPrimary = isDark ? 'bg-slate-900' : 'bg-white';
  const bgSecondary = isDark ? 'bg-slate-800' : 'bg-slate-50';

  // Load projects from Projects component (localStorage)
  useEffect(() => {
    const loadProjects = () => {
      const defaultProjectNames = [
        'Lotus Rise',
        'Lakeshire',
        'Demo Data',
        'Residential Complex A',
        'Commercial Tower B'
      ];

      const savedProjects = localStorage.getItem('projects');
      let userProjectNames: string[] = [];
      
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          userProjectNames = parsed.map((project: { name: string }) => project.name);
        } catch (e) {
          console.error('Error parsing projects:', e);
        }
      }

      const allProjects = [...new Set([...defaultProjectNames, ...userProjectNames])];
      setAvailableProjects(allProjects);
    };

    loadProjects();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {
        loadProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', loadProjects);
    const interval = setInterval(loadProjects, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', loadProjects);
      clearInterval(interval);
    };
  }, []);

  // Load employees from ManageTeams component (localStorage)
  useEffect(() => {
    const loadEmployees = () => {
      const defaultEmployees = [
        { name: 'test', designation: 'Project Manager' },
        { name: 'Maruti Patil', designation: 'Supervisor' }
      ];

      const savedUsers = localStorage.getItem('manageTeamsUsers');
      let users: Array<{ name: string; designation: string }> = [];
      
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          users = parsed.map((user: { name: string; roleType: string }) => ({
            name: user.name,
            designation: user.roleType
          }));
        } catch (e) {
          console.error('Error parsing users:', e);
        }
      }

      const allEmployees = [...defaultEmployees, ...users];
      const uniqueEmployees = Array.from(
        new Map(allEmployees.map(emp => [emp.name, emp])).values()
      );
      setAvailableEmployees(uniqueEmployees.map(emp => ({
        name: `${emp.name} - ${emp.designation}`,
        designation: emp.designation
      })));
    };

    loadEmployees();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'manageTeamsUsers') {
        loadEmployees();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('usersUpdated', loadEmployees);
    const interval = setInterval(loadEmployees, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('usersUpdated', loadEmployees);
      clearInterval(interval);
    };
  }, []);

  // TODO: Fetch data from APIs when filters change
  useEffect(() => {
    // This will be replaced with API calls
    // fetchDPRData(selectedProject, selectedEmployee, fromDate);
    // For now, using dummy data for preview
    // When API is ready, replace the state setters with API response
    // setActivities(apiResponse.activities);
    // setMaterials(apiResponse.materials);
    // etc.
  }, [selectedProject, selectedEmployee, fromDate]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPDFContent = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Progress Report (DPR)</title>
          <style>
            @media print {
              @page {
                margin: 15mm;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              font-size: 10px;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 15px;
            }
            .info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              font-size: 11px;
              margin-bottom: 10px;
            }
            .info p {
              margin: 3px 0;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              background-color: #f0f0f0;
              padding: 8px;
              border: 1px solid #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #000;
              padding: 5px;
              text-align: left;
            }
            th {
              background-color: #e0e0e0;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .empty-row {
              height: 30px;
            }
            .attached-photos {
              margin-top: 15px;
            }
            .photo-category {
              margin-bottom: 10px;
              font-weight: bold;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Daily Progress Report (DPR)</div>
            <div class="info">
              <p><strong>Project:</strong> ${selectedProject}</p>
              <p><strong>Employee:</strong> ${selectedEmployee}</p>
              <p><strong>Date:</strong> ${new Date(fromDate).toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          <!-- Activities Section -->
          <div class="section">
            <div class="section-title">Activities</div>
            <table>
              <thead>
                <tr>
                  <th>Sl.no</th>
                  <th>Activities</th>
                  <th>Unit</th>
                  <th class="text-right">Estimate Qty</th>
                  <th class="text-right">Est Rate</th>
                  <th class="text-right">Est. Amount</th>
                  <th class="text-right">Completed Qty</th>
                  <th class="text-right">Est. Amount for Completion</th>
                  <th class="text-right">% Completion</th>
                  <th class="text-right">Balance qty</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${activities.length > 0 ? activities.map(activity => `
                  <tr>
                    <td>${activity.slNo}</td>
                    <td>${activity.activities}</td>
                    <td>${activity.unit}</td>
                    <td class="text-right">${activity.estimateQty}</td>
                    <td class="text-right">${formatNumber(activity.estRate)}</td>
                    <td class="text-right">${formatNumber(activity.estAmount)}</td>
                    <td class="text-right">${formatNumber(activity.completedQty)}</td>
                    <td class="text-right">${formatNumber(activity.estAmountForCompletion)}</td>
                    <td class="text-right">${formatNumber(activity.completionPercentage)}</td>
                    <td class="text-right">${formatNumber(activity.balanceQty)}</td>
                    <td>${activity.remarks || ''}</td>
                  </tr>
                `).join('') : '<tr><td colspan="11" class="text-center empty-row">No data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Materials Section -->
          <div class="section">
            <div class="section-title">Materials</div>
            <table>
              <thead>
                <tr>
                  <th>Sl.no</th>
                  <th>Materials Names</th>
                  <th>Specification</th>
                  <th>Unit</th>
                  <th class="text-right">Quantity Used</th>
                  <th>Work details</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${materials.length > 0 ? materials.map(material => `
                  <tr>
                    <td>${material.slNo}</td>
                    <td>${material.materialName}</td>
                    <td>${material.specification}</td>
                    <td>${material.unit}</td>
                    <td class="text-right">${formatNumber(material.quantityUsed)}</td>
                    <td>${material.workDetails}</td>
                    <td>${material.remarks || ''}</td>
                  </tr>
                `).join('') : '<tr><td colspan="7" class="text-center empty-row">No data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Labour Section -->
          <div class="section">
            <div class="section-title">Labour</div>
            <table>
              <thead>
                <tr>
                  <th>Sl.no</th>
                  <th>Labour Details</th>
                  <th>Unit</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">OT Quantity</th>
                  <th>Labour Contractor</th>
                  <th class="text-right">Rate/Unit</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${labours.length > 0 ? labours.map(labour => `
                  <tr>
                    <td>${labour.slNo}</td>
                    <td>${labour.labourDetails}</td>
                    <td>${labour.unit}</td>
                    <td class="text-right">${formatNumber(labour.quantity)}</td>
                    <td class="text-right">${formatNumber(labour.otQuantity)}</td>
                    <td>${labour.labourContractor}</td>
                    <td class="text-right">${formatNumber(labour.ratePerUnit)}</td>
                    <td>${labour.remarks || ''}</td>
                  </tr>
                `).join('') : '<tr><td colspan="8" class="text-center empty-row">No data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Machinery Section -->
          <div class="section">
            <div class="section-title">Machinery</div>
            <table>
              <thead>
                <tr>
                  <th>Sl.no</th>
                  <th>Machinery Names</th>
                  <th>Specification</th>
                  <th>Unit</th>
                  <th class="text-right">Quantity</th>
                  <th>Contractor</th>
                  <th class="text-right">Rate/Unit</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${machineries.length > 0 ? machineries.map(machinery => `
                  <tr>
                    <td>${machinery.slNo}</td>
                    <td>${machinery.machineryName}</td>
                    <td>${machinery.specification}</td>
                    <td>${machinery.unit}</td>
                    <td class="text-right">${formatNumber(machinery.quantity)}</td>
                    <td>${machinery.contractor}</td>
                    <td class="text-right">${formatNumber(machinery.ratePerUnit)}</td>
                    <td>${machinery.remarks || ''}</td>
                  </tr>
                `).join('') : '<tr><td colspan="8" class="text-center empty-row">No data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Hinderances Section -->
          <div class="section">
            <div class="section-title">Hinderances</div>
            <table>
              <thead>
                <tr>
                  <th>Sl.no</th>
                  <th>Hinderances Title</th>
                  <th>Concern Team Members</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${hinderances.length > 0 ? hinderances.map(hinderance => `
                  <tr>
                    <td>${hinderance.slNo}</td>
                    <td>${hinderance.hinderanceTitle}</td>
                    <td>${hinderance.concernTeamMembers}</td>
                    <td>${hinderance.remarks || ''}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="text-center empty-row">No data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Safety Section -->
          <div class="section">
            <div class="section-title">Safety</div>
            <table>
              <thead>
                <tr>
                  <th>Sl.no</th>
                  <th>Safety Title</th>
                  <th>Concern Team Members</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${safeties.length > 0 ? safeties.map(safety => `
                  <tr>
                    <td>${safety.slNo}</td>
                    <td>${safety.safetyTitle}</td>
                    <td>${safety.concernTeamMembers}</td>
                    <td>${safety.remarks || ''}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="text-center empty-row">No data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Attached Photos Section -->
          <div class="section">
            <div class="section-title">Attached Photos</div>
            <div class="attached-photos">
              <div class="photo-category">Safety</div>
              <div class="photo-category">Hinderances</div>
              <div class="photo-category">Activities</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = () => {
    const printContent = getPDFContent();
    
    // Create a hidden iframe for PDF generation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      // Wait for content to load, then trigger print dialog for PDF save
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        
        // Clean up iframe after print dialog is shown
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#6B8E23]/10' : 'bg-[#6B8E23]/5'}`}>
            <ClipboardCheck className="w-6 h-6 text-[#6B8E23]" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Daily Progress Report (DPR)</h1>
            <p className={`text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1 ${textSecondary}`}>
              Track daily work progress and activities
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Project <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                {availableProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Employee <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              >
                {availableEmployees.map((emp, idx) => (
                  <option key={idx} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-bold mb-2 ${textPrimary}`}>
              Select From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} focus:ring-2 focus:ring-[#6B8E23]/20 outline-none`}
              />
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExportPDF}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
            >
              <FileDown className="w-4 h-4" /> Export to PDF
            </button>
          </div>
        </div>
      </div>

      {/* Activities Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Activities</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sl.no</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Activities</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Estimate Qty</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Est Rate</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Est. Amount</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Completed Qty</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Est. Amount for Completion</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>% Completion</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Balance qty</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <tr key={activity.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{activity.slNo}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{activity.activities}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{activity.unit}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{activity.estimateQty}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(activity.estRate)}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(activity.estAmount)}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(activity.completedQty)}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(activity.estAmountForCompletion)}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(activity.completionPercentage)}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(activity.balanceQty)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{activity.remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className={`px-4 py-8 text-center ${textSecondary}`}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Materials Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Materials</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sl.no</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Materials Names</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity Used</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Work details</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {materials.length > 0 ? (
                materials.map((material) => (
                  <tr key={material.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{material.slNo}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{material.materialName}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{material.specification}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{material.unit}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(material.quantityUsed)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{material.workDetails}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{material.remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-4 py-8 text-center ${textSecondary}`}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labour Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Labour</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sl.no</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Labour Details</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>OT Quantity</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Labour Contractor</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate/Unit</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {labours.length > 0 ? (
                labours.map((labour) => (
                  <tr key={labour.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{labour.slNo}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{labour.labourDetails}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{labour.unit}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(labour.quantity)}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(labour.otQuantity)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{labour.labourContractor}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(labour.ratePerUnit)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{labour.remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={`px-4 py-8 text-center ${textSecondary}`}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Machinery Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Machinery</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sl.no</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Machinery Names</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Specification</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Unit</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Quantity</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Contractor</th>
                <th className={`px-4 py-3 text-right text-xs font-black uppercase tracking-wider ${textSecondary}`}>Rate/Unit</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {machineries.length > 0 ? (
                machineries.map((machinery) => (
                  <tr key={machinery.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{machinery.slNo}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{machinery.machineryName}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{machinery.specification}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{machinery.unit}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(machinery.quantity)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{machinery.contractor}</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${textPrimary}`}>{formatNumber(machinery.ratePerUnit)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{machinery.remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={`px-4 py-8 text-center ${textSecondary}`}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hinderances Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Hinderances</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sl.no</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Hinderances Title</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Concern Team Members</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {hinderances.length > 0 ? (
                hinderances.map((hinderance) => (
                  <tr key={hinderance.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{hinderance.slNo}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{hinderance.hinderanceTitle}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{hinderance.concernTeamMembers}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{hinderance.remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={`px-4 py-8 text-center ${textSecondary}`}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Safety</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Sl.no</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Safety Title</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Concern Team Members</th>
                <th className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider ${textSecondary}`}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {safeties.length > 0 ? (
                safeties.map((safety) => (
                  <tr key={safety.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{safety.slNo}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{safety.safetyTitle}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{safety.concernTeamMembers}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${textPrimary}`}>{safety.remarks || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={`px-4 py-8 text-center ${textSecondary}`}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attached Photos Section */}
      <div className={`rounded-xl border ${cardClass} p-4`}>
        <h2 className={`text-lg font-black mb-4 ${textPrimary}`}>Attached Photos :</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-sm font-bold mb-2 ${textPrimary}`}>Safety</h3>
            <p className={`text-xs ${textSecondary}`}>No photos attached</p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-sm font-bold mb-2 ${textPrimary}`}>Hinderances</h3>
            <p className={`text-xs ${textSecondary}`}>No photos attached</p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-sm font-bold mb-2 ${textPrimary}`}>Activities</h3>
            <p className={`text-xs ${textSecondary}`}>No photos attached</p>
          </div>
        </div>
      </div>

      {/* Export to PDF Button at Bottom */}
      <div className="flex justify-center">
        <button
          onClick={handleExportPDF}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${isDark ? 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white' : 'bg-[#6B8E23] hover:bg-[#5a7a1e] text-white'} shadow-md`}
        >
          <FileDown className="w-5 h-5" /> Generate PDF
        </button>
      </div>
    </div>
  );
};

export default DPR;
