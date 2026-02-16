# DPR Flow & API Reference

## Flow Order (matches backend)

1. **Project** – Select project
2. **Subproject** – Select subproject (optional)
3. **Activities** – Select activities; user can add new via "Create New"
4. **Materials** – Select materials; user can add new via "Create New"
5. **Labour** – Select labour; user can add new via "Create New"
6. **Assets (Machines)** – Select assets; user can add new via "Create New"
7. **Safety** – Add safety entries (optional)
8. **Hindrance** – Add hindrance entries (optional)
9. **Hindrance Next** → DPR saved via `dpr-bulk-add` → PDF generated → PDF opens

## Backend Routes (DprController)

| Route | Method | Handler | Frontend Usage |
|-------|--------|---------|----------------|
| `dpr-list` | GET | `index` | `dprAPI.getList()` – DPR list |
| `dpr-add` | POST | `add` | Not used (creation via `dpr-bulk-add`) |
| `dpr-edit/{id}` | GET | `edit` | `dprAPI.edit()` – Edit existing DPR |
| `dpr-details/{id}` | GET | `getDprDetails` | `dprAPI.getDetails()` – View full DPR |
| `dpr-delete/{id}` | DELETE | `delete` | `dprAPI.delete()` – Delete DPR |
| `dpr-check` | GET | `dprCheck` | `dprAPI.dprCheck()` – Incomplete DPRs |
| `fetch-dpr-history-edit` | POST | `dprHistoryEdit` | `dprAPI.dprHistoryEdit()` |
| `dpr-history-Update` | POST | `dprHistoryUpdate` | `dprAPI.dprHistoryUpdate()` |
| `generate-pdf` | POST | `generatePDF` | `dprAPI.generatePDF()` – PDF after save |
| `dpr-bulk-add` | POST | `bulkDprAdd` | `dprAPI.bulkAdd()` – Create DPR + all data |

## Hindrance Next Flow

1. User clicks Next on Hindrance modal
2. `handleHindranceNext` builds FormData and calls `dprAPI.bulkAdd(formData)`
3. Backend `bulkDprAdd` creates DPR and related records, calls `generatebluckPDF`
4. Backend returns `results` including `dpr_pdf` with `pdf_url`
5. If no `pdf_url` in response, frontend calls `dprAPI.generatePDF(dprId)`
6. PDF opens in new tab
7. `fetchDprList({ preserveOnEmpty: true })` after 800ms to refresh list

## Edit / View

- **View** – DPR list row → View icon → `dprAPI.getDetails(id)` → show full details
- **Edit** – DPR list row → Edit icon → `dprAPI.edit(id)` + `getDetails(id)` → load into wizard
- **Download PDF** – `dprAPI.generatePDF(id)` → open `pdf_url`
- **Delete** – `dprAPI.delete(id)` → refresh list
- **Edit previous (incomplete)** – `dprAPI.dprCheck()` → list incomplete DPRs → choose to continue

## Create New Entry Buttons

| Step | Modal | Create New API |
|------|-------|----------------|
| Activities | CreateActivityModal | masterDataAPI.createActivity |
| Materials | CreateMaterialModal | masterDataAPI.createMaterial |
| Labour | CreateLabourModal | masterDataAPI.createLabour |
| Assets | CreateAssetEquipmentModal | masterDataAPI.createAsset |

## FormData Structure (dpr-bulk-add)

- `dpr` (JSON): `{ projects_id, sub_projects_id, name, staps: 7 }`
- `activities` (JSON): array of `{ activities_history_activities_id, activities_history_qty, ... }`
- `activities_images[i][j]`: files
- `materials` (JSON): array of `{ materials_id, qty, remarkes }`
- `labour` (JSON): array of `{ labours_id, qty, ot_qty, rate_per_unit, ... }`
- `assets` (JSON): array of `{ assets_id, qty, rate_per_unit, ... }`
- `safety[i][name]`, `safety[i][details]`, `safety[i][remarks]` (PHP array format)
- `safety_images[i][j]`: files
- `hinderance[i][name]`, etc. (PHP array format)
- `hinderance_images[i][j]`: files
