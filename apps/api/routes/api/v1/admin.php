<?php

use App\Http\Controllers\Api\V1\Admin\AdminKycController;
use Illuminate\Support\Facades\Route;

// Admin routes: /api/v1/admin/...
Route::get('/ping', function () {
    return response()->json(['message' => 'Admin module endpoints active']);
});

// Phân hệ Quản trị & Phê duyệt hồ sơ đối tác (KYC Review)
Route::prefix('kyc')->group(function () {
    Route::get('/providers', [AdminKycController::class, 'index']);
    Route::get('/providers/{id}', [AdminKycController::class, 'show']);
    Route::post('/providers/{id}/approve', [AdminKycController::class, 'approve']);
    Route::post('/providers/{id}/reject', [AdminKycController::class, 'reject']);
});
