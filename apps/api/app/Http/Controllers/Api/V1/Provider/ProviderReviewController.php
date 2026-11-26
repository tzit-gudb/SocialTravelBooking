<?php

namespace App\Http\Controllers\Api\V1\Provider;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderReviewController extends Controller
{
    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    /**
     * GET /api/v1/provider/reviews
     */
    public function index(Request $request): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $result = $this->reviewService->listProviderReviews($provider, [
            'reply_status' => $request->query('reply_status', 'all'),
            'rating' => $request->query('rating', 'all'),
            'q' => $request->query('q', ''),
            'per_page' => $request->query('per_page', 15),
        ]);

        return response()->json(array_merge(['success' => true], $result));
    }

    /**
     * POST /api/v1/provider/reviews/{id}/reply
     */
    public function reply(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $review = Review::find($id);
        if (! $review) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đánh giá.',
            ], 404);
        }

        $validated = $request->validate([
            'provider_reply' => ['required', 'string', 'min:2', 'max:1500'],
        ], [
            'provider_reply.required' => 'Vui lòng nhập nội dung phản hồi.',
            'provider_reply.min' => 'Nội dung phản hồi phải có ít nhất 2 ký tự.',
            'provider_reply.max' => 'Nội dung phản hồi không được vượt quá 1500 ký tự.',
        ]);

        $updated = $this->reviewService->replyByProvider($provider, $review, $validated['provider_reply']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phản hồi đánh giá tới du khách!',
            'data' => $updated,
        ]);
    }
}
