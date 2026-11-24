<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
     * Xử lý Webhook biến động số dư từ Sepay (Idempotent, transaction + row lock).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function handleWebhook(array $payload): array
    {
        $transferType = strtolower(trim((string) ($payload['transferType'] ?? '')));
        if ($transferType !== 'in') {
            return [
                'processed' => false,
                'ignored' => true,
                'reason' => 'not_incoming_transfer',
            ];
        }

        $configuredAccount = trim((string) config('services.sepay.account_number', ''));
        $incomingAccount = trim((string) ($payload['accountNumber'] ?? ''));
        if ($configuredAccount !== '' && $incomingAccount !== '' && $incomingAccount !== $configuredAccount) {
            return [
                'processed' => false,
                'ignored' => true,
                'reason' => 'account_mismatch',
            ];
        }

        $sepayId = $payload['id'] ?? null;
        $referenceCode = trim((string) ($payload['referenceCode'] ?? ''));
        $transferAmount = (float) ($payload['transferAmount'] ?? 0);

        $searchText = strtoupper(trim((string) (($payload['code'] ?? '').' '.($payload['content'] ?? ''))));
        if (! preg_match('/\b(STB[A-Z0-9]{6,24})\b/', $searchText, $matches)) {
            return [
                'processed' => false,
                'ignored' => true,
                'reason' => 'booking_code_not_found_in_content',
            ];
        }

        $normalizedCode = $matches[1];

        return DB::transaction(function () use ($payload, $sepayId, $referenceCode, $transferAmount, $normalizedCode) {
            // 1. Idempotency check theo sepay_id (chống xử lý trùng khi Sepay retry)
            if ($sepayId !== null && $sepayId !== '') {
                $alreadyPaidBySepayId = Payment::query()
                    ->where('status', 'paid')
                    ->where('gateway_response->sepay_id', $sepayId)
                    ->exists();

                if ($alreadyPaidBySepayId) {
                    return [
                        'processed' => true,
                        'already_processed' => true,
                        'reason' => 'duplicate_sepay_id',
                    ];
                }
            }

            // 2. Tìm và khóa dòng Booking khớp mã chuẩn hóa
            $booking = Booking::query()
                ->whereRaw("REPLACE(UPPER(booking_code), '-', '') = ?", [$normalizedCode])
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return [
                    'processed' => false,
                    'ignored' => true,
                    'reason' => 'booking_not_found',
                    'extracted_code' => $normalizedCode,
                ];
            }

            // 3. Nếu đơn đã được xác nhận/hoàn thành trước đó -> Idempotent return
            if (in_array($booking->status, ['confirmed', 'checked_in', 'completed'], true)) {
                return [
                    'processed' => true,
                    'already_processed' => true,
                    'booking_code' => $booking->booking_code,
                    'booking_status' => $booking->status,
                ];
            }

            // 4. Kiểm tra số tiền chuyển có đủ tiền cọc yêu cầu không
            if ($transferAmount < (float) $booking->deposit_amount) {
                Log::warning('Sepay Webhook: Số tiền chuyển nhỏ hơn tiền cọc yêu cầu.', [
                    'booking_code' => $booking->booking_code,
                    'expected' => (float) $booking->deposit_amount,
                    'received' => $transferAmount,
                    'sepay_id' => $sepayId,
                ]);

                Payment::create([
                    'booking_id' => $booking->id,
                    'payment_method' => 'sepay',
                    'amount' => $transferAmount,
                    'currency' => 'VND',
                    'transaction_code' => $referenceCode !== '' ? $referenceCode : (string) ($sepayId ?? $normalizedCode),
                    'status' => 'failed',
                    'gateway_response' => [
                        'sepay_id' => $sepayId,
                        'reason' => 'insufficient_amount',
                        'expected_amount' => (float) $booking->deposit_amount,
                        'webhook' => $payload,
                    ],
                ]);

                return [
                    'processed' => false,
                    'ignored' => false,
                    'reason' => 'insufficient_amount',
                    'booking_code' => $booking->booking_code,
                ];
            }

            // 5. Cập nhật hoặc tạo mới Payment -> paid
            $txCode = $referenceCode !== '' ? $referenceCode : (string) ($sepayId ?? $normalizedCode);
            $pendingPayment = Payment::query()
                ->where('booking_id', $booking->id)
                ->where('payment_method', 'sepay')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if ($pendingPayment) {
                $pendingPayment->update([
                    'amount' => $transferAmount,
                    'transaction_code' => $txCode,
                    'status' => 'paid',
                    'paid_at' => now(),
                    'gateway_response' => array_merge($pendingPayment->gateway_response ?? [], [
                        'sepay_id' => $sepayId,
                        'webhook' => $payload,
                    ]),
                ]);
            } else {
                Payment::create([
                    'booking_id' => $booking->id,
                    'payment_method' => 'sepay',
                    'amount' => $transferAmount,
                    'currency' => 'VND',
                    'transaction_code' => $txCode,
                    'status' => 'paid',
                    'paid_at' => now(),
                    'gateway_response' => [
                        'sepay_id' => $sepayId,
                        'webhook' => $payload,
                    ],
                ]);
            }

            // 6. Chuyển đơn sang confirmed & cộng lượt đặt dịch vụ
            $booking->update([
                'status' => 'confirmed',
                'payment_expires_at' => null,
            ]);

            if ($booking->service_id) {
                Service::where('id', $booking->service_id)->increment('total_bookings');
            }

            return [
                'processed' => true,
                'already_processed' => false,
                'booking_id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'booking_status' => 'confirmed',
                'amount' => $transferAmount,
            ];
        });
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
