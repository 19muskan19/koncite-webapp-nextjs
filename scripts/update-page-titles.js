const fs = require('fs');
const path = require('path');

// List of all page files that need to be updated
const pagesToUpdate = [
  'app/labour-strength/page.tsx',
  'app/company-users/manage-teams/page.tsx',
  'app/company-users/user-roles-permissions/page.tsx',
  'app/masters/materials/page.tsx',
  'app/masters/activities/page.tsx',
  'app/masters/vendors/page.tsx',
  'app/masters/assets-equipments/page.tsx',
  'app/masters/labours/page.tsx',
  'app/masters/warehouses/page.tsx',
  'app/masters/units/page.tsx',
  'app/masters/subproject/page.tsx',
  'app/pr-management/pr/page.tsx',
  'app/pr-management/pr-approval-manage/page.tsx',
  'app/inventory-reports/rfq/page.tsx',
  'app/inventory-reports/pr/page.tsx',
  'app/inventory-reports/grn-mrn-slip/page.tsx',
  'app/inventory-reports/grn-mrn-details/page.tsx',
  'app/inventory-reports/issue-slip/page.tsx',
  'app/inventory-reports/issue-outward-details/page.tsx',
  'app/inventory-reports/issue-return/page.tsx',
  'app/inventory-reports/global-stock-details/page.tsx',
  'app/inventory-reports/project-stock-statement/page.tsx',
  'app/work-progress-reports/dpr/page.tsx',
  'app/work-progress-reports/work-progress-details/page.tsx',
  'app/work-progress-reports/material-used-vs-store-issue/page.tsx',
  'app/work-progress-reports/resources-usage-from-dpr/page.tsx',
];

const importStatement = "import { usePageTitle } from '@/hooks/usePageTitle';";
const hookCall = "  usePageTitle();";

pagesToUpdate.forEach((pagePath) => {
  const fullPath = path.join(process.cwd(), pagePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${pagePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already updated
  if (content.includes('usePageTitle')) {
    console.log(`Skipping ${pagePath} - already updated`);
    return;
  }

  // Find the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    console.log(`Warning: No imports found in ${pagePath}`);
    return;
  }

  // Add the import after the last import
  importLines.splice(lastImportIndex + 1, 0, importStatement);

  // Find the function declaration and add the hook call
  const updatedContent = importLines.join('\n');
  const functionMatch = updatedContent.match(/export default function \w+\(\) \{/);
  
  if (functionMatch) {
    const functionIndex = updatedContent.indexOf(functionMatch[0]);
    const afterFunction = updatedContent.indexOf('{', functionIndex) + 1;
    const beforeFirstLine = updatedContent.indexOf('\n', afterFunction);
    
    const newContent = 
      updatedContent.slice(0, beforeFirstLine + 1) +
      hookCall + '\n' +
      updatedContent.slice(beforeFirstLine + 1);
    
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`Updated ${pagePath}`);
  } else {
    console.log(`Warning: Could not find function declaration in ${pagePath}`);
  }
});

console.log('Done updating page titles!');
