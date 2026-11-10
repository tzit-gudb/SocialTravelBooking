<?php

use App\Http\Controllers\Api\V1\Provider\KycController;
use Illuminate\Support\Facades\Route;

// Provider routes: /api/v1/provider/...
Route::get('/ping', function () {
    return response()->json(['message' => 'Provider module endpoints active']);
});

// ── Provider KYC & Onboarding Endpoints ─────────────────────────
Route::prefix('kyc')->group(function () {
    Route::post('/submit', [KycController::class, 'submit']);
    Route::get('/status', [KycController::class, 'status']);
});
