<?php

use App\Http\Controllers\Api\V1\Social\SocialInteractionController;
use App\Http\Controllers\Api\V1\Social\SocialPostController;
use App\Http\Controllers\Api\V1\Social\SocialProfileController;
use Illuminate\Support\Facades\Route;

// Social Community routes: /api/v1/social/... (Yêu cầu xác thực firebase.auth)

// ── Hồ sơ Mạng xã hội (Onboarding & Profile) ──────────────────────
Route::get('/profile/me', [SocialProfileController::class, 'me']);
Route::post('/profile', [SocialProfileController::class, 'upsert']);
Route::get('/users/{userId}', [SocialProfileController::class, 'show'])->whereNumber('userId');
Route::post('/users/{userId}/follow', [SocialProfileController::class, 'toggleFollow'])->whereNumber('userId');

// ── Bảng tin & Bài viết (Feed & Posts) ────────────────────────────
Route::get('/posts', [SocialPostController::class, 'index']);
Route::post('/posts', [SocialPostController::class, 'store']);
Route::put('/posts/{id}', [SocialPostController::class, 'update'])->whereNumber('id');
Route::delete('/posts/{id}', [SocialPostController::class, 'destroy'])->whereNumber('id');

// ── Tương tác bài viết (Like, Save, Comment) ──────────────────────
Route::post('/posts/{id}/like', [SocialInteractionController::class, 'toggleLike'])->whereNumber('id');
Route::post('/posts/{id}/save', [SocialInteractionController::class, 'toggleSave'])->whereNumber('id');
Route::get('/posts/{id}/comments', [SocialInteractionController::class, 'listComments'])->whereNumber('id');
Route::post('/posts/{id}/comments', [SocialInteractionController::class, 'storeComment'])->whereNumber('id');

// ── Tìm kiếm & Hoạt động (Search & Activity) ──────────────────────
Route::get('/search', [SocialInteractionController::class, 'search']);
Route::get('/activity', [SocialInteractionController::class, 'activity']);
Route::post('/activity/read', [SocialInteractionController::class, 'markActivityRead']);
