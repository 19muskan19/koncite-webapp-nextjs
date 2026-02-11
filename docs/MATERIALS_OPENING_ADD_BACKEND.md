# Backend: Add Opening Stock API

The frontend calls `POST /materials-opening-add` for bulk upload of opening stock. Add this to your Laravel backend.

## 1. Add route (in your API routes file)

```php
Route::post('materials-opening-add', [MaterialsHistoryController::class, 'addOpeningStock']);
```

## 2. Add method to MaterialsHistoryController

```php
public function addOpeningStock(Request $request)
{
    $authCompany = Auth::guard('company-api')->user()->company_id;
    $validator = Validator::make($request->all(), [
        'project_id' => 'required|integer|exists:projects,id',
        'store_id' => 'required|integer|exists:stores,id',
        'materials_id' => 'required|integer|exists:materials,id',
        'quantity' => 'required|numeric|min:0',
        'opening_date' => 'required|date',
    ]);

    if ($validator->fails()) {
        return $this->responseJson(false, 422, $validator->errors()->first(), []);
    }

    DB::beginTransaction();
    try {
        $data = MaterialOpeningStock::updateOrCreate(
            [
                'company_id' => $authCompany,
                'project_id' => $request->project_id,
                'store_id' => $request->store_id,
                'materials_id' => $request->materials_id,
            ],
            [
                'quantity' => $request->quantity,
                'opening_date' => $request->opening_date,
                'company_id' => $authCompany,
            ]
        );
        DB::commit();
        return $this->responseJson(true, 200, 'Opening stock added successfully', $data);
    } catch (\Exception $e) {
        DB::rollBack();
        logger($e->getMessage() . ' on ' . $e->getFile() . ' in ' . $e->getLine());
        return $this->responseJson(false, 500, $e->getMessage(), []);
    }
}
```

## 3. Ensure MaterialOpeningStock model has fillable

```php
protected $fillable = ['company_id', 'project_id', 'store_id', 'materials_id', 'quantity', 'opening_date'];
```

## Frontend payload (per row)

- `project_id` – numeric project ID
- `store_id` – numeric store/warehouse ID
- `materials_id` – numeric material ID
- `quantity` – number
- `opening_date` – date string (YYYY-MM-DD)
