<?php

namespace App\Http\Controllers\Api\V1\Social;

use App\Http\Controllers\Controller;
use App\Http\Requests\Social\StoreCommentRequest;
use App\Models\User;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialInteractionController extends Controller
{
    public function __construct(
        protected SocialService $socialService
    ) {}

    /**
     * POST /api/v1/social/posts/{id}/like
     */
    public function toggleLike(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $result = $this->socialService->toggleLike($user, $id);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * POST /api/v1/social/posts/{id}/save
     */
    public function toggleSave(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $result = $this->socialService->toggleSave($user, $id);

        return response()->json([
            'success' => true,
            'message' => $result['is_saved'] ? 'Đã lưu bài viết.' : 'Đã bỏ lưu bài viết.',
            'data' => $result,
        ]);
    }

    /**
     * GET /api/v1/social/posts/{id}/comments
     */
    public function listComments(Request $request, int $id): JsonResponse
    {
        $result = $this->socialService->listComments(
            $id,
            (int) $request->query('per_page', 20)
        );

        return response()->json([
            'success' => true,
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }

    /**
     * POST /api/v1/social/posts/{id}/comments
     */
    public function storeComment(StoreCommentRequest $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $result = $this->socialService->addComment($user, $id, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi bình luận.',
            'data' => $result,
        ], 201);
    }

    /**
     * GET /api/v1/social/search
     */
    public function search(Request $request): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user() ?? $request->attributes->get('userModel');
        $result = $this->socialService->searchSocial($viewer, (string) $request->query('q', ''));

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * GET /api/v1/social/activity
     */
    public function activity(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $result = $this->socialService->listActivity($user, (int) $request->query('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $result['data'],
            'unread_count' => $result['unread_count'],
            'meta' => $result['meta'],
        ]);
    }

    /**
     * POST /api/v1/social/activity/read
     */
    public function markActivityRead(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $updated = $this->socialService->markActivityAsRead($user);

        return response()->json([
            'success' => true,
            'data' => ['marked_read' => $updated],
        ]);
    }
}
