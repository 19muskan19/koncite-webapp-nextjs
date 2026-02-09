# Azure Folder Path Generation - Frontend Implementation

## Backend API Specification

**Endpoint**: `POST /api/project-add`  
**Controller**: `App\Http\Controllers\API\ProjectController::projectAdd()`  
**Database Column**: `projects.azure_folder_path`  
**When**: After project creation and DB commit (only for new projects, not updates)

## Path Format

```
{company_azure_folder_path}/projects/{sanitized-project-name}_{project-uuid}
```

### Example:
```
acme-corp_abc-123-uuid/demo-company_ghi-789-uuid/projects/building-a_proj-xyz-456-uuid
```

### Path Structure:
1. **Company Path**: `{company_azure_folder_path}` - From `companies.azure_folder_path`
2. **Projects Folder**: `/projects/` - Fixed folder name
3. **Project Folder**: `{sanitized-project-name}_{project-uuid}`
   - `sanitized-project-name`: Lowercase, special chars removed, spaces replaced with hyphens
   - `project-uuid`: The project's UUID from database

## Frontend Implementation

### 1. Project Creation (`CreateProjectModal.tsx`)

When a project is created, the frontend:

```typescript
// Checks response for azure_folder_path
const azureFolderPath = response?.data?.azure_folder_path || 
                        response?.data?.data?.azure_folder_path ||
                        response?.azure_folder_path;

// Validates path format
const pathParts = azureFolderPath.split('/');
const isValidFormat = pathParts.length >= 3 && 
                     pathParts[pathParts.length - 2] === 'projects' &&
                     pathParts[pathParts.length - 1].includes('_');

// Logs validation results
console.log('📁 Path validation:', {
  fullPath: azureFolderPath,
  pathParts: pathParts,
  isValidFormat: isValidFormat,
  expectedFormat: '{company-path}/projects/{sanitized-name}_{uuid}',
  folderMarker: `${azureFolderPath}/.folder`,
});
```

### 2. API Service (`services/api.ts`)

The API service logs and validates the path:

```typescript
// Validates path format matches backend structure
const pathParts = azureFolderPath.split('/');
const isValidFormat = pathParts.length >= 3 && 
                     pathParts[pathParts.length - 2] === 'projects' &&
                     pathParts[pathParts.length - 1].includes('_');

console.log('📁 Path details:', {
  fullPath: azureFolderPath,
  pathParts: pathParts,
  isValidFormat: isValidFormat,
  expectedFormat: '{company_azure_folder_path}/projects/{sanitized-name}_{project-uuid}',
  folderMarker: `${azureFolderPath}/.folder`,
  databaseColumn: 'projects.azure_folder_path',
});
```

### 3. Document Management (`DocumentManagement.tsx`)

When loading projects, validates each path:

```typescript
if (project.azure_folder_path) {
  // Validate path format
  const pathParts = project.azure_folder_path.split('/');
  const isValidFormat = pathParts.length >= 3 && 
                       pathParts[pathParts.length - 2] === 'projects' &&
                       pathParts[pathParts.length - 1].includes('_');
  
  console.log(`📁 Project Azure folder:`, project.azure_folder_path);
  console.log(`   Format validation: ${isValidFormat ? '✅ Valid' : '⚠️ Invalid'}`);
}
```

## Path Usage

### Document Loading
```typescript
// Uses azure_folder_path for blob listing
const params = {
  category: 'project',
  project_id: project.numericId,
  folder_path: project.azure_folder_path, // Backend lists blobs from this path
};
```

### File Upload
```typescript
// Uses azure_folder_path for uploads
formData.append('folder_path', project.azure_folder_path);
// Backend appends filename: {azure_folder_path}/{filename}
```

### Folder Creation
```typescript
// Uses azure_folder_path for folder creation
const folderData = {
  folder_name: folderName,
  category: 'project',
  project_id: project.numericId,
  folder_path: project.azure_folder_path, // Backend appends folder name
};
```

## Validation Rules

The frontend validates that the path:
1. ✅ Contains at least 3 parts (company-path/projects/project-folder)
2. ✅ Has `/projects/` as the second-to-last segment
3. ✅ Project folder name contains underscore (separating name and UUID)
4. ✅ Matches format: `{company-path}/projects/{name}_{uuid}`

## Error Handling

### Missing Path
- Shows error toast
- Logs detailed error with expected format
- Prevents file operations until path is set

### Invalid Format
- Shows warning in console
- Still allows operations but logs format issue
- Helps identify backend path generation issues

### Path Fetching
- If path missing, attempts to fetch from backend
- Updates project state with retrieved path
- Verifies blob storage connection

## Console Logs

### Success:
```
✅ Azure folder path created: acme-corp_abc-123/demo-company_ghi-789/projects/building-a_proj-xyz-456
📁 Path validation: ✅ Valid
📁 Folder marker: .../projects/building-a_proj-xyz-456/.folder
```

### Error:
```
❌ CRITICAL: Azure folder path NOT found in response!
Backend API: POST /api/project-add
Expected format: {company_azure_folder_path}/projects/{sanitized-project-name}_{project-uuid}
Database column: projects.azure_folder_path
```

## Backend Requirements

The backend MUST:
1. ✅ Create project in database
2. ✅ Get company's `azure_folder_path` from `companies` table
3. ✅ Sanitize project name (lowercase, remove special chars, replace spaces)
4. ✅ Build path: `{company-path}/projects/{sanitized-name}_{uuid}`
5. ✅ Create folder in Azure using `ensureFolderExists()`
6. ✅ Save path to `projects.azure_folder_path` column
7. ✅ Return path in API response: `response.data.azure_folder_path`

## Testing

### Test Path Generation:
1. Create project with name: "Building A"
2. Check console for path: `.../projects/building-a_{uuid}`
3. Verify path format matches expected structure
4. Verify folder exists in Azure Blob Storage

### Test Path Usage:
1. Load project in document management
2. Verify path is used for document listing
3. Upload file - should use path
4. Create folder - should use path
