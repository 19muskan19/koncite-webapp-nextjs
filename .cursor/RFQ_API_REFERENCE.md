# RFQ (Request for Quotes) – Flow, APIs, Updates Without Duplicates

## 1. CREATE FLOW (New RFQ)

| Step | Action | API | Method | Request | Response |
|------|--------|-----|--------|---------|----------|
| 1 | Create quote | inventory/quote-add | POST | `{ "name": "YYYY-MM-DD", "projects_id": <number> }` | response.data = Quote (with id) |
| 2 | Load material requests | inventory/materials-request-list or inventory/quotes-materials-request-list | POST | `{ "projectId": <number>, "subProjectId": <number>? }` | Array of material requests |
| 3a | Add PR image | inventory/quote-details-add | POST (FormData) | id: null, quotes_id, date, remarkes, img (file) | Quote detail (with id) |
| 3b | Add material line items | inventory/quote-details-add | POST (JSON) | Array of `{ "id": "", "quotes_id", "materials", "material_requests_id", "material_request_details_id", "date", "qty", "request_qty", "price" }` | Array of quote details |
| 4 | Load materials for selected request | inventory/materials-request-no-wise-materials-list | POST | `{ "request_no": <material_request_id>, "projectId": <number> }` | Materials for that request |
| 5 | Send to vendors | inventory/material-request-send-to-vendor | POST | type, vendor_id[], quotes_details_id[], quotes_id[], material_request_details_id[], material_requests_id[], materials_id[] | Vendor send records |
| 6 | Generate PDF | inventory/generate-pdf | POST | `{ "requestId": <quote_id>, "type": "quotes" }` | PDF URL |
| 7 | Get project/store | inventory/project-to-store-list | POST | `{ "type": "quotes", "project_id": <number> }` | Project data |

## 2. EDIT FLOW (Existing RFQ)

| Step | Action | API | Method | Request | Response |
|------|--------|-----|--------|---------|----------|
| 1 | List recent quotes | inventory/quote-details-list | GET | — | Quotes (last 15 days) |
| 2 | Load quote for edit | inventory/quote-details-edit | POST | `{ "quotesId": <quote_id> }` | data.flage, data.vendor_data, data.data |
| 3 | Update PR image | inventory/quote-details-add | POST (FormData) | id: existing quote detail id, quotes_id, remarkes, img | Updated quote detail |
| 4 | Update material line items | inventory/quote-details-add | POST (JSON) | Array with id: existing quote detail id for each item | Array of updated quote details |
| 5 | Add new materials | inventory/quote-details-add | POST (JSON) | Array with new items using "id": "" or omit id | New quote details |
| 6 | Send to vendors | inventory/material-request-send-to-vendor | POST | Same as create | Vendor send records |

## 3. Updates Without Duplicates

### Rule: send existing IDs
- **With non-empty id** → backend updates existing record
- **Without id or id: ""** → backend creates new record

### Where IDs come from (edit response)
- **Material line items:** Backend `QuotesMaterialsDetailsresources` returns `quort_details_id` = actual QuotesDetails id. Use this as `id` when saving.
- **PR image:** `data.data.id` (QuotesDetailsresources)
- ⚠️ Do not use `row.id` for materials – in QuotesMaterialsDetailsresources, `id` is material_requests_id.

### Payloads for updates

**PR image update (FormData):**
- id: existing_quote_detail_id
- quotes_id, remarkes, img

**Material line items update (JSON):**
- Existing items: always include `id`
- New items: use `"id": ""` or omit id

## 4. Backend Fix Required (Repetition)

`quote-details-edit` currently returns only the last material and last image. It must return **all** quotesdetails with their ids so the frontend can send correct ids when saving.

## 5. Complete API Reference

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | inventory/quote-add | POST | Create quote |
| 2 | inventory/quote-list | GET | List user quotes |
| 3 | inventory/materials-request-list | GET/POST | List material requests |
| 4 | inventory/quotes-materials-request-list | GET/POST | Material requests for quotes |
| 5 | inventory/materials-request-no-wise-materials-list | POST | Materials for a request |
| 6 | inventory/quote-details-add | POST | Add/update quote details |
| 7 | inventory/quote-details-list | GET | Recent quotes (edit list) |
| 8 | inventory/quote-details-edit | POST | Load quote for edit |
| 9 | inventory/material-request-send-to-vendor | POST | Send RFQ to vendors |
| 10 | inventory/project-to-store-list | POST | Project/store for RFQ |
| 11 | inventory/generate-pdf | POST | Generate quote PDF |
| 12 | inventory/inventory-report | POST | RFQ report |

## 6. RFQ Report API

- **Endpoint:** POST inventory/inventory-report
- **Request:** `{ "type": "rfq", "projectId": <number>, "dateForm": "YYYY-MM-DD", "dateTo": "YYYY-MM-DD", "prepared": <user_id>?, "rfqno": <string>? }`
- **Response:** data.material = RFQ table rows
