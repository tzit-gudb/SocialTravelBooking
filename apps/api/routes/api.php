<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Social Travel Booking API',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// API Version 1
Route::prefix('v1')->group(function () {
    // Public & Auth routes: /api/v1/...
    Route::group([], base_path('routes/api/v1/public.php'));

    // Tourist routes: /api/v1/tourist/... (Yêu cầu xác thực + Role Tourist hoặc Admin)
    Route::prefix('tourist')
        ->middleware(['firebase.auth', 'role:tourist,admin'])
        ->group(base_path('routes/api/v1/tourist.php'));

    // Social Community routes: /api/v1/social/... (Yêu cầu xác thực)
    Route::prefix('social')
        ->middleware(['firebase.auth'])
        ->group(base_path('routes/api/v1/social.php'));

    // Provider routes: /api/v1/provider/... (Yêu cầu xác thực + Role Provider hoặc Admin)
    Route::prefix('provider')
        ->middleware(['firebase.auth', 'role:provider,admin'])
        ->group(base_path('routes/api/v1/provider.php'));

    // Admin routes: /api/v1/admin/... (Yêu cầu xác thực + Role Admin)
    Route::prefix('admin')
        ->middleware(['firebase.auth', 'role:admin'])
        ->group(base_path('routes/api/v1/admin.php'));
});
