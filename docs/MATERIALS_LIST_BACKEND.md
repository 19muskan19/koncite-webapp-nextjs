# Backend: Materials List API

The frontend calls `GET /materials-list` to load the materials master list (class, code, specification, unit). This is **different** from MaterialsHistoryController which handles DPR history and opening stock.

## 1. Add route (in api.php)

```php
Route::get('materials-list', [MaterialsController::class, 'index']);
```

## 2. MaterialsController index method

```php
<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\BaseController;
use App\Models\Company\Materials;
use Illuminate\Support\Facades\Auth;

class MaterialsController extends BaseController
{
    public function index()
    {
        $authCompany = Auth::guard('company-api')->user()->company_id;
        
        $data = Materials::with('units')  // or 'unit' - match your Materials model relation name
            ->where('company_id', $authCompany)
            ->orderBy('id', 'asc')
            ->get();
        
        if ($data->isNotEmpty()) {
            return $this->responseJson(true, 200, 'Fetch Materials List Successfully', $data);
        } else {
            return $this->responseJson(true, 200, 'Materials List Data Not Found', []);
        }
    }
}
```

## 3. Materials model – unit relation

Ensure your `Materials` model defines the relation to units:

```php
// In App\Models\Company\Materials
public function units()
{
    return $this->belongsTo(Units::class, 'unit_id');
}
// If the relation is named 'unit' (singular), use:
// public function unit() { return $this->belongsTo(Units::class, 'unit_id'); }
```

## 4. Units model – column name

The frontend expects unit details in one of these shapes:
- `material.units.unit` (or `material.unit.unit`)
- `material.units.name` (or `material.unit.name`)

So the Units table should have a `unit` or `name` column containing the label (e.g. "Nos", "Sqm", "Cft").

## 5. Response shape

The frontend uses these fields per material:
- `id`, `uuid`
- `class`
- `code`
- `name`
- `specification`
- `unit_id`
- `unit` – object from relation, with `unit` or `name` (e.g. `{ "id": 1615, "unit": "Nos" }`)

## Summary

| Endpoint                  | Controller              | Model           | Purpose                 |
|---------------------------|-------------------------|-----------------|-------------------------|
| GET /materials-list       | **MaterialsController** | Materials       | Master materials list   |
| GET /materials-history-list | MaterialsHistoryController | MaterialsHistory | DPR history            |
| POST /materials-opening-list | MaterialsHistoryController | MaterialOpeningStock | Opening stock list   |
