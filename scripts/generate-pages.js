const fs = require('fs');
const path = require('path');

const routes = [
  // Masters
  { viewType: 'UNITS', path: 'app/masters/units', component: 'Masters' },
  { viewType: 'WAREHOUSES', path: 'app/masters/warehouses', component: 'Masters' },
  { viewType: 'LABOURS', path: 'app/masters/labours', component: 'Masters' },
  { viewType: 'ASSETS_EQUIPMENTS', path: 'app/masters/assets-equipments', component: 'Masters' },
  { viewType: 'VENDORS', path: 'app/masters/vendors', component: 'Masters' },
  { viewType: 'ACTIVITIES', path: 'app/masters/activities', component: 'Masters' },
  { viewType: 'MATERIALS', path: 'app/masters/materials', component: 'Masters' },
  
  // Company Users
  { viewType: 'USER_ROLES_PERMISSIONS', path: 'app/company-users/user-roles-permissions', component: 'GenericView' },
  
  // Project Permissions
  { viewType: 'PROJECT_PERMISSIONS', path: 'app/project-permissions', component: 'GenericView' },
  
  // PR Management
  { viewType: 'PR_APPROVAL_MANAGE', path: 'app/pr-management/pr-approval-manage', component: 'GenericView' },
  { viewType: 'PR', path: 'app/pr-management/pr', component: 'GenericView' },
  
  // Work Progress Reports
  { viewType: 'DPR', path: 'app/work-progress-reports/dpr', component: 'GenericView' },
  { viewType: 'RESOURCES_USAGE_FROM_DPR', path: 'app/work-progress-reports/resources-usage-from-dpr', component: 'GenericView' },
  { viewType: 'MATERIAL_USED_VS_STORE_ISSUE', path: 'app/work-progress-reports/material-used-vs-store-issue', component: 'GenericView' },
  
  // Inventory Reports
  { viewType: 'INVENTORY_RFQ', path: 'app/inventory-reports/rfq', component: 'GenericView' },
  { viewType: 'INVENTORY_GRN_MRN_SLIP', path: 'app/inventory-reports/grn-mrn-slip', component: 'GenericView' },
  { viewType: 'INVENTORY_GRN_MRN_DETAILS', path: 'app/inventory-reports/grn-mrn-details', component: 'GenericView' },
  { viewType: 'INVENTORY_ISSUE_SLIP', path: 'app/inventory-reports/issue-slip', component: 'GenericView' },
  { viewType: 'INVENTORY_ISSUE_OUTWARD_DETAILS', path: 'app/inventory-reports/issue-outward-details', component: 'GenericView' },
  { viewType: 'INVENTORY_ISSUE_RETURN', path: 'app/inventory-reports/issue-return', component: 'GenericView' },
  { viewType: 'INVENTORY_GLOBAL_STOCK_DETAILS', path: 'app/inventory-reports/global-stock-details', component: 'GenericView' },
  { viewType: 'INVENTORY_PROJECT_STOCK_STATEMENT', path: 'app/inventory-reports/project-stock-statement', component: 'GenericView' },
  
  // Other pages
  { viewType: 'LABOUR_STRENGTH', path: 'app/labour-strength', component: 'GenericView' },
  { viewType: 'WORK_CONTRACTOR', path: 'app/work-contractor', component: 'GenericView' },
  { viewType: 'LABOUR_MANAGEMENT', path: 'app/labour-management', component: 'GenericView' },
  { viewType: 'DOCUMENT_MANAGEMENT', path: 'app/document-management', component: 'GenericView' },
  { viewType: 'AI_AGENTS', path: 'app/ai-agents', component: 'GenericView' },
  { viewType: 'SUBSCRIPTION', path: 'app/subscription', component: 'GenericView' },
];

const pageTemplate = (viewType, componentName) => `'use client';

import AppLayout from '@/components/AppLayout';
import ${componentName} from '@/components/${componentName}';
import { useTheme } from '@/contexts/ThemeContext';
import { ViewType } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function ${viewType}Page() {
  const { theme } = useTheme();
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <${componentName} theme={theme} currentView={ViewType.${viewType}} />
    </AppLayout>
  );
}
`;

routes.forEach(route => {
  const filePath = path.join(route.path, 'page.tsx');
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, pageTemplate(route.viewType, route.component));
  console.log(`Created ${filePath}`);
});

console.log('All pages generated successfully!');
