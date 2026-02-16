# Document Management API – Laravel Routes Reference

The Next.js document section expects these Laravel API routes. Add any missing routes to your `routes/api.php`.

## 401 Unauthorized on /documents

If you see `401 Unauthorized` when loading documents:

1. **Token**: Ensure the Bearer token is sent. Next.js stores it in cookies/localStorage. Check Laravel accepts `auth:sanctum` for these routes.
2. **API URL**: `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_BASE_URL` must point to your Laravel API (e.g. `http://localhost:8000/api` for local).
3. **CORS**: Laravel must allow credentials if using cookies.
4. **Guard**: Document routes use `auth:sanctum,company` – the Bearer token authenticates via sanctum.

## Azure folder path not found

If projects show "does not have an Azure folder path configured" but the path exists in DB:

1. **GET /project-list**: Include `azure_folder_path` in each project in the response.
2. **GET /project-edit/{uuid}**: Include `azure_folder_path` in the project object.
3. Ensure `projects.azure_folder_path` is in your API resource/transformer.

## Required routes (prefix: `documents`, middleware: `auth:sanctum,company`)

| Method | Path | Controller Method |
|--------|------|-------------------|
| GET | `/` | getDocuments |
| GET | `/gallery` | getGalleryImages |
| POST | `/upload` | uploadDocuments |
| POST | `/folder` | createFolder |
| POST | `/download` | downloadDocument |
| DELETE | `/delete` | deleteFile |

## Share flow (add if missing)

| Method | Path | Controller Method |
|--------|------|-------------------|
| POST | `/share` | shareItems |
| GET | `/shared` | getSharedItems |
| DELETE | `/unshare` | unshareItem |
| GET | `/team-members` | getTeamMembers |
| POST | `/generate-public-link` | generatePublicLink |
| POST | `/revoke-public-link` | revokePublicLink |

## Example Laravel route group

```php
Route::prefix('documents')->middleware(['auth:sanctum,company'])->group(function () {
    Route::get('/', [DocumentManagementController::class, 'getDocuments']);
    Route::get('/gallery', [DocumentManagementController::class, 'getGalleryImages']);
    Route::post('/upload', [DocumentManagementController::class, 'uploadDocuments']);
    Route::post('/folder', [DocumentManagementController::class, 'createFolder']);
    Route::post('/download', [DocumentManagementController::class, 'downloadDocument']);
    Route::delete('/delete', [DocumentManagementController::class, 'deleteFile']);
    
    // Share
    Route::post('/share', [DocumentManagementController::class, 'shareItems']);
    Route::get('/shared', [DocumentManagementController::class, 'getSharedItems']);
    Route::delete('/unshare', [DocumentManagementController::class, 'unshareItem']);
    Route::get('/team-members', [DocumentManagementController::class, 'getTeamMembers']);
    Route::post('/generate-public-link', [DocumentManagementController::class, 'generatePublicLink']);
    Route::post('/revoke-public-link', [DocumentManagementController::class, 'revokePublicLink']);
});
```

## Backend notes

1. **deleteFile** – Uses `Storage::disk('public')` (local). For Azure documents, extend the controller to delete from Azure Blob using `AzureBlobService` and optionally from the `azure_documents` table.
2. **downloadDocument** – Uses local storage. For Azure files, add support to stream or redirect using a signed URL for the blob path.
3. **shareItems** – For public links, returns created `SharedDocument` records; the frontend expects `public_token` for building the share URL.
