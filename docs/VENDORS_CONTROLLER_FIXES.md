# VendorsController – Exact Fixes for Edit, Delete & Update

Your routes pass **UUID** (`506b5bc0-78c8-4a7f-b85a-2f9d7fa18171`) but the controller uses `where('id', $uuid)`. The `vendors.id` column is an integer, so that causes SQL errors. Use `where('uuid', $uuid)` instead.

---

## 0. Fix `vendorAdd()` – Create: status (is_active) default to 1

**Problem:** New vendors are created with status off (is_active: 0). The frontend sends `is_active: 1` but the backend create may ignore it.

**Fix:** In your vendor create/insert logic, include `is_active` from the request with default 1:

```php
// When creating a new vendor (in vendorAdd or similar)
Vendor::create([
    'name' => $request->name,
    'address' => $request->address,
    'type' => $request->type,
    'contact_person_name' => $request->contact_person_name,
    'country_code' => $request->country_code,
    'phone' => $request->phone,
    'email' => $request->email,
    'is_active' => $request->input('is_active', 1),  // Default to 1 (active) when creating
    // ... other fields
]);
```

Ensure `is_active` is in the model's `$fillable` array.

---

## 1. Fix `edit()` – Line ~127

**Current (wrong):**
```php
public function edit($uuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;
    $data = Vendor::where('id', $uuid)->where('company_id', $authCompany)->first();
    $message = 'Fetch Vendor List Successfully';
    return $this->responseJson(true, 200, $message, new VendorResources($data));
}
```

**Correct:**
```php
public function edit($uuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;
    $data = Vendor::where('uuid', $uuid)->where('company_id', $authCompany)->first();
    if (!$data) {
        return $this->responseJson(false, 404, 'Vendor not found', []);
    }
    $message = 'Fetch Vendor List Successfully';
    return $this->responseJson(true, 200, $message, new VendorResources($data));
}
```

---

## 2. Fix `delete()` – Line ~135

**Current (wrong):**
```php
public function delete($uuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;
    $data = Vendor::where('id', $uuid)
        ->where('company_id', $authCompany)
        ->delete();
    $message = $data > 0 ? 'Vendor Delete Successfully' : 'Vendor Data Not Found';
    return $this->responseJson(true, 200, $message, $data);
}
```

**Correct:**
```php
public function delete($uuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;

    $vendor = Vendor::where('company_id', $authCompany)
        ->where('uuid', $uuid)
        ->first();

    if (!$vendor) {
        return $this->responseJson(false, 404, 'Vendor not found', []);
    }

    $vendor->delete();

    return $this->responseJson(true, 200, 'Vendor deleted successfully', []);
}
```

---

## 3. Fix `vendorAdd()` – Update path

The frontend sends `updateId` with the **UUID**, but you use `Vendor::find($request->updateId)` and `where('id', $request->updateId)`. `find()` and `where('id', ...)` expect numeric `id`, not UUID.

**Current (wrong):**
```php
$findId = Vendor::find($request->updateId);
if (isset($findId)) {
    $isVendorUpdate = Vendor::where('id', $request->updateId)->update([...]);
```

**Correct:**
```php
$findVendor = Vendor::where('uuid', $request->updateId)->where('company_id', $authConpany)->first();
if ($findVendor) {
    $findVendor->update([
        'name' => $request->name,
        'gst_no' => $request->gst_no,
        'address' => $request->address,
        'type' => $request->type,
        'contact_person_name' => $request->contact_person_name,
        'country_code' => $request->country_code,
        'phone' => $request->phone,
        'email' => $request->email,
        'is_active' => $request->has('is_active') ? $request->is_active : $findVendor->is_active,
        'additional_fields' => json_encode($request->f ?? []),
    ]);
    $message = 'Vendor Updated Successfullsy';
    DB::commit();
    return $this->responseJson(true, 201, $message, $findVendor);
} else {
    // Create new vendor
    $isVendorCreated = Vendor::create([...]);
    // ...
}
```

**Minimal change** (if you prefer to keep your structure):

Replace:
```php
$findId = Vendor::find($request->updateId);
if (isset($findId)) {
    $isVendorUpdate = Vendor::where('id', $request->updateId)->update([
```

With:
```php
$findVendor = Vendor::where('uuid', $request->updateId)->where('company_id', $authConpany)->first();
if ($findVendor) {
    $isVendorUpdate = Vendor::where('uuid', $request->updateId)->where('company_id', $authConpany)->update([
```

And add `is_active` to the update array if the frontend sends it:
```php
'is_active' => $request->is_active ?? $findVendor->is_active,
```

---

## Summary

| Method   | Change |
|----------|--------|
| `edit()` | `where('id', $uuid)` → `where('uuid', $uuid)` |
| `delete()` | `where('id', $uuid)` → `where('uuid', $uuid)`, use `$vendor->delete()` |
| `vendorAdd()` | `find($request->updateId)` and `where('id', ...)` → `where('uuid', $request->updateId)` |
