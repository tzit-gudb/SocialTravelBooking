<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SepayService
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {}

    /**
     * Tạo hoặc tái sử dụng giao dịch QR Sepay cho đơn đặt chỗ đang chờ thanh toán.
     *
     * @return array<string, mixed>
     */
    public function createOrGetQrPayment(Booking $booking): array
    {
        $this->bookingService->expireStaleHolds($booking->service_id);
        $booking->refresh();

        if ($booking->status === 'confirmed') {
            throw ValidationException::withMessages([
                'booking' => ['Đơn đặt chỗ này đã được thanh toán và xác nhận trước đó.'],
            ]);
        }

        if ($booking->status === 'expired' || ($booking->payment_expires_at && $booking->payment_expires_at->isPast())) {
            throw ValidationException::withMessages([
                'booking' => ['Đơn đặt chỗ đã hết thời gian giữ chỗ 10 phút. Vui lòng đặt lại đơn mới.'],
            ]);
        }

        if ($booking->status !== 'pending_payment') {
            throw ValidationException::withMessages([
                'booking' => ['Đơn đặt chỗ hiện không ở trạng thái chờ thanh toán.'],
            ]);
        }

        $amount = (float) $booking->deposit_amount;
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'booking' => ['Đơn đặt chỗ này không yêu cầu thanh toán trực tuyến.'],
            ]);
        }

        $bankCode = (string) config('services.sepay.bank_code', 'TPBank');
        $accountNumber = (string) config('services.sepay.account_number', '');
        $accountName = (string) config('services.sepay.account_name', 'SOCIAL TRAVEL BOOKING');
        $qrBaseUrl = rtrim((string) config('services.sepay.qr_base_url', 'https://qr.sepay.vn/img'), '/');

        if ($accountNumber === '') {
            throw ValidationException::withMessages([
                'sepay' => ['Hệ thống chưa cấu hình số tài khoản ngân hàng Sepay.'],
            ]);
        }

        $transferContent = $this->buildTransferContent($booking->booking_code);
        $amountInt = (int) round($amount);
        $qrUrl = $this->buildQrUrl($qrBaseUrl, $accountNumber, $bankCode, $amountInt, $transferContent);

        $payment = DB::transaction(function () use ($booking, $amount, $bankCode, $accountNumber, $accountName, $transferContent, $qrUrl) {
            $existingPending = Payment::query()
                ->where('booking_id', $booking->id)
                ->where('payment_method', 'sepay')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            $meta = [
                'bank_code' => $bankCode,
                'account_number' => $accountNumber,
                'account_name' => $accountName,
                'transfer_content' => $transferContent,
                'qr_url' => $qrUrl,
            ];

            if ($existingPending && (int) round((float) $existingPending->amount) === (int) round($amount)) {
                $existingPending->update([
                    'gateway_response' => array_merge($existingPending->gateway_response ?? [], $meta),
                ]);

                return $existingPending->fresh();
            }

            return Payment::create([
                'booking_id' => $booking->id,
                'payment_method' => 'sepay',
                'amount' => $amount,
                'currency' => 'VND',
                'transaction_code' => $transferContent,
                'status' => 'pending',
                'gateway_response' => $meta,
            ]);
        });

        return [
            'payment_id' => $payment->id,
            'booking_id' => $booking->id,
            'booking_code' => $booking->booking_code,
            'booking_status' => $booking->status,
            'payment_status' => $payment->status,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'deposit_rate' => (int) $booking->deposit_rate,
            'total_amount' => (float) $booking->total_amount,
            'remaining_amount' => (float) $booking->remaining_amount,
            'payment_expires_at' => $booking->payment_expires_at?->toIso8601String(),
            'bank_code' => $bankCode,
            'account_number' => $accountNumber,
            'account_name' => $accountName,
            'transfer_content' => $transferContent,
            'qr_url' => $qrUrl,
        ];
    }

    /**
     * Kiểm tra trạng thái thanh toán hiện tại của đơn (dùng cho polling từ Mobile).
     *
     * @return array<string, mixed>
     */
    public function getPaymentStatus(Booking $booking): array
    {
        $this->bookingService->expireStaleHolds($booking->service_id);
        $booking->refresh();

        $latestPayment = $booking->latestPayment()->first();

        return [
            'booking_id' => $booking->id,
            'booking_code' => $booking->booking_code,
            'booking_status' => $booking->status,
            'payment_status' => $latestPayment?->status ?? 'pending',
            'paid_at' => $latestPayment?->paid_at?->toIso8601String(),
            'payment_expires_at' => $booking->payment_expires_at?->toIso8601String(),
            'amount' => (float) $booking->deposit_amount,
        ];
    }

    /**
     * Chuẩn hóa nội dung chuyển khoản (chỉ giữ chữ và số viết hoa để tránh ngân hàng lọc dấu gạch ngang).
     */
    public function buildTransferContent(string $bookingCode): string
    {
        $sanitized = preg_replace('/[^A-Z0-9]/', '', strtoupper($bookingCode));

        return $sanitized ?: strtoupper($bookingCode);
    }

    private function buildQrUrl(
        string $baseUrl,
        string $accountNumber,
        string $bankCode,
        int $amount,
        string $transferContent
    ): string {
        return $baseUrl.'?'.http_build_query([
            'acc' => $accountNumber,
            'bank' => $bankCode,
            'amount' => $amount,
            'des' => $transferContent,
            'template' => 'compact',
        ]);
    }
}
