# Backend: Vendors Delete – UUID vs ID Fix

The frontend calls `DELETE /vendor-delete/{uuid}` when deleting a vendor. The route parameter is the vendor **UUID** (e.g. `506b5bc0-78c8-4a7f-b85a-2f9d7fa18171`).

## The Error

```
SQLSTATE[22007]: Invalid datetime format: 1292 Truncated incorrect DOUBLE value: '506b5bc0-78c8-4a7f-b85a-2f9d7fa18171'
(Connection: mysql, SQL: update `vendors` set `deleted_at` = ..., `vendors`.`updated_at` = ... 
 where `id` = 506b5bc0-78c8-4a7f-b85a-2f9d7fa18171 and `company_id` = 92 and `vendors`.`deleted_at` is null)
```

This happens because the backend uses the UUID in `where id = 'uuid'`, but `vendors.id` is an **integer**. MySQL tries to cast the UUID to a number and fails.

## Fix

The delete controller must use the `uuid` column, not the `id` column.

### Current (wrong)

```php
public function delete($uuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;
    $data = Vendor::where('id', $uuid)  // ❌ WRONG – id is integer
        ->where('company_id', $authCompany)
        ->delete();
    // ...
}
```

### Correct

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

### Alternative: support both id and uuid

```php
public function delete($idOrUuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;

    $query = Vendor::where('company_id', $authCompany);

    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $idOrUuid)) {
        $query->where('uuid', $idOrUuid);
    } else {
        $query->where('id', (int) $idOrUuid);
    }

    $vendor = $query->first();

    if (!$vendor) {
        return $this->responseJson(false, 404, 'Vendor not found', []);
    }

    $vendor->delete();

    return $this->responseJson(true, 200, 'Vendor deleted successfully', []);
}
```

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Truncated incorrect DOUBLE value | `where id = 'uuid-string'` on integer column | Use `where('uuid', $uuid)` instead of `where('id', $uuid)` |
