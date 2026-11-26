<?php

namespace App\Services;

use App\Events\ReviewUpdated;
use App\Models\Booking;
use App\Models\ProviderProfile;
use App\Models\Review;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ReviewService
{
    /**
     * Du khách gửi đánh giá & chấm sao cho đơn đặt chỗ đã check-in / hoàn thành.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function createReviewForBooking(User $tourist, Booking $booking, array $data): array
    {
        if ((int) $booking->user_id !== (int) $tourist->id) {
            abort(403, 'Bạn không có quyền đánh giá đơn đặt chỗ này.');
        }

        if ($booking->status !== 'completed') {
            throw ValidationException::withMessages([
                'status' => ['Chỉ có thể đánh giá sau khi chuyến đi đã được Nhà cung cấp xác nhận hoàn thành.'],
            ]);
        }

        $result = DB::transaction(function () use ($tourist, $booking, $data) {
            $lockedBooking = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();

            $existingReview = Review::query()
                ->where('service_id', $lockedBooking->service_id)
                ->where('user_id', $tourist->id)
                ->lockForUpdate()
                ->first();

            $cleanContent = isset($data['content']) ? trim((string) $data['content']) : null;
            $cleanPros = isset($data['pros']) ? trim((string) $data['pros']) : null;
            $cleanCons = isset($data['cons']) ? trim((string) $data['cons']) : null;
            $images = is_array($data['images'] ?? null)
                ? array_values(array_filter(array_map('trim', $data['images'])))
                : null;

            $attributes = [
                'rating' => (int) $data['rating'],
                'cleanliness_rating' => isset($data['cleanliness_rating']) ? (int) $data['cleanliness_rating'] : null,
                'service_rating' => isset($data['service_rating']) ? (int) $data['service_rating'] : null,
                'location_rating' => isset($data['location_rating']) ? (int) $data['location_rating'] : null,
                'value_rating' => isset($data['value_rating']) ? (int) $data['value_rating'] : null,
                'content' => $cleanContent !== '' ? $cleanContent : null,
                'pros' => $cleanPros !== '' ? $cleanPros : null,
                'cons' => $cleanCons !== '' ? $cleanCons : null,
                'is_recommended' => array_key_exists('is_recommended', $data) ? (bool) $data['is_recommended'] : true,
                'images' => ! empty($images) ? $images : null,
            ];

            $isUpdated = false;
            if ($existingReview) {
                $existingReview->update($attributes);
                $review = $existingReview;
                $isUpdated = true;
            } else {
                $review = Review::create(array_merge($attributes, [
                    'booking_id' => $lockedBooking->id,
                    'service_id' => $lockedBooking->service_id,
                    'user_id' => $tourist->id,
                ]));
            }

            $service = Service::where('id', $lockedBooking->service_id)->lockForUpdate()->first();
            $ratingAvg = round((float) Review::where('service_id', $lockedBooking->service_id)->avg('rating'), 2);
            if ($service) {
                $service->update(['rating_avg' => $ratingAvg]);
            }

            return [
                'review' => $review->fresh([
                    'user:id,email',
                    'user.touristProfile:id,user_id,name',
                    'user.socialProfile:id,user_id,display_name,avatar_url',
                    'service:id,name,provider_id,rating_avg',
                    'booking:id,booking_code',
                ]),
                'rating_avg' => $ratingAvg,
                'is_updated' => $isUpdated,
            ];
        });

        $this->broadcastSafely(
            $result['review'],
            $result['is_updated'] ? 'updated' : 'created',
            $result['rating_avg']
        );

        return [
            'review' => $this->transformReview($result['review']),
            'service_rating_avg' => $result['rating_avg'],
            'is_updated' => $result['is_updated'],
        ];
    }

    /**
     * Lấy danh sách đánh giá công khai của 1 dịch vụ (có lọc theo sao & phân trang).
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function listPublicServiceReviews(int $serviceId, array $filters): array
    {
        $rating = $filters['rating'] ?? null;
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 50);

        $query = Review::query()
            ->where('service_id', $serviceId)
            ->with([
                'user:id,email',
                'user.touristProfile:id,user_id,name',
                'user.socialProfile:id,user_id,display_name,avatar_url',
            ])
            ->latest('created_at');

        if (is_numeric($rating) && (int) $rating >= 1 && (int) $rating <= 5) {
            $query->where('rating', (int) $rating);
        }

        $paginated = $query->paginate($perPage);

        return [
            'data' => $paginated->getCollection()->map(fn (Review $r) => $this->transformReview($r))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    /**
     * Nhà cung cấp dịch vụ: Danh sách đánh giá thuộc các dịch vụ của cơ sở.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function listProviderReviews(ProviderProfile $provider, array $filters): array
    {
        $replyStatus = trim((string) ($filters['reply_status'] ?? 'all'));
        $rating = $filters['rating'] ?? 'all';
        $search = trim((string) ($filters['q'] ?? ''));
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 50);

        $baseQuery = Review::query()
            ->whereHas('service', fn ($s) => $s->where('provider_id', $provider->id));

        $totalAll = (clone $baseQuery)->count();
        $unrepliedCount = (clone $baseQuery)->whereNull('provider_reply')->count();
        $repliedCount = (clone $baseQuery)->whereNotNull('provider_reply')->count();
        $avgRating = $totalAll > 0 ? round((float) (clone $baseQuery)->avg('rating'), 2) : 0.0;

        $listQuery = (clone $baseQuery)
            ->with([
                'user:id,email',
                'user.touristProfile:id,user_id,name',
                'user.socialProfile:id,user_id,display_name,avatar_url',
                'service:id,name,type',
                'booking:id,booking_code,start_date,end_date',
            ])
            ->latest('created_at');

        if ($replyStatus === 'unreplied') {
            $listQuery->whereNull('provider_reply');
        } elseif ($replyStatus === 'replied') {
            $listQuery->whereNotNull('provider_reply');
        }

        if (is_numeric($rating) && (int) $rating >= 1 && (int) $rating <= 5) {
            $listQuery->where('rating', (int) $rating);
        }

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $listQuery->where(function ($sub) use ($like) {
                $sub->where('content', 'ilike', $like)
                    ->orWhereHas('service', fn ($s) => $s->where('name', 'ilike', $like))
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'ilike', $like))
                    ->orWhereHas('booking', fn ($b) => $b->where('booking_code', 'ilike', $like));
            });
        }

        $paginated = $listQuery->paginate($perPage);

        return [
            'provider_id' => $provider->id,
            'counts' => [
                'all' => $totalAll,
                'unreplied' => $unrepliedCount,
                'replied' => $repliedCount,
                'avg_rating' => $avgRating,
            ],
            'data' => $paginated->getCollection()->map(fn (Review $r) => $this->transformReview($r, true))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    /**
     * Nhà cung cấp dịch vụ phản hồi đánh giá của du khách.
     *
     * @return array<string, mixed>
     */
    public function replyByProvider(ProviderProfile $provider, Review $review, string $replyText): array
    {
        $review->loadMissing('service:id,provider_id,name,type,rating_avg');

        if ((int) ($review->service?->provider_id ?? 0) !== (int) $provider->id) {
            abort(403, 'Bạn không có quyền phản hồi đánh giá của cơ sở khác.');
        }

        $review->update([
            'provider_reply' => trim($replyText),
            'provider_reply_at' => now(),
        ]);

        $fresh = $review->fresh([
            'user:id,email',
            'user.touristProfile:id,user_id,name',
            'user.socialProfile:id,user_id,display_name,avatar_url',
            'service:id,name,type,provider_id,rating_avg',
            'booking:id,booking_code,start_date,end_date',
        ]);

        $this->broadcastSafely($fresh, 'replied', (float) ($fresh->service?->rating_avg ?? 0));

        return $this->transformReview($fresh, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function transformReview(Review $r, bool $includeBookingAndService = false): array
    {
        $payload = [
            'id' => $r->id,
            'booking_id' => $r->booking_id,
            'service_id' => $r->service_id,
            'user_id' => $r->user_id,
            'rating' => (int) $r->rating,
            'cleanliness_rating' => $r->cleanliness_rating ? (int) $r->cleanliness_rating : null,
            'service_rating' => $r->service_rating ? (int) $r->service_rating : null,
            'location_rating' => $r->location_rating ? (int) $r->location_rating : null,
            'value_rating' => $r->value_rating ? (int) $r->value_rating : null,
            'content' => $r->content,
            'pros' => $r->pros,
            'cons' => $r->cons,
            'is_recommended' => (bool) ($r->is_recommended ?? true),
            'images' => is_array($r->images) ? $r->images : [],
            'provider_reply' => $r->provider_reply,
            'provider_reply_at' => $r->provider_reply_at?->toIso8601String(),
            'created_at' => $r->created_at?->toIso8601String(),
            'user' => $r->relationLoaded('user') && $r->user ? [
                'id' => $r->user->id,
                'name' => $r->user->name,
                'avatar_url' => $r->user->avatar_url,
            ] : null,
        ];

        if ($includeBookingAndService) {
            $payload['service'] = $r->relationLoaded('service') && $r->service ? [
                'id' => $r->service->id,
                'name' => $r->service->name,
                'type' => $r->service->type,
            ] : null;
            $payload['booking'] = $r->relationLoaded('booking') && $r->booking ? [
                'id' => $r->booking->id,
                'booking_code' => $r->booking->booking_code,
                'start_date' => $r->booking->start_date?->format('Y-m-d'),
                'end_date' => $r->booking->end_date?->format('Y-m-d'),
            ] : null;
        }

        return $payload;
    }

    private function broadcastSafely(?Review $review, string $action, float $ratingAvg): void
    {
        if (! $review) {
            return;
        }

        try {
            ReviewUpdated::dispatch($review, $action, $ratingAvg);
        } catch (\Throwable $e) {
            Log::warning("Không thể phát sự kiện realtime ReviewUpdated ({$action}): ".$e->getMessage(), [
                'review_id' => $review->id,
            ]);
        }
    }
}
