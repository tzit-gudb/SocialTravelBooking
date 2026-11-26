<?php

namespace App\Http\Controllers\Api\V1\Tourist;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tourist\StoreReviewRequest;
use App\Models\Booking;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;

class TouristReviewController extends Controller
{
    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    /**
     * POST /api/v1/tourist/bookings/{id}/review
     * Du khách gửi đánh giá sao và nhận xét cho đơn đã check-in / hoàn thành.
     */
    public function store(StoreReviewRequest $request, int $id): JsonResponse
    {
        $booking = Booking::find($id);
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ.',
            ], 404);
        }

        $result = $this->reviewService->createReviewForBooking(
            $request->user(),
            $booking,
            $request->validated()
        );

        $isUpdated = ! empty($result['is_updated']);

        return response()->json([
            'success' => true,
            'message' => $isUpdated
                ? 'Đã cập nhật đánh giá dịch vụ của bạn!'
                : 'Cảm ơn bạn đã gửi đánh giá dịch vụ!',
            'data' => $result,
        ], $isUpdated ? 200 : 201);
    }
}
