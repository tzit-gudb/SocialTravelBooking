<?php

namespace App\Http\Controllers\Api\V1\Social;

use App\Http\Controllers\Controller;
use App\Http\Requests\Social\SetupSocialProfileRequest;
use App\Models\User;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialProfileController extends Controller
{
    public function __construct(
        protected SocialService $socialService
    ) {}

    /**
     * GET /api/v1/social/profile/me
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');

        return response()->json([
            'success' => true,
            'data' => $this->socialService->getMyProfile($user),
        ]);
    }

    /**
     * POST /api/v1/social/profile
     */
    public function upsert(SetupSocialProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $wasInitialized = $user->socialProfile()->exists();

        $result = $this->socialService->setupOrUpdateProfile($user, $request->validated());

        return response()->json([
            'success' => true,
            'message' => $wasInitialized
                ? 'Đã cập nhật hồ sơ mạng xã hội thành công.'
                : 'Khởi tạo tài khoản mạng xã hội thành công! Chào mừng bạn đến với cộng đồng.',
            'data' => $result,
        ], $wasInitialized ? 200 : 201);
    }

    /**
     * GET /api/v1/social/users/{userId}
     */
    public function show(Request $request, int $userId): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user() ?? $request->attributes->get('userModel');

        return response()->json([
            'success' => true,
            'data' => $this->socialService->getUserProfile($viewer, $userId),
        ]);
    }

    /**
     * POST /api/v1/social/users/{userId}/follow
     */
    public function toggleFollow(Request $request, int $userId): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user() ?? $request->attributes->get('userModel');
        $result = $this->socialService->toggleFollow($viewer, $userId);

        return response()->json([
            'success' => true,
            'message' => $result['is_following'] ? 'Đã theo dõi người dùng.' : 'Đã bỏ theo dõi.',
            'data' => $result,
        ]);
    }
}
