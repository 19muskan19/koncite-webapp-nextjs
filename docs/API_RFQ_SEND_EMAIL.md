# RFQ Send Email API Specification

## Endpoint

```
POST /api/inventory/rfq-send-email
```

**Auth:** Bearer token required (same as other inventory APIs)

---

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestId` | number \| string | Yes | Material Request ID. Backend uses this to fetch MR details and generate the PDF attachment. |
| `email_addresses` | string[] | Yes | Array of vendor email addresses to send the quote to. |
| `message` | string | No | Email body text. Default: "Please find our Request for Quotation attached. Kindly submit your quote at your earliest convenience." |
| `image_base64` | string | No | Base64 data URL of uploaded image (e.g. `data:image/jpeg;base64,/9j/4AAQ...`). Attach as email attachment when provided. |
| `image_filename` | string | No | Filename for the image attachment (e.g. `quote-image-1234567890.png`). Used when `image_base64` is present. |

### Example Request
```json
{
  "requestId": 624890,
  "email_addresses": ["vendor1@example.com", "vendor2@example.com"],
  "message": "Dear Vendor,\n\nPlease find our Request for Quotation attached.\n\nKindly submit your quote at your earliest convenience.\n\nBest regards",
  "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "image_filename": "quote-image-1709389200000.png"
}
```

### Example Request (minimal - no image)
```json
{
  "requestId": 624890,
  "email_addresses": ["vendor@example.com"],
  "message": "Please find our Request for Quotation attached. Kindly submit your quote at your earliest convenience."
}
```

---

## Response

### Success (200)

```json
{
  "status": true,
  "response_code": 200,
  "message": "Emails sent successfully",
  "data": {
    "sent_count": 2,
    "failed": []
  }
}
```

### Error (4xx / 5xx)

```json
{
  "status": false,
  "response_code": 422,
  "message": "Validation failed",
  "data": [],
  "errors": {
    "email_addresses": ["The email addresses field is required."],
    "requestId": ["The request id field is required."]
  }
}
```

---

## Backend Implementation Notes

1. **Material Request PDF:** Use `requestId` to load the material request and generate PDF (reuse existing `POST /api/inventory/generate-pdf` logic with `type: 'material_request'`). Attach this PDF to the email.

2. **Image attachment:** If `image_base64` is present:
   - Decode the base64 string (strip `data:image/xxx;base64,` prefix)
   - Use `image_filename` or derive from mime type (e.g. `quote-image.png`)
   - Attach to the email

3. **Email content:**
   - Subject: `RFQ / Quote Request - [Project Name]` (fetch project name from MR)
   - Body: Use `message` from request
   - Attachments: MR PDF + optional image

4. **Sending:** Loop over `email_addresses` and send one email per recipient (or use BCC for a single send, per your preference).
