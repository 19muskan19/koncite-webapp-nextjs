const fs = require('fs');
const path = require('path');

// Color replacement mappings
const colorReplacements = [
  // Indigo to Green
  { from: /bg-indigo-600/g, to: 'bg-[#6B8E23]' },
  { from: /bg-indigo-500/g, to: 'bg-[#6B8E23]' },
  { from: /bg-indigo-700/g, to: 'bg-[#5a7a1e]' },
  { from: /bg-indigo-400/g, to: 'bg-[#6B8E23]' },
  { from: /bg-indigo-100/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-indigo-50/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-indigo-500\/10/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-indigo-500\/5/g, to: 'bg-[#6B8E23]/5' },
  { from: /bg-indigo-500\/20/g, to: 'bg-[#6B8E23]/20' },
  { from: /bg-indigo-500\/30/g, to: 'bg-[#6B8E23]/30' },
  
  { from: /text-indigo-600/g, to: 'text-[#6B8E23]' },
  { from: /text-indigo-500/g, to: 'text-[#6B8E23]' },
  { from: /text-indigo-400/g, to: 'text-[#6B8E23]' },
  
  { from: /border-indigo-600/g, to: 'border-[#6B8E23]' },
  { from: /border-indigo-500/g, to: 'border-[#6B8E23]' },
  { from: /border-indigo-400/g, to: 'border-[#6B8E23]' },
  { from: /border-indigo-300/g, to: 'border-[#6B8E23]/30' },
  { from: /border-indigo-500\/30/g, to: 'border-[#6B8E23]/30' },
  { from: /border-indigo-500\/50/g, to: 'border-[#6B8E23]/50' },
  
  { from: /hover:bg-indigo-700/g, to: 'hover:bg-[#5a7a1e]' },
  { from: /hover:bg-indigo-600/g, to: 'hover:bg-[#6B8E23]' },
  
  // Purple to Green
  { from: /bg-purple-600/g, to: 'bg-[#6B8E23]' },
  { from: /bg-purple-500/g, to: 'bg-[#6B8E23]' },
  { from: /bg-purple-700/g, to: 'bg-[#5a7a1e]' },
  { from: /bg-purple-400/g, to: 'bg-[#6B8E23]' },
  { from: /bg-purple-100/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-purple-50/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-purple-900\/30/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-purple-800\/50/g, to: 'bg-[#6B8E23]/20' },
  { from: /bg-purple-600\/20/g, to: 'bg-[#6B8E23]/20' },
  { from: /bg-purple-500\/20/g, to: 'bg-[#6B8E23]/20' },
  { from: /bg-purple-500\/10/g, to: 'bg-[#6B8E23]/10' },
  { from: /bg-purple-500\/5/g, to: 'bg-[#6B8E23]/5' },
  
  { from: /text-purple-600/g, to: 'text-[#6B8E23]' },
  { from: /text-purple-500/g, to: 'text-[#6B8E23]' },
  { from: /text-purple-400/g, to: 'text-[#6B8E23]' },
  { from: /text-purple-700/g, to: 'text-[#6B8E23]' },
  { from: /text-purple-800/g, to: 'text-[#5a7a1e]' },
  { from: /text-purple-200/g, to: 'text-[#6B8E23]' },
  
  { from: /border-purple-600/g, to: 'border-[#6B8E23]' },
  { from: /border-purple-500/g, to: 'border-[#6B8E23]' },
  { from: /border-purple-400/g, to: 'border-[#6B8E23]' },
  { from: /border-purple-300/g, to: 'border-[#6B8E23]/30' },
  { from: /border-purple-200/g, to: 'border-[#6B8E23]/10' },
  { from: /border-purple-800/g, to: 'border-[#6B8E23]/20' },
  { from: /border-purple-500\/30/g, to: 'border-[#6B8E23]/30' },
  { from: /border-purple-500\/50/g, to: 'border-[#6B8E23]/50' },
  
  { from: /hover:bg-purple-700/g, to: 'hover:bg-[#5a7a1e]' },
  { from: /hover:bg-purple-600/g, to: 'hover:bg-[#6B8E23]' },
  { from: /hover:bg-purple-100/g, to: 'hover:bg-[#6B8E23]/10' },
  
  { from: /focus:ring-indigo-500\/20/g, to: 'focus:ring-[#6B8E23]/20' },
  { from: /focus:ring-purple-500\/20/g, to: 'focus:ring-[#6B8E23]/20' },
];

// Files to update
const componentFiles = [
  'components/masters/Subproject.tsx',
  'components/masters/Units.tsx',
  'components/masters/Warehouses.tsx',
  'components/masters/Labours.tsx',
  'components/masters/AssetsEquipments.tsx',
  'components/masters/Vendors.tsx',
  'components/masters/Activities.tsx',
  'components/masters/Materials.tsx',
  'components/Masters.tsx',
  'components/Dashboard.tsx',
];

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;
  
  colorReplacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });
  
  if (updated) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

// Update all files
componentFiles.forEach(updateFile);
console.log('Theme color update complete!');
