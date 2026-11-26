<?php

use App\Http\Controllers\Api\V1\Admin\AdminAmenityController;
use App\Http\Controllers\Api\V1\Admin\AdminBookingController;
use App\Http\Controllers\Api\V1\Admin\AdminBusinessTypeController;
use App\Http\Controllers\Api\V1\Admin\AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\AdminCouponController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminHolidayCampaignController;
use App\Http\Controllers\Api\V1\Admin\AdminKycController;
use App\Http\Controllers\Api\V1\Admin\AdminLocationController;
use App\Http\Controllers\Api\V1\Admin\AdminReportController;
use App\Http\Controllers\Api\V1\Admin\AdminServiceController;
use App\Http\Controllers\Api\V1\Admin\AdminServiceInclusionController;
use App\Http\Controllers\Api\V1\Admin\AdminServicePolicyController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AdminWithdrawalController;
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

// Phân hệ Kiểm duyệt & Phê duyệt/Từ chối Dịch vụ (Task #46)
Route::prefix('services')->group(function () {
    Route::get('/', [AdminServiceController::class, 'index']);
    Route::get('/{id}', [AdminServiceController::class, 'show']);
    Route::post('/{id}/approve', [AdminServiceController::class, 'approve']);
    Route::post('/{id}/reject', [AdminServiceController::class, 'reject']);
});

// Phân hệ Quản lý Tài khoản Người dùng (Task #52)
Route::prefix('users')->group(function () {
    Route::get('/', [AdminUserController::class, 'index']);
    Route::get('/{id}', [AdminUserController::class, 'show']);
    Route::patch('/{id}/status', [AdminUserController::class, 'updateStatus']);
});

// Phân hệ Quản lý Mã ưu đãi toàn sàn & Tặng mã cho Tourist (Task #53)
Route::prefix('coupons')->group(function () {
    Route::get('/', [AdminCouponController::class, 'index']);
    Route::post('/', [AdminCouponController::class, 'store']);
    Route::put('/{id}', [AdminCouponController::class, 'update']);
    Route::delete('/{id}', [AdminCouponController::class, 'destroy']);
    Route::get('/{id}/grants', [AdminCouponController::class, 'grants']);
    Route::post('/{id}/grant', [AdminCouponController::class, 'grant']);
});

// Phân hệ Cấu hình Hệ thống: Điểm đến, Danh mục & Loại hình kinh doanh (Task #54)
Route::prefix('locations')->group(function () {
    Route::get('/', [AdminLocationController::class, 'index']);
    Route::post('/', [AdminLocationController::class, 'store']);
    Route::put('/{id}', [AdminLocationController::class, 'update']);
    Route::delete('/{id}', [AdminLocationController::class, 'destroy']);
});

Route::prefix('categories')->group(function () {
    Route::get('/', [AdminCategoryController::class, 'index']);
    Route::post('/', [AdminCategoryController::class, 'store']);
    Route::put('/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/{id}', [AdminCategoryController::class, 'destroy']);
});

Route::prefix('business-types')->group(function () {
    Route::get('/', [AdminBusinessTypeController::class, 'index']);
    Route::post('/', [AdminBusinessTypeController::class, 'store']);
    Route::put('/{id}', [AdminBusinessTypeController::class, 'update']);
    Route::delete('/{id}', [AdminBusinessTypeController::class, 'destroy']);
});

// Phân hệ Quản lý Tiện nghi & Bao gồm/Không bao gồm (Task #60)
Route::prefix('amenities')->group(function () {
    Route::get('/', [AdminAmenityController::class, 'index']);
    Route::post('/', [AdminAmenityController::class, 'store']);
    Route::put('/{id}', [AdminAmenityController::class, 'update']);
    Route::delete('/{id}', [AdminAmenityController::class, 'destroy']);
});

Route::prefix('inclusions')->group(function () {
    Route::get('/', [AdminServiceInclusionController::class, 'index']);
    Route::post('/', [AdminServiceInclusionController::class, 'store']);
    Route::put('/{id}', [AdminServiceInclusionController::class, 'update']);
    Route::delete('/{id}', [AdminServiceInclusionController::class, 'destroy']);
});

// Phân hệ Quản lý Chính sách dịch vụ & Chương trình khuyến mãi ngày lễ (Task #67)
Route::prefix('policies')->group(function () {
    Route::get('/', [AdminServicePolicyController::class, 'index']);
    Route::post('/', [AdminServicePolicyController::class, 'store']);
    Route::put('/{id}', [AdminServicePolicyController::class, 'update']);
    Route::delete('/{id}', [AdminServicePolicyController::class, 'destroy']);
});

Route::prefix('campaigns')->group(function () {
    Route::get('/', [AdminHolidayCampaignController::class, 'index']);
    Route::post('/', [AdminHolidayCampaignController::class, 'store']);
    Route::put('/{id}', [AdminHolidayCampaignController::class, 'update']);
    Route::post('/{id}/reopen', [AdminHolidayCampaignController::class, 'reopen']);
    Route::delete('/{id}', [AdminHolidayCampaignController::class, 'destroy']);
});

// Phân hệ Kiểm duyệt Nội dung & Báo cáo Cộng đồng (Task #55)
Route::prefix('reports')->group(function () {
    Route::get('/', [AdminReportController::class, 'index']);
    Route::get('/{id}', [AdminReportController::class, 'show']);
    Route::post('/{id}/resolve', [AdminReportController::class, 'resolve']);
});

// Phân hệ Tổng quan Vận hành & Giám sát Đơn đặt chỗ / Đối soát Ví (Task #56)
Route::get('/dashboard', [AdminDashboardController::class, 'overview']);
Route::get('/dashboard/chart', [AdminDashboardController::class, 'chart']);
Route::prefix('bookings')->group(function () {
    Route::get('/', [AdminBookingController::class, 'index']);
    Route::get('/{id}', [AdminBookingController::class, 'show']);
});

// Phân hệ Đối soát & Chi trả Yêu cầu Rút tiền của Nhà cung cấp dịch vụ (Task #30)
Route::prefix('withdrawals')->group(function () {
    Route::get('/', [AdminWithdrawalController::class, 'index']);
    Route::post('/{id}/confirm-paid', [AdminWithdrawalController::class, 'confirmPaid'])->whereNumber('id');
    Route::post('/{id}/reject', [AdminWithdrawalController::class, 'reject'])->whereNumber('id');
});
