# Next.js Routing Setup

This application has been converted to use Next.js App Router with proper routing.

## Routes Structure

### Main Routes:
- `/` - Home/Login page
- `/dashboard` - Dashboard page

### Masters Routes:
- `/masters/companies` - Companies management
- `/masters/projects` - Projects management
- `/masters/subproject` - Subprojects
- `/masters/units` - Units
- `/masters/warehouses` - Warehouses
- `/masters/labours` - Labours
- `/masters/assets-equipments` - Assets & Equipment
- `/masters/vendors` - Vendors
- `/masters/activities` - Activities
- `/masters/materials` - Materials

### Company Users Routes:
- `/company-users/manage-teams` - Manage Teams
- `/company-users/user-roles-permissions` - User Roles & Permissions

### Project Permissions:
- `/project-permissions` - Project Permissions

### PR Management Routes:
- `/pr-management/pr-approval-manage` - PR Approval Management
- `/pr-management/pr` - PR

### Work Progress Reports Routes:
- `/work-progress-reports/work-progress-details` - Work Progress Details
- `/work-progress-reports/dpr` - DPR
- `/work-progress-reports/resources-usage-from-dpr` - Resources Usage from DPR
- `/work-progress-reports/material-used-vs-store-issue` - Material Used vs Store Issue

### Inventory Reports Routes:
- `/inventory-reports/pr` - PR
- `/inventory-reports/rfq` - RFQ
- `/inventory-reports/grn-mrn-slip` - GRN(MRN) Slip
- `/inventory-reports/grn-mrn-details` - GRN(MRN) Details
- `/inventory-reports/issue-slip` - Issue Slip
- `/inventory-reports/issue-outward-details` - Issue(Outward) Details
- `/inventory-reports/issue-return` - Issue Return
- `/inventory-reports/global-stock-details` - Global Stock Details
- `/inventory-reports/project-stock-statement` - Project Stock Statement

### Other Routes:
- `/labour-strength` - Labour Strength
- `/work-contractor` - Work Contractor
- `/labour-management` - Labour Management
- `/document-management` - Document Management
- `/ai-agents` - AI Agents
- `/subscription` - Subscription

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Start production server:
```bash
npm start
```

## Features

- ✅ Next.js App Router
- ✅ Client-side routing with Link components
- ✅ Protected routes (authentication check)
- ✅ Shared layout with sidebar and header
- ✅ Dynamic navigation highlighting
- ✅ Theme support (dark/light mode)

## Notes

- All pages are client components (`'use client'`)
- Authentication is handled via localStorage
- The sidebar navigation automatically highlights the active route
- All routes are protected and redirect to `/` if not authenticated
