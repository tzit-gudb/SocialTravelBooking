<?php

namespace App\Events;

use App\Models\Booking;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BookingUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $action;

    public int $bookingId;

    public string $bookingCode;

    public int $providerId;

    public ?int $userId;

    public string $status;

    public ?string $checkedInAt;

    public ?string $checkoutRequestedAt;

    public ?string $cancelledAt;

    public ?string $cancelReason;

    public float $releasedAmount;

    public function __construct(Booking $booking, string $action = 'updated', float $releasedAmount = 0.0)
    {
        $this->action = $action;
        $this->bookingId = (int) $booking->id;
        $this->bookingCode = (string) $booking->booking_code;
        $this->providerId = (int) $booking->provider_id;
        $this->userId = $booking->user_id ? (int) $booking->user_id : null;
        $this->status = (string) $booking->status;
        $this->checkedInAt = $booking->checked_in_at?->toIso8601String();
        $this->checkoutRequestedAt = $booking->checkout_requested_at?->toIso8601String();
        $this->cancelledAt = $booking->cancelled_at?->toIso8601String();
        $this->cancelReason = $booking->cancel_reason;
        $this->releasedAmount = $releasedAmount;
    }

    /**
     * Phát sóng tức thời đến Admin, Nhà cung cấp dịch vụ, Du khách và màn chi tiết đơn.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new Channel('admin.bookings'),
            new Channel("provider.{$this->providerId}.bookings"),
            new Channel("booking.{$this->bookingCode}"),
        ];

        if ($this->userId) {
            $channels[] = new Channel("tourist.{$this->userId}.bookings");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'booking.updated';
    }

    /**
     * Chỉ phát dữ liệu trạng thái không chứa thông tin cá nhân nhạy cảm (PII).
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'booking_id' => $this->bookingId,
            'booking_code' => $this->bookingCode,
            'provider_id' => $this->providerId,
            'user_id' => $this->userId,
            'status' => $this->status,
            'checked_in_at' => $this->checkedInAt,
            'checkout_requested_at' => $this->checkoutRequestedAt,
            'cancelled_at' => $this->cancelledAt,
            'cancel_reason' => $this->cancelReason,
            'released_amount' => $this->releasedAmount,
        ];
    }
}
