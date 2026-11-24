<?php

namespace App\Services;

use App\Events\BookingUpdated;
use App\Models\Booking;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class EscrowService
{
    /**
     * Tạm khóa tiền cọc vào locked_balance trong ví Provider khi thanh toán Sepay thành công.
     */
    public function lockDepositOnPayment(Booking $booking): void
    {
        $amount = round((float) $booking->deposit_amount, 2);
        if ($amount <= 0) {
            return;
        }

        $provider = ProviderProfile::find($booking->provider_id);
        if (! $provider || ! $provider->user_id) {
            return;
        }

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $provider->user_id],
            [
                'balance' => 0.00,
                'locked_balance' => 0.00,
                'currency' => 'VND',
            ]
        );

        $lockedWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->firstOrFail();
        $lockedWallet->increment('locked_balance', $amount);
    }

    /**
     * Nhà cung cấp quét mã QR vé điện tử để check-in và tự động giải phóng tiền cọc vào ví.
     *
     * @return array<string, mixed>
     */
    public function checkInByQr(ProviderProfile $provider, string $rawQrData): array
    {
        $parsed = $this->parseQrPayload($rawQrData);
        $token = $parsed['token'];
        $bookingCode = $parsed['code'];

        if ($token === '' && $bookingCode === '') {
            throw ValidationException::withMessages([
                'qr_data' => ['Mã QR hoặc mã vé check-in không hợp lệ.'],
            ]);
        }

        $result = DB::transaction(function () use ($provider, $token, $bookingCode) {
            $query = Booking::query()->where('provider_id', $provider->id);

            if ($token !== '') {
                $query->where('qr_checkin_token', $token);
                if ($bookingCode !== '') {
                    $query->where('booking_code', $bookingCode);
                }
            } else {
                $query->where('booking_code', $bookingCode);
            }

            $booking = $query->lockForUpdate()->first();

            if (! $booking) {
                throw ValidationException::withMessages([
                    'qr_data' => ['Không tìm thấy đơn đặt chỗ hợp lệ thuộc cơ sở của bạn cho mã QR này.'],
                ]);
            }

            if ($booking->checked_in_at !== null || in_array($booking->status, ['checked_in', 'completed'], true)) {
                throw ValidationException::withMessages([
                    'qr_data' => ["Đơn {$booking->booking_code} đã được check-in trước đó."],
                ]);
            }

            if ($booking->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'qr_data' => ["Đơn {$booking->booking_code} hiện đang ở trạng thái \"{$booking->status}\", không thể check-in."],
                ]);
            }

            $booking->update([
                'status' => 'checked_in',
                'checked_in_at' => now(),
            ]);

            $releasedAmount = $this->releaseDepositToWallet($booking, $provider->user_id, 'Nhà cung cấp dịch vụ quét QR check-in');

            return [
                'booking' => $booking->fresh(['service:id,name,type', 'roomType:id,name']),
                'released_amount' => $releasedAmount,
            ];
        });

        $this->broadcastCheckedInSafely($result['booking'], (float) $result['released_amount']);

        return $result;
    }

    /**
     * Du khách tự xác nhận đã nhận dịch vụ -> chuyển trạng thái checked_in và giải phóng cọc Escrow.
     *
     * @return array<string, mixed>
     */
    public function confirmCheckInByTourist(User $tourist, Booking $booking): array
    {
        if ((int) $booking->user_id !== (int) $tourist->id) {
            abort(403, 'Bạn không có quyền xác nhận đơn đặt chỗ này.');
        }

        $result = DB::transaction(function () use ($booking) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();

            if ($locked->checked_in_at !== null || in_array($locked->status, ['checked_in', 'completed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Đơn đặt chỗ này đã được xác nhận check-in trước đó.'],
                ]);
            }

            if ($locked->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ có thể xác nhận check-in khi đơn đã được thanh toán và xác nhận.'],
                ]);
            }

            $locked->update([
                'status' => 'checked_in',
                'checked_in_at' => now(),
            ]);

            $provider = ProviderProfile::find($locked->provider_id);
            $releasedAmount = $provider?->user_id
                ? $this->releaseDepositToWallet($locked, $provider->user_id, 'Du khách xác nhận đã nhận dịch vụ')
                : 0.0;

            return [
                'booking' => $locked->fresh(),
                'released_amount' => $releasedAmount,
            ];
        });

        $this->broadcastCheckedInSafely($result['booking'], (float) $result['released_amount']);

        return $result;
    }

    private function broadcastCheckedInSafely(?Booking $booking, float $releasedAmount): void
    {
        if (! $booking) {
            return;
        }

        try {
            BookingUpdated::dispatch($booking, 'checked_in', $releasedAmount);
        } catch (\Throwable $e) {
            Log::warning('Không thể phát sự kiện realtime BookingUpdated (checked_in): '.$e->getMessage(), [
                'booking_code' => $booking->booking_code,
            ]);
        }
    }

    /**
     * Giải phóng tiền cọc từ locked_balance sang balance (idempotent theo booking_code).
     */
    private function releaseDepositToWallet(Booking $booking, int $providerUserId, string $sourceNote): float
    {
        $amount = round((float) $booking->deposit_amount, 2);
        if ($amount <= 0) {
            return 0.0;
        }

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $providerUserId],
            [
                'balance' => 0.00,
                'locked_balance' => 0.00,
                'currency' => 'VND',
            ]
        );

        $lockedWallet = Wallet::where('id', $wallet->id)->lockForUpdate()->firstOrFail();

        // Chống giải ngân trùng lặp nếu đã có giao dịch booking_payment cho booking_code này
        $alreadyReleased = WalletTransaction::query()
            ->where('wallet_id', $lockedWallet->id)
            ->where('type', 'booking_payment')
            ->where('reference_id', $booking->booking_code)
            ->exists();

        if ($alreadyReleased) {
            return 0.0;
        }

        $balanceBefore = (float) $lockedWallet->balance;
        $balanceAfter = round($balanceBefore + $amount, 2);
        $nextLocked = max(0.0, round((float) $lockedWallet->locked_balance - $amount, 2));

        $lockedWallet->update([
            'balance' => $balanceAfter,
            'locked_balance' => $nextLocked,
        ]);

        WalletTransaction::create([
            'wallet_id' => $lockedWallet->id,
            'type' => 'booking_payment',
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'note' => "Giải phóng cọc Escrow đơn {$booking->booking_code} ({$sourceNote})",
            'reference_id' => $booking->booking_code,
        ]);

        return $amount;
    }

    /**
     * @return array{code: string, token: string}
     */
    private function parseQrPayload(string $raw): array
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return ['code' => '', 'token' => ''];
        }

        if (str_starts_with($trimmed, '{')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return [
                    'code' => strtoupper(trim((string) ($decoded['code'] ?? ''))),
                    'token' => trim((string) ($decoded['token'] ?? '')),
                ];
            }
        }

        if (str_starts_with(strtoupper($trimmed), 'STB-')) {
            return ['code' => strtoupper($trimmed), 'token' => ''];
        }

        return ['code' => '', 'token' => $trimmed];
    }
}
