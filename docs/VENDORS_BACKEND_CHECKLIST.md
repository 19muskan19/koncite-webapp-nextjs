# Vendors Backend – Edit, Delete & Toggle Fixes

If vendor edit, delete, or status toggle fail, check the following in your Laravel backend.

---

## 1. Edit – use `uuid` not `id`

The frontend calls `GET /vendor-edit/{uuid}`. The route parameter is the vendor **UUID**.

```php
// Wrong – causes SQL errors
$vendor = Vendor::where('id', $uuid)->first();

// Correct
$vendor = Vendor::where('uuid', $uuid)->first();
```

---

## 2. Delete – use `uuid` not `id`

Same as edit – the frontend sends the UUID in the URL.

```php
// Wrong
Vendor::where('id', $uuid)->delete();

// Correct
Vendor::where('uuid', $uuid)->delete();
```

---

## 3. Update (vendor-add) – support partial updates

The status toggle sends a full payload (name, address, type, etc.) plus `is_active`. If your validator requires all fields for updates, ensure the update path accepts partial data or that the frontend always sends the full payload (which it now does for the toggle).

For create vs update, check `updateId` in the request:

```php
if ($request->has('updateId')) {
    // Update – use uuid
    $vendor = Vendor::where('uuid', $request->updateId)->first();
    if ($vendor) {
        $vendor->update($request->only([...]));
    }
} else {
    // Create
}
```

---

## Summary

| Endpoint | Parameter | Use |
|----------|-----------|-----|
| GET /vendor-edit/{uuid} | uuid | `where('uuid', $uuid)` |
| DELETE /vendor-delete/{uuid} | uuid | `where('uuid', $uuid)` |
| POST /vendor-add (update) | updateId | `where('uuid', $request->updateId)` |
