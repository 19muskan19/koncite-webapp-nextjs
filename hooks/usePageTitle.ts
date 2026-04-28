import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Map of routes to their page titles
const routeTitles: Record<string, string> = {
  '/': 'KONCITE - Construction Platform',
  '/dashboard': 'Dashboard - KONCITE',
  '/pre-construction/ai-tendering': 'Ai-Tendering - KONCITE',
  '/document-management': 'Document Management - KONCITE',
  '/ai-finance': 'AI Finance - KONCITE',
  '/askme': 'Ask me - KONCITE',
  '/ai-agents': 'AI Agents - KONCITE',
  '/ai-agents/dpr': 'DPR - AI Hub - KONCITE',
  '/ai-agents/inventory': 'Inventory - AI Hub - KONCITE',
  '/labour-management': 'Labour Management - KONCITE',
  '/operations/labour': 'Labour Management - KONCITE',
  '/operations/workforce-management': 'Workforce - KONCITE',
  '/operations/task': 'Task - KONCITE',
  '/labour-strength': 'Labour Strength - KONCITE',
  '/profile': 'Profile - KONCITE',
  '/subscription': 'Subscription - KONCITE',
  '/project-permissions': 'Project Permissions - KONCITE',
  '/company-users/manage-teams': 'Manage Teams - KONCITE',
  '/company-users/user-roles-permissions': 'User Roles & Permissions - KONCITE',
  '/masters': 'Masters - KONCITE',
  '/masters/projects': 'Projects - KONCITE',
  '/masters/companies': 'Companies - KONCITE',
  '/masters/materials': 'Materials - KONCITE',
  '/masters/activities': 'Activities - KONCITE',
  '/masters/vendors': 'Vendors - KONCITE',
  '/masters/assets-equipments': 'Assets & Equipments - KONCITE',
  '/masters/labours': 'Labours - KONCITE',
  '/masters/warehouses': 'Warehouses - KONCITE',
  '/masters/units': 'Units - KONCITE',
  '/masters/subproject': 'Subproject - KONCITE',
  '/work-contractor': 'Work Contractor - KONCITE',
  '/pr-management/pr': 'PR - KONCITE',
  '/pr-approval': 'PR Approvals - KONCITE',
  '/pr-approval-manage': 'PR Approval — Manage allocation - KONCITE',
  '/pr-management/pr-approval-manage': 'PR Approval — Project & User Allocation - KONCITE',
  '/inventory-reports/rfq': 'RFQ - KONCITE',
  '/inventory-reports/rfq-report': 'RFQ Report - KONCITE',
  '/inventory-reports/pr': 'PR - KONCITE',
  '/inventory-reports/pr-report': 'Indent (PR) Report - KONCITE',
  '/inventory-reports/grn-mrn-slip': 'GRN/MRN Slip - KONCITE',
  '/inventory-reports/grn-slip-report': 'GRN Slip Report - KONCITE',
  '/inventory-reports/grn-mrn-details': 'GRN/MRN Details - KONCITE',
  '/inventory-reports/grn-details-report': 'GRN Details Report - KONCITE',
  '/inventory-reports/issue-slip': 'Issue Slip - KONCITE',
  '/inventory-reports/issue-slip-report': 'Issue Slip Report - KONCITE',
  '/inventory-reports/issue-outward-details': 'Issue Outward Details - KONCITE',
  '/inventory-reports/issue-outward-details-report': 'Issue Outward Details Report - KONCITE',
  '/inventory-reports/issue-return': 'Issue Return - KONCITE',
  '/inventory-reports/issue-return-report': 'Issue Return Report - KONCITE',
  '/inventory-reports/po': 'Purchase Order (PO) - KONCITE',
  '/inventory-reports/po-approvals': 'PO Approvals - KONCITE',
  '/inventory-reports/global-stock-details': 'Global Stock Details - KONCITE',
  '/inventory-reports/project-stock-statement': 'Project Stock Statement - KONCITE',
  '/work-progress-reports': 'DPR - KONCITE',
  '/work-progress-reports/work-progress-details': 'Work Progress Details - KONCITE',
  '/work-progress-reports/material-used-vs-store-issue': 'Material Used vs Store Issue - KONCITE',
  '/work-progress-reports/resources-usage-from-dpr': 'Resources Usage from DPR - KONCITE',
};

export const usePageTitle = (customTitle?: string) => {
  const pathname = usePathname();

  useEffect(() => {
    const exactTitle = pathname ? routeTitles[pathname] : undefined;
    const docMgmtTitle = pathname?.startsWith('/document-management') ? 'Document Management - KONCITE' : undefined;
    const rfqSubmitTitle = pathname?.match(/^\/inventory-reports\/rfq\/[^/]+\/submit-quotes/) ? 'Submit Quotes - RFQ - KONCITE' : undefined;
    const rfqCreateTitle = pathname?.startsWith('/inventory-reports/rfq/create') ? 'Create RFQ - KONCITE' : undefined;
    const prApprovalDetailTitle = pathname?.match(/^\/pr-approval\/[^/]+$/) ? 'PR details - KONCITE' : undefined;
    const title =
      customTitle ||
      exactTitle ||
      rfqSubmitTitle ||
      rfqCreateTitle ||
      prApprovalDetailTitle ||
      docMgmtTitle ||
      'KONCITE - Construction Platform';
    document.title = title;
  }, [pathname, customTitle]);
};

// Helper function to get title from route
export const getPageTitle = (pathname: string): string => {
  return routeTitles[pathname] || 'KONCITE - Construction Platform';
};
