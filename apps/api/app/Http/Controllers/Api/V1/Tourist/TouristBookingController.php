<?php

namespace App\Http\Controllers\Api\V1\Tourist;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tourist\PreviewBookingRequest;
use App\Http\Requests\Tourist\StoreBookingRequest;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TouristBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {}

    /**
     * GET /api/v1/tourist/bookings
     */
    public function index(Request $request): JsonResponse
    {
        $this->bookingService->expireStaleHolds();

        $status = trim((string) $request->query('status', ''));
        $perPage = min(max((int) $request->query('per_page', 15), 1), 50);

        $query = Booking::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'service:id,name,type,slug,address,location_id,price_unit',
                'service.location:id,name',
                'service.media' => fn ($m) => $m->orderByDesc('is_cover')->orderBy('sort_order'),
                'provider:id,business_name,phone',
                'roomType:id,name,rank',
                'servicePromotion.holidayCampaign:id,name,badge_text',
                'coupon:id,code',
                'latestPayment',
                'review:id,booking_id,rating',
            ])
            ->orderByDesc('created_at');

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        $paginated = $query->paginate($perPage);

        $items = $paginated->getCollection()->map(function (Booking $booking) {
            $cover = $booking->service?->media->firstWhere('is_cover', true)
                ?? $booking->service?->media->first();

            return [
                'id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'status' => $booking->status,
                'payment_expires_at' => $booking->payment_expires_at?->toIso8601String(),
                'start_date' => $booking->start_date?->format('Y-m-d'),
                'end_date' => $booking->end_date?->format('Y-m-d'),
                'quantity' => $booking->quantity,
                'duration_units' => $booking->duration_units,
                'unit_price' => (float) $booking->unit_price,
                'subtotal' => (float) $booking->subtotal,
                'promotion_discount_amount' => (float) $booking->promotion_discount_amount,
                'coupon_discount_amount' => (float) $booking->coupon_discount_amount,
                'coupon_code' => $booking->coupon?->code,
                'total_amount' => (float) $booking->total_amount,
                'deposit_rate' => (int) $booking->deposit_rate,
                'deposit_amount' => (float) $booking->deposit_amount,
                'remaining_amount' => (float) $booking->remaining_amount,
                'contact_name' => $booking->contact_name,
                'contact_phone' => $booking->contact_phone,
                'contact_email' => $booking->contact_email,
                'metadata' => $booking->metadata,
                'cancel_reason' => $booking->cancel_reason,
                'created_at' => $booking->created_at?->toIso8601String(),
                'service' => $booking->service ? [
                    'id' => $booking->service->id,
                    'name' => $booking->service->name,
                    'type' => $booking->service->type,
                    'price_unit' => $booking->service->price_unit,
                    'address' => $booking->service->address,
                    'location_name' => $booking->service->location?->name,
                    'cover_image' => $cover?->url,
                ] : null,
                'provider' => $booking->provider ? [
                    'id' => $booking->provider->id,
                    'business_name' => $booking->provider->business_name,
                    'phone' => $booking->provider->phone,
                ] : null,
                'room_type' => $booking->roomType ? [
                    'id' => $booking->roomType->id,
                    'name' => $booking->roomType->name,
                    'rank' => $booking->roomType->rank,
                ] : null,
                'latest_payment' => $booking->latestPayment,
                'has_review' => $booking->review !== null,
            ];
        });

        return response()->json([
            'success' => true,
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
     * POST /api/v1/tourist/bookings/preview  &  POST /api/v1/public/bookings/preview
     */
    public function preview(PreviewBookingRequest $request): JsonResponse
    {
        $summary = $this->bookingService->preview($request->user(), $request->validated());

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * POST /api/v1/tourist/bookings  &  POST /api/v1/public/bookings
     */
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookingService->createBooking($request->user(), $request->validated());

        return response()->json([
            'success' => true,
            'message' => $booking->status === 'confirmed'
                ? 'Đặt chỗ thành công! Đơn của bạn đã được xác nhận.'
                : 'Đặt chỗ thành công! Vui lòng hoàn tất thanh toán trong vòng 10 phút để giữ chỗ.',
            'data' => $booking,
        ], 201);
    }

    /**
     * GET /api/v1/tourist/bookings/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $this->bookingService->expireStaleHolds();

        $booking = Booking::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->with([
                'service.media' => fn ($m) => $m->orderByDesc('is_cover')->orderBy('sort_order'),
                'service.location:id,name',
                'service.policies:id,name,slug,category,rule_key,rule_config,icon,description',
                'provider:id,business_name,phone,address',
                'roomType:id,name,rank,base_price',
                'servicePromotion.holidayCampaign',
                'coupon:id,code,type,discount_value',
                'payments',
                'review',
            ])
            ->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ.',
            ], 404);
        }

        $data = $booking->toArray();
        $data['policy_rules'] = $booking->service
            ? $this->bookingService->extractPolicyRules($booking->service)
            : null;

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * GET /api/v1/public/bookings/{bookingCode}?contact_phone=...
     * Cho phép khách vãng lai (hoặc khi restart app trong 10 phút giữ chỗ) tra cứu lại đơn theo mã đơn + SĐT.
     */
    public function lookupByCode(Request $request, string $bookingCode): JsonResponse
    {
        $this->bookingService->expireStaleHolds();

        $phone = trim((string) $request->query('contact_phone', ''));
        $query = Booking::query()
            ->where('booking_code', strtoupper(trim($bookingCode)))
            ->with([
                'service.media' => fn ($m) => $m->orderByDesc('is_cover')->orderBy('sort_order'),
                'service.location:id,name',
                'service.policies:id,name,slug,category,rule_key,rule_config,icon,description',
                'provider:id,business_name,phone,address',
                'roomType:id,name,rank,base_price',
                'coupon:id,code',
                'latestPayment',
            ]);

        if ($request->user()) {
            $query->where(function ($q) use ($request, $phone) {
                $q->where('user_id', $request->user()->id);
                if ($phone !== '') {
                    $q->orWhere('contact_phone', $phone);
                }
            });
        } else {
            if ($phone === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng cung cấp số điện thoại đã dùng khi đặt chỗ để tra cứu.',
                ], 422);
            }
            $query->where('contact_phone', $phone);
        }

        $booking = $query->first();
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ khớp với mã đơn và số điện thoại.',
            ], 404);
        }

        $data = $booking->toArray();
        $data['policy_rules'] = $booking->service
            ? $this->bookingService->extractPolicyRules($booking->service)
            : null;

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * POST /api/v1/tourist/bookings/{id}/cancel
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $booking = Booking::where('id', $id)->where('user_id', $request->user()->id)->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ.',
            ], 404);
        }

        $validated = $request->validate([
            'cancel_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancelled = $this->bookingService->cancelBooking(
            $request->user(),
            $booking,
            $validated['cancel_reason'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy đơn đặt chỗ thành công.',
            'data' => $cancelled,
        ]);
    }

    /**
     * POST /api/v1/public/bookings/{bookingCode}/cancel
     * Cho phép khách vãng lai hủy đơn đang chờ thanh toán bằng mã đơn + số điện thoại.
     */
    public function cancelByCode(Request $request, string $bookingCode): JsonResponse
    {
        $validated = $request->validate([
            'contact_phone' => ['required', 'string', 'max:30'],
            'cancel_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $booking = Booking::query()
            ->where('booking_code', strtoupper(trim($bookingCode)))
            ->where('contact_phone', trim($validated['contact_phone']))
            ->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ khớp với mã đơn và số điện thoại.',
            ], 404);
        }

        $cancelled = $this->bookingService->cancelBooking(
            $request->user(),
            $booking,
            $validated['cancel_reason'] ?? null,
            true
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy đơn đặt chỗ thành công.',
            'data' => $cancelled,
        ]);
    }
}
