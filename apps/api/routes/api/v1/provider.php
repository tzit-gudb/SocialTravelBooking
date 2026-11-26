<?php

use App\Http\Controllers\Api\V1\Provider\HotelRoomTypeController;
use App\Http\Controllers\Api\V1\Provider\KycController;
use App\Http\Controllers\Api\V1\Provider\ProviderBankAccountController;
use App\Http\Controllers\Api\V1\Provider\ProviderBookingController;
use App\Http\Controllers\Api\V1\Provider\ProviderCampaignController;
use App\Http\Controllers\Api\V1\Provider\ProviderProfileController;
use App\Http\Controllers\Api\V1\Provider\ProviderWalletController;
use App\Http\Controllers\Api\V1\Provider\ServiceAvailabilityController;
use App\Http\Controllers\Api\V1\Provider\ServiceController;
use Illuminate\Support\Facades\Route;

// Provider routes: /api/v1/provider/...
Route::get('/ping', function () {
    return response()->json(['message' => 'Provider module endpoints active']);
});

// ── Provider Profile & Wallet Endpoints ─────────────────────────
Route::get('/profile', [ProviderProfileController::class, 'show']);
Route::put('/profile', [ProviderProfileController::class, 'update']);

Route::prefix('bank-accounts')->group(function () {
    Route::get('/', [ProviderBankAccountController::class, 'index']);
    Route::post('/', [ProviderBankAccountController::class, 'store']);
    Route::put('/{id}', [ProviderBankAccountController::class, 'update'])->whereNumber('id');
    Route::patch('/{id}/default', [ProviderBankAccountController::class, 'setDefault'])->whereNumber('id');
    Route::delete('/{id}', [ProviderBankAccountController::class, 'destroy'])->whereNumber('id');
});

Route::prefix('wallet')->group(function () {
    Route::get('/', [ProviderWalletController::class, 'show']);
    Route::get('/transactions', [ProviderWalletController::class, 'transactions']);
    Route::get('/withdrawals', [ProviderWalletController::class, 'withdrawals']);
    Route::post('/withdraw', [ProviderWalletController::class, 'withdraw']);
    Route::post('/withdrawals/{id}/confirm-receipt', [ProviderWalletController::class, 'confirmReceipt'])->whereNumber('id');
    Route::post('/withdrawals/{id}/report-issue', [ProviderWalletController::class, 'reportIssue'])->whereNumber('id');
    Route::post('/activate', [ProviderProfileController::class, 'activateWallet']);
});

// ── Provider KYC & Onboarding Endpoints ─────────────────────────
Route::prefix('kyc')->group(function () {
    Route::post('/submit', [KycController::class, 'submit']);
    Route::get('/status', [KycController::class, 'status']);
});

// ── Provider Service Management & Media Album Endpoints ─────────
Route::prefix('services')->group(function () {
    Route::get('/', [ServiceController::class, 'index']);
    Route::post('/', [ServiceController::class, 'store']);
    Route::get('/{id}', [ServiceController::class, 'show']);
    Route::put('/{id}', [ServiceController::class, 'update']);
    Route::delete('/{id}', [ServiceController::class, 'destroy']);

    Route::post('/{id}/media', [ServiceController::class, 'uploadMedia']);
    Route::patch('/{id}/media/{mediaId}/cover', [ServiceController::class, 'setCoverMedia']);
    Route::delete('/{id}/media/{mediaId}', [ServiceController::class, 'deleteMedia']);

    // ── Service Availability & Hotel Room Types (Task #17) ─────────
    Route::get('/{serviceId}/availability', [ServiceAvailabilityController::class, 'index']);
    Route::put('/{serviceId}/availability', [ServiceAvailabilityController::class, 'upsert']);

    Route::get('/{serviceId}/room-types', [HotelRoomTypeController::class, 'index']);
    Route::post('/{serviceId}/room-types', [HotelRoomTypeController::class, 'store']);
    Route::put('/{serviceId}/room-types/{roomTypeId}', [HotelRoomTypeController::class, 'update']);
    Route::delete('/{serviceId}/room-types/{roomTypeId}', [HotelRoomTypeController::class, 'destroy']);
});

// ── Provider Holiday Campaigns Opt-in (Task #68) ──────────────
Route::prefix('campaigns')->group(function () {
    Route::get('/', [ProviderCampaignController::class, 'index']);
    Route::put('/{campaignId}/services', [ProviderCampaignController::class, 'toggleService']);
});

// ── Provider Booking Management ───────────────────────────────
Route::prefix('bookings')->group(function () {
    Route::get('/', [ProviderBookingController::class, 'index']);
    Route::post('/check-in', [ProviderBookingController::class, 'checkInByQr']);
    Route::get('/{id}', [ProviderBookingController::class, 'show'])->whereNumber('id');
});
