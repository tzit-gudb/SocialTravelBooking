<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Media\MediaController;
use App\Http\Controllers\Api\V1\Public\CatalogController;
use App\Http\Controllers\Api\V1\Public\PublicPostController;
use App\Http\Controllers\Api\V1\Public\PublicServiceController;
use App\Http\Controllers\Api\V1\Tourist\TouristBookingController;
use App\Http\Controllers\Api\V1\Tourist\TouristPaymentController;
use App\Http\Controllers\Api\V1\Webhook\SepayWebhookController;
use Illuminate\Support\Facades\Route;

// Public & authentication routes: /api/v1/...
Route::get('/ping', function () {
    return response()->json([
        'success' => true,
        'message' => 'API v1 public endpoints active',
    ]);
});

// ── Authentication Endpoints ──────────────────────────────────────
Route::prefix('auth')->group(function () {
    // Đăng ký & Đăng nhập trực tiếp qua Backend
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Các route yêu cầu Bearer Token (Firebase ID Token hoặc Sanctum Token)
    Route::middleware('firebase.auth')->group(function () {
        Route::post('/sync', [AuthController::class, 'sync']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/avatar', [AuthController::class, 'uploadAvatar']);
    });
});

// ── Media Storage Endpoints ───────────────────────────────────────
Route::prefix('media')->middleware('firebase.auth')->group(function () {
    Route::post('/upload', [MediaController::class, 'upload']);
    Route::post('/upload-private', [MediaController::class, 'uploadPrivate']);
    Route::get('/private/{path}', [MediaController::class, 'showPrivate'])->where('path', '.*');
});

// ── Public Catalog & Discovery Endpoints ──────────────────────────
Route::prefix('public')->group(function () {
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/locations', [CatalogController::class, 'locations']);
    Route::get('/business-types', [CatalogController::class, 'businessTypes']);
    Route::get('/amenities', [CatalogController::class, 'amenities']);
    Route::get('/inclusions', [CatalogController::class, 'inclusions']);
    Route::get('/policies', [CatalogController::class, 'policies']);
    Route::get('/campaigns', [CatalogController::class, 'campaigns']);
    Route::get('/coupons', [CatalogController::class, 'coupons']);

    // Khám phá & Tìm kiếm Dịch vụ công khai (Task #19)
    Route::get('/services', [PublicServiceController::class, 'index']);
    Route::get('/services/{id}', [PublicServiceController::class, 'show']);

    // Bài đăng cộng đồng nổi bật (Task #19)
    Route::get('/posts/featured', [PublicPostController::class, 'featured']);

    // Đặt chỗ & Tra cứu không cần đăng nhập (Guest Checkout - Task #22 & #25)
    Route::post('/bookings/preview', [TouristBookingController::class, 'preview']);
    Route::post('/bookings', [TouristBookingController::class, 'store']);
    Route::get('/bookings/{bookingCode}', [TouristBookingController::class, 'lookupByCode']);
    Route::post('/bookings/{bookingCode}/cancel', [TouristBookingController::class, 'cancelByCode']);
    Route::post('/bookings/{bookingCode}/payment/sepay', [TouristPaymentController::class, 'createGuestSepayQr']);
    Route::get('/bookings/{bookingCode}/payment/status', [TouristPaymentController::class, 'guestPaymentStatus']);
});

// ── Payment Gateway Webhooks ──────────────────────────────────────
Route::post('/webhooks/sepay', [SepayWebhookController::class, 'handle']);
