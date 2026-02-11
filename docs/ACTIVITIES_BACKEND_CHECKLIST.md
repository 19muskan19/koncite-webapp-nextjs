# Activities Backend – Verification Checklist

Use this to fix Activities controller issues: subproject not saving, edit/delete errors.

---

## 1. Activities model – `$fillable`

Ensure `subproject_id` is in the model’s `$fillable` array:

```php
// App\Models\Company\Activities

protected $fillable = [
    'uuid',
    'project_id',
    'subproject_id',   // ← must be present
    'type',
    'parent_id',
    'activities',
    'unit_id',
    'qty',
    'rate',
    'amount',
    'start_date',
    'end_date',
    'company_id',
];
```

---

## 2. Subproject: empty string vs `null`

Right now the controller uses:

```php
'subproject_id' => $request->subproject ?? null,
```

`??` replaces only `null`/undefined. An empty string `''` is kept, which can cause DB/validation issues.

Use a value that is either valid or `null`:

```php
// In activitiesAdd – both create and update
$subprojectId = $request->filled('subproject') && $request->subproject !== ''
    ? $request->subproject
    : null;

// Then use $subprojectId:
'subproject_id' => $subprojectId,
```

---

## 3. Optional: validate subproject when provided

When `subproject` is sent, ensure it exists:

```php
$validator = Validator::make($request->all(), [
    'project' => 'required|exists:projects,id',
    'subproject' => 'nullable|exists:sub_projects,id',  // validate if provided
    'type' => 'required|in:heading,activites',
    // ...
]);
```

---

## 4. Edit – use `uuid` instead of `id`

The route passes a UUID, but the controller uses `id`:

```php
// Wrong (current) – causes SQL errors
$datas = Activities::where('id', $uuid)->where('company_id', $authCompany)->first();

// Correct
$datas = Activities::where('uuid', $uuid)->where('company_id', $authCompany)->first();
```

---

## 5. Delete – use `uuid` instead of `id`

Same issue as edit:

```php
// Wrong (current)
$data = Activities::where('id', $uuid)->where('company_id', $authCompany)->delete();

// Correct
$data = Activities::where('uuid', $uuid)->where('company_id', $authCompany)->delete();
```

---

## Summary

| Item | Check / Fix |
|------|-------------|
| Model `$fillable` | Include `subproject_id` |
| Subproject value | Use `null` when not provided; avoid empty string |
| Subproject validation | Optionally add `nullable\|exists:sub_projects,id` |
| Edit | Use `where('uuid', $uuid)` instead of `where('id', $uuid)` |
| Delete | Use `where('uuid', $uuid)` instead of `where('id', $uuid)` |
