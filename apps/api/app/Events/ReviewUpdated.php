<?php

namespace App\Events;

use App\Models\Review;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReviewUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $action;

    public int $reviewId;

    public int $bookingId;

    public int $serviceId;

    public int $providerId;

    public int $rating;

    public float $serviceRatingAvg;

    public function __construct(Review $review, string $action = 'created', float $serviceRatingAvg = 0.0)
    {
        $review->loadMissing('service:id,provider_id,rating_avg');

        $this->action = $action;
        $this->reviewId = (int) $review->id;
        $this->bookingId = (int) $review->booking_id;
        $this->serviceId = (int) $review->service_id;
        $this->providerId = (int) ($review->service?->provider_id ?? 0);
        $this->rating = (int) $review->rating;
        $this->serviceRatingAvg = $serviceRatingAvg > 0
            ? $serviceRatingAvg
            : round((float) ($review->service?->rating_avg ?? 0), 2);
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new Channel("service.{$this->serviceId}.reviews"),
        ];

        if ($this->providerId > 0) {
            $channels[] = new Channel("provider.{$this->providerId}.reviews");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'review.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'review_id' => $this->reviewId,
            'booking_id' => $this->bookingId,
            'service_id' => $this->serviceId,
            'provider_id' => $this->providerId,
            'rating' => $this->rating,
            'service_rating_avg' => $this->serviceRatingAvg,
        ];
    }
}
