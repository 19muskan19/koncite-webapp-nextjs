# Labour Code Generation - Backend Setup

## 1. Add `code` column to labours table

Run migration:

```bash
php artisan make:migration add_code_to_labours_table --table=labours
```

Edit the migration file and ensure:

```php
$table->string('code', 50)->nullable()->after('uuid');
```

Then run:

```bash
php artisan migrate
```

## 2. Update Labour model

Add `code` to `$fillable` in `App\Models\Company\Labour`:

```php
protected $fillable = ['uuid', 'name', 'code', 'category', 'unit_id', 'company_id', 'is_active'];
```

## 3. Update LaboursResources (required for labour-list & labour-search)

Ensure `code` is included so labour-list and labour-search return the DB code (e.g. L415190). Otherwise the UI shows "-" instead of the actual code.

In `App\Http\Resources\API\Labours\LaboursResources`:

```php
'code' => $this->code,
```

## 4. Replace LaboursController

Copy the contents of `LaboursController-with-code-generation.php` into your `App\Http\Controllers\API\LaboursController`.

## Code format

- Auto-generated: `LAB0001`, `LAB0002`, ... (per company)
- Optional: Frontend can send a custom `code` when creating a labour; if provided, it will be used instead of auto-generation
