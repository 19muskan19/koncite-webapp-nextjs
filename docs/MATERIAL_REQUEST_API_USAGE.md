# Material Request (Purchase Request) – API Usage

This document maps backend APIs to frontend usage for the Purchase Request feature.

## Summary Table

| Action | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| VIEW | `/api/inventory/materials-request-list` | GET/POST | List all Material Requests |
| VIEW | `/api/inventory/materials-request-edit` | POST | View Material Request Details |
| VIEW | `/api/inventory/materials-request-details-list` | POST | List Details by Project |
| EDIT | `/api/inventory/materials-request-edit` | POST | Fetch Details for Edit |
| EDIT | `/api/inventory/materials-request-details-edit` | POST | Fetch Materials with Details |
| EDIT | `/api/inventory/materials-request-add` | POST | Create/Update Request Header |
| EDIT | `/api/inventory/materials-request-details-add` | POST | Update Request Details |
| DOWNLOAD | `/api/inventory/generate-pdf` | POST | Generate PDF |

## VIEW APIs

| API | Method | Purpose | Frontend Usage |
|-----|--------|---------|----------------|
| `/api/inventory/materials-request-list` | GET/POST | List all Material Requests | `materialRequestAPI.list()` – PR list on dashboard, supports filters via POST |
| `/api/inventory/materials-request-edit` | POST | View Material Request Details | `materialRequestAPI.edit(id)` – View modal (Eye icon), Edit flow |
| `/api/inventory/materials-request-details-list` | POST | List Details by Project | `materialRequestAPI.detailsList()` – Fallback when loading details for View/Edit |

## EDIT APIs

| API | Method | Purpose | Frontend Usage |
|-----|--------|---------|----------------|
| `/api/inventory/materials-request-edit` | POST | Fetch Details for Edit | `materialRequestAPI.edit(id)` – Edit icon, Edit previous modal |
| `/api/inventory/materials-request-details-edit` | POST | Fetch Materials with Details | `materialRequestAPI.detailsEdit(inventoryId, materials)` – Pre-fill materials when editing |
| `/api/inventory/materials-request-add` | POST | Create/Update Request Header | `materialRequestAPI.add(data)` – Create (no id) or Update (with id) |
| `/api/inventory/materials-request-details-add` | POST | Add/Update Request Details | `materialRequestAPI.detailsAdd(items)` – Line items for Create/Edit |

## DOWNLOAD API

| API | Method | Purpose | Frontend Usage |
|-----|--------|---------|----------------|
| `/api/inventory/generate-pdf` | POST | Generate PDF | `materialRequestAPI.generatePdf(id)` – Download icon |

## Request Formats

### materials-request-list
- **GET** (no body): List all
- **POST** (with body): `{ projectId?, subprojectId? }` for filtered list

### materials-request-edit
- **POST** body: `{ id }` (Material Request id)
- **Response**: `{ status, response_code, message, data }` – `data` is an **array of MaterialRequestDetails** (not a header)
- Each detail: `{ materials_id, material_requests_id, projects_id, sub_projects_id, qty, date, remarks, activities_id }`

### materials-request-add
- **POST** body: `{ projects_id, sub_projects_id?, id?, request_id? }`
  - `id` and `request_id` used when updating

### materials-request-details-add
- **POST** body: Array of `{ inventoryId, material_id, projects_id, qty, sub_projects_id?, activities_id?, date?, remarks? }`

### materials-request-details-edit
- **POST** body: `{ inventoryId, materials: [id, ...] }` – material IDs for which to fetch details (backend expects `inventoryId`, `materials`)

### materials-request-details-list
- **POST** body: `{ projectId, searchkey? }` – list all details for project; filter by `material_requests_id` on frontend for a specific PR

### generate-pdf
- **POST** body: `{ type: 'material_request', requestId }` (Material Request id)
- Returns: `{ data, message, pdf_url }` – frontend fetches `pdf_url` and triggers download

## UI Actions

| Icon | Action | APIs Called |
|------|--------|-------------|
| View (Eye) | Opens read-only modal with PR details | materials-request-edit, materials-request-details-edit (or details-list) |
| Edit (Pencil) | Opens edit flow with pre-filled data | materials-request-edit, materials-request-details-edit |
| Download | Generates and downloads PDF | generate-pdf |
