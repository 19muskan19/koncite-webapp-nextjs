# DPR Download Flow

## 1. How the PDF is created

The PDF can be created in two ways:

| Trigger | API / method | PDF view |
|---------|--------------|----------|
| Bulk DPR add | `generatebluckPDF($dprId)` inside `POST /api/dpr-bulk-add` | bluckdprs.blade.php |
| Manual | `POST /api/generate-pdf` with body `{ "dpr": <dprId> }` | dprs.blade.php |

## 2. PDF generation steps

1. **Load DPR data** – DPR with assets, activities, labour, material, historie (hindrances), safetie. Filtered by `company_id` and `user_id`.
2. **Convert images to base64** – `convertDprImagesToBase64()` loads images from Azure Blob, converts to base64. Applied to safety, hindrance, and activity images for embedding in the PDF.
3. **Create PDF file** – Rendered with DomPDF from the Blade view. Filename: `dpr_{dprId}_{uuid}.pdf`. Stored at `storage/app/dpr-pdfs/`.
4. **Create secure URL** – Token: `sha256(filename + user_id + app.key)`. URL: `{baseUrl}/api/dpr-pdf/{token}?file={base64(filename)}`.
5. **Return JSON** – Includes `pdf_url`, `name`, `message`, `data`.

## 3. Download/preview route

Download/preview uses a token-based public route (no auth required):

```
GET /api/dpr-pdf/{token}?file={base64_encoded_filename}
```

**Route:** `Route::get('/dpr-pdf/{token}', [DprController::class, 'downloadPdf'])`

**Flow in downloadPdf():**
1. Base64-decode the `file` query parameter to get the filename.
2. Check filename format: `dpr_{dprId}_{uuid}.pdf`.
3. Load DPR and verify the token: `hash('sha256', filename + dpr->user_id + app.key)` must match the URL token.
4. Find the file under `storage_path('app/dpr-pdfs/' . $filename)`.
5. Return the file with headers: `Content-Disposition: inline; filename="dpr_{dprId}.pdf"`.
6. PDF is shown in the browser; user can download via browser controls.

## 4. Frontend implementation

### View (open in new tab)

- Uses `pdf_url` from bulk response or `POST /api/generate-pdf`.
- `window.open(pdf_url, '_blank')` – opens PDF in new tab.

### Download (save file)

1. Get `pdf_url` from `dpr-bulk-add` response (`dpr_pdf.pdf_url`) or call `POST /api/generate-pdf` with `{ dpr: dprId }`.
2. Fetch PDF via `dprAPI.downloadPdfBlob(pdf_url)` – calls `GET /api/dpr-pdf/{token}?file={base64}`.
3. Create blob URL, trigger download with filename `dpr_{dprId}.pdf`.
4. Fallback: if fetch fails (e.g. CORS), open URL in new tab so user can download via browser.

### API methods

- `dprAPI.generatePDF(dprId)` – returns `{ pdf_url, ... }`.
- `dprAPI.downloadPdfBlob(pdfUrl)` – fetches PDF blob from dpr-pdf URL.
