import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Map of routes to their page titles
const routeTitles: Record<string, string> = {
  '/': 'KONCITE - Construction Platform',
  '/dashboard': 'Dashboard - KONCITE',
  '/document-management': 'Document Management - KONCITE',
  '/ai-agents': 'AI Agents - KONCITE',
  '/labour-management': 'Labour Management - KONCITE',
  '/operations/labour': 'Labour Management - KONCITE',
  '/labour-strength': 'Labour Strength - KONCITE',
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
  '/pr-management/pr': 'PR Management - KONCITE',
  '/pr-management/pr-approval-manage': 'PR Approval Management - KONCITE',
  '/inventory-reports/rfq': 'RFQ - KONCITE',
  '/inventory-reports/pr': 'PR - KONCITE',
  '/inventory-reports/grn-mrn-slip': 'GRN/MRN Slip - KONCITE',
  '/inventory-reports/grn-mrn-details': 'GRN/MRN Details - KONCITE',
  '/inventory-reports/issue-slip': 'Issue Slip - KONCITE',
  '/inventory-reports/issue-outward-details': 'Issue Outward Details - KONCITE',
  '/inventory-reports/issue-return': 'Issue Return - KONCITE',
  '/inventory-reports/global-stock-details': 'Global Stock Details - KONCITE',
  '/inventory-reports/project-stock-statement': 'Project Stock Statement - KONCITE',
  '/work-progress-reports/dpr': 'DPR - KONCITE',
  '/work-progress-reports/work-progress-details': 'Work Progress Details - KONCITE',
  '/work-progress-reports/material-used-vs-store-issue': 'Material Used vs Store Issue - KONCITE',
  '/work-progress-reports/resources-usage-from-dpr': 'Resources Usage from DPR - KONCITE',
};

export const usePageTitle = (customTitle?: string) => {
  const pathname = usePathname();

  useEffect(() => {
    const title = customTitle || (pathname ? routeTitles[pathname] : undefined) || 'KONCITE - Construction Platform';
    document.title = title;
  }, [pathname, customTitle]);
};

// Helper function to get title from route
export const getPageTitle = (pathname: string): string => {
  return routeTitles[pathname] || 'KONCITE - Construction Platform';
};
