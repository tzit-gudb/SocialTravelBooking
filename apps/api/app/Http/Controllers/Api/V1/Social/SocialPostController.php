<?php

namespace App\Http\Controllers\Api\V1\Social;

use App\Http\Controllers\Controller;
use App\Http\Requests\Social\StorePostRequest;
use App\Models\User;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialPostController extends Controller
{
    public function __construct(
        protected SocialService $socialService
    ) {}

    /**
     * GET /api/v1/social/posts
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user() ?? $request->attributes->get('userModel');

        $result = $this->socialService->listFeed($viewer, [
            'tab' => $request->query('tab', 'for_you'),
            'user_id' => $request->query('user_id'),
            'q' => $request->query('q'),
            'tag' => $request->query('tag'),
            'per_page' => $request->query('per_page', 15),
        ]);

        return response()->json([
            'success' => true,
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }

    /**
     * POST /api/v1/social/posts
     */
    public function store(StorePostRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $post = $this->socialService->createPost($user, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Đã đăng bài viết lên cộng đồng.',
            'data' => $post,
        ], 201);
    }

    /**
     * DELETE /api/v1/social/posts/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user() ?? $request->attributes->get('userModel');
        $this->socialService->deletePost($user, $id);

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa bài viết.',
        ]);
    }
}
