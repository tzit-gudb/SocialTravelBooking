<?php

namespace App\Http\Controllers\Api\V1\Provider;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\BookingService;
use App\Services\EscrowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly EscrowService $escrowService
    ) {}

    /**
     * GET /api/v1/provider/bookings
     * Danh sách đơn đặt chỗ thuộc các dịch vụ của Nhà cung cấp hiện tại.
     */
    public function index(Request $request): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp.',
            ], 403);
        }

        $this->bookingService->expireStaleHolds();

        $status = trim((string) $request->query('status', 'all'));
        $search = trim((string) $request->query('q', ''));
        $perPage = min(max((int) $request->query('per_page', 15), 1), 50);

        $baseQuery = Booking::query()->where('provider_id', $provider->id);

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $baseQuery->where(function ($sub) use ($like) {
                $sub->where('booking_code', 'ilike', $like)
                    ->orWhere('contact_name', 'ilike', $like)
                    ->orWhere('contact_phone', 'ilike', $like)
                    ->orWhereHas('service', fn ($s) => $s->where('name', 'ilike', $like));
            });
        }

        $countsRaw = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $counts = [
            'all' => array_sum(array_map('intval', $countsRaw)),
            'pending_payment' => (int) ($countsRaw['pending_payment'] ?? 0),
            'confirmed' => (int) ($countsRaw['confirmed'] ?? 0),
            'checked_in' => (int) ($countsRaw['checked_in'] ?? 0),
            'completed' => (int) ($countsRaw['completed'] ?? 0),
            'cancelled' => (int) ($countsRaw['cancelled'] ?? 0),
            'refunded' => (int) ($countsRaw['refunded'] ?? 0),
        ];

        $listQuery = (clone $baseQuery)
            ->with([
                'service:id,name,type,price_unit',
                'roomType:id,name,rank',
                'latestPayment:id,booking_id,payment_method,amount,status,paid_at',
            ])
            ->orderByDesc('created_at');

        if ($status !== '' && $status !== 'all') {
            $listQuery->where('status', $status);
        }

        $paginated = $listQuery->paginate($perPage);

        $items = $paginated->getCollection()->map(fn (Booking $b) => [
            'id' => $b->id,
            'booking_code' => $b->booking_code,
            'status' => $b->status,
            'checked_in_at' => $b->checked_in_at?->toIso8601String(),
            'checkout_requested_at' => $b->checkout_requested_at?->toIso8601String(),
            'payment_expires_at' => $b->payment_expires_at?->toIso8601String(),
            'start_date' => $b->start_date?->format('Y-m-d'),
            'end_date' => $b->end_date?->format('Y-m-d'),
            'quantity' => $b->quantity,
            'duration_units' => $b->duration_units,
            'total_amount' => (float) $b->total_amount,
            'deposit_rate' => (int) $b->deposit_rate,
            'deposit_amount' => (float) $b->deposit_amount,
            'remaining_amount' => (float) $b->remaining_amount,
            'contact_name' => $b->contact_name,
            'contact_phone' => $b->contact_phone,
            'contact_email' => $b->contact_email,
            'created_at' => $b->created_at?->toIso8601String(),
            'service' => $b->service ? [
                'id' => $b->service->id,
                'name' => $b->service->name,
                'type' => $b->service->type,
            ] : null,
            'room_type' => $b->roomType ? [
                'id' => $b->roomType->id,
                'name' => $b->roomType->name,
            ] : null,
            'latest_payment' => $b->latestPayment,
        ])->values();

        return response()->json([
            'success' => true,
            'provider_id' => $provider->id,
            'counts' => $counts,
            'data' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * GET /api/v1/provider/bookings/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp.',
            ], 403);
        }

        $this->bookingService->expireStaleHolds();

        $booking = Booking::query()
            ->where('id', $id)
            ->where('provider_id', $provider->id)
            ->with([
                'service:id,name,type,address,price_unit',
                'roomType:id,name,rank',
                'coupon:id,code',
                'servicePromotion.holidayCampaign:id,name',
                'payments',
            ])
            ->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ.',
            ], 404);
        }

        $booking->makeHidden(['qr_checkin_token']);

        return response()->json([
            'success' => true,
            'data' => $booking,
        ]);
    }

    /**
     * POST /api/v1/provider/bookings/check-in
     * Quét mã QR vé điện tử của khách -> Check-in & tự động giải phóng cọc Escrow vào ví.
     */
    public function checkInByQr(Request $request): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp.',
            ], 403);
        }

        $validated = $request->validate([
            'qr_data' => ['required', 'string', 'max:500'],
        ]);

        $result = $this->escrowService->checkInByQr($provider, $validated['qr_data']);
        $booking = $result['booking'];
        $booking->makeHidden(['qr_checkin_token']);

        return response()->json([
            'success' => true,
            'message' => $result['released_amount'] > 0
                ? 'Check-in thành công! Tiền cọc Escrow đã được giải phóng vào ví khả dụng.'
                : 'Check-in thành công!',
            'data' => [
                'booking' => $booking,
                'released_amount' => $result['released_amount'],
            ],
        ]);
    }

    /**
     * POST /api/v1/provider/bookings/{id}/complete
     * Nhà cung cấp xác nhận hoàn thành chuyến đi / trả phòng -> Chuyển đơn sang completed.
     */
    public function complete(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $booking = Booking::where('id', $id)->where('provider_id', $provider->id)->first();
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ thuộc cơ sở của bạn.',
            ], 404);
        }

        $completed = $this->bookingService->completeBookingByProvider($provider, $booking);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận hoàn thành chuyến đi! Du khách đã có thể gửi đánh giá dịch vụ.',
            'data' => $completed,
        ]);
    }
}
