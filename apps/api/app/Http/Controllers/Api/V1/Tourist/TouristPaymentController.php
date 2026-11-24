<?php

namespace App\Http\Controllers\Api\V1\Tourist;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\SepayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TouristPaymentController extends Controller
{
    public function __construct(
        private readonly SepayService $sepayService
    ) {}

    /**
     * POST /api/v1/tourist/bookings/{id}/payment/sepay
     */
    public function createSepayQr(Request $request, int $id): JsonResponse
    {
        $booking = Booking::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ.',
            ], 404);
        }

        $qrPayload = $this->sepayService->createOrGetQrPayment($booking);

        return response()->json([
            'success' => true,
            'message' => 'Đã khởi tạo mã QR thanh toán Sepay.',
            'data' => $qrPayload,
        ]);
    }

    /**
     * GET /api/v1/tourist/bookings/{id}/payment/status
     */
    public function paymentStatus(Request $request, int $id): JsonResponse
    {
        $booking = Booking::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->sepayService->getPaymentStatus($booking),
        ]);
    }

    /**
     * POST /api/v1/public/bookings/{bookingCode}/payment/sepay
     */
    public function createGuestSepayQr(Request $request, string $bookingCode): JsonResponse
    {
        $validated = $request->validate([
            'contact_phone' => ['required', 'string', 'max:30'],
        ]);

        $booking = $this->findGuestBooking($bookingCode, $validated['contact_phone']);
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ khớp với mã đơn và số điện thoại.',
            ], 404);
        }

        $qrPayload = $this->sepayService->createOrGetQrPayment($booking);

        return response()->json([
            'success' => true,
            'message' => 'Đã khởi tạo mã QR thanh toán Sepay.',
            'data' => $qrPayload,
        ]);
    }

    /**
     * GET /api/v1/public/bookings/{bookingCode}/payment/status?contact_phone=...
     */
    public function guestPaymentStatus(Request $request, string $bookingCode): JsonResponse
    {
        $phone = trim((string) $request->query('contact_phone', ''));
        if ($phone === '') {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng cung cấp số điện thoại đặt chỗ.',
            ], 422);
        }

        $booking = $this->findGuestBooking($bookingCode, $phone);
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn đặt chỗ khớp với mã đơn và số điện thoại.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->sepayService->getPaymentStatus($booking),
        ]);
    }

    private function findGuestBooking(string $bookingCode, string $phone): ?Booking
    {
        return Booking::query()
            ->where('booking_code', strtoupper(trim($bookingCode)))
            ->where('contact_phone', trim($phone))
            ->first();
    }
}
