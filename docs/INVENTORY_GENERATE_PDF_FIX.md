# Fix: Undefined variable $datas (Material Request PDF)

The error `Undefined variable $datas` occurs in your Laravel backend when generating the Material Request PDF. The view `common.pdf.material-request` expects `$datas` to be passed.

## Root cause

1. **Wrong model** – You're fetching `MaterialRequestDetails` (line items) with `first()` – that returns one detail. The PDF view needs the **Material Request header** plus its details.
2. **`generatePdf()` helper** – It must receive your `$datas` and pass them into the Blade view. If the helper doesn't pass the second argument to the view, `$datas` will be undefined.

## Fix in Laravel

### 1. Update the controller

Replace your current `generatePDF` with:

```php
public function generatePDF(Request $request)
{
    $requestId = $request->requestId;
    if (!$requestId) {
        return response()->json(['error' => 'requestId required'], 400);
    }

    $authCompany = Auth::guard('company-api')->user();
    if (!$authCompany) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }

    // Fetch the Material Request HEADER (not details) with relations
    // Adjust model name if yours is different (e.g. MaterialRequest, Inventory)
    $datas = MaterialRequest::with(['projects_id', 'sub_projects_id', 'details'])
        ->where('id', $requestId)
        ->where('company_id', $authCompany->company_id)
        ->first();

    if (!$datas) {
        return response()->json(['error' => 'Data Not Found'], 404);
    }

    // IMPORTANT: Pass $datas to the view
    $pdfUrl = generatePdf('common.pdf.material-request', compact('datas'), 'material-request_' . date('YmdHis') . '.pdf');

    return response()->json([
        'data' => new InventoryResources($datas),
        'message' => 'PDF generated successfully',
        'pdf_url' => $pdfUrl
    ], 200);
}
```

### 2. Fix the `generatePdf()` helper

Ensure it passes the data array into the view:

```php
// In your helper (e.g. app/Helpers/helpers.php)
function generatePdf($view, $data = [], $filename = 'document.pdf')
{
    $pdf = PDF::loadView($view, $data);  // Must pass $data to the view
    return $pdf->download($filename);
    // Or if you return a URL:
    // $pdf->save(storage_path('app/public/' . $filename));
    // return url('storage/' . $filename);
}
```

### 3. Model names

If your Material Request header table is `inventories` or `material_requests`, use:

```php
// For material_requests table:
$datas = MaterialRequest::with(['projects_id', 'sub_projects_id', 'details'])
    ->where('id', $requestId)
    ...

// For inventories table:
$datas = Inventory::with(['projects_id', 'sub_projects_id', 'materialRequestDetails'])
    ->where('id', $requestId)
    ...
```

### 4. Blade view (`common.pdf.material-request`)

The view should use `$datas`:

```blade
{{-- Example --}}
<h1>Purchase Request: {{ $datas->request_no ?? $datas->id }}</h1>
@foreach($datas->details ?? [] as $detail)
    ...
@endforeach
```

## Quick checklist

- [ ] Controller fetches the Material Request **header** (not only `MaterialRequestDetails`)
- [ ] `$datas` is defined before calling `generatePdf()`
- [ ] `generatePdf($view, compact('datas'), $filename)` passes `$datas` into the view
- [ ] The helper passes the second argument to `view()` or `PDF::loadView()`
