# Backend: Materials Delete – UUID vs ID Fix

The frontend calls `DELETE /materials-delete/{uuid}` when deleting a material. The route parameter is the material **UUID** (e.g. `a7fbeac2-c726-493c-836b-ed8bb51c3287`).

## The Error

```
SQLSTATE[22007]: Invalid datetime format: 1292 Truncated incorrect DOUBLE value: 'a7fbeac2-c726-493c-836b-ed8bb51c3367'
```

This happens because the backend uses the UUID in a clause like `where id = 'a7fbeac2-...'`, but `materials.id` is an **integer**. MySQL tries to cast the UUID to a number and fails.

## Fix

The delete controller must use the `uuid` column, not the `id` column, when the route parameter is a UUID.

### Route

```php
Route::delete('materials-delete/{uuid}', [MaterialsController::class, 'destroy']);
```

### Controller method

```php
public function destroy($uuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;

    $material = \App\Models\Company\Materials::where('company_id', $authCompany)
        ->where('uuid', $uuid)
        ->first();

    if (!$material) {
        return $this->responseJson(false, 404, 'Material not found', []);
    }

    $material->delete(); // soft delete if using SoftDeletes

    return $this->responseJson(true, 200, 'Material deleted successfully', []);
}
```

### Alternative: support both id and uuid

If some clients pass numeric `id`, you can support both:

```php
public function destroy($idOrUuid)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;

    $query = \App\Models\Company\Materials::where('company_id', $authCompany);

    // UUID format: 8-4-4-4-12 hex digits
    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $idOrUuid)) {
        $query->where('uuid', $idOrUuid);
    } else {
        $query->where('id', (int) $idOrUuid);
    }

    $material = $query->first();

    if (!$material) {
        return $this->responseJson(false, 404, 'Material not found', []);
    }

    $material->delete();

    return $this->responseJson(true, 200, 'Material deleted successfully', []);
}
```

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Truncated incorrect DOUBLE value | `where id = 'uuid-string'` on integer column | Use `where uuid = $uuid` instead of `where id = $uuid` |
