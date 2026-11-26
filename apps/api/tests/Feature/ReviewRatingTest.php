<?php

namespace Tests\Feature;

use App\Enums\ProviderStatus;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\BusinessType;
use App\Models\Location;
use App\Models\ProviderProfile;
use App\Models\Review;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReviewRatingTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * @return array{providerUser: User, provider: ProviderProfile, tourist: User, service: Service}
     */
    private function seedServiceFixture(): array
    {
        $providerUser = User::create([
            'firebase_uid' => 'uid_rev_prov_'.Str::random(10),
            'email' => 'rev-prov-'.Str::random(8).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);

        $businessType = BusinessType::create([
            'type' => 'Chỗ ở',
            'name' => 'Resort '.Str::random(4),
            'slug' => 'resort-'.Str::random(6),
        ]);

        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Resort Review '.Str::random(4),
            'business_type_id' => $businessType->id,
            'status' => ProviderStatus::Approved->value,
        ]);

        $tourist = User::create([
            'firebase_uid' => 'uid_rev_tour_'.Str::random(10),
            'email' => 'rev-tour-'.Str::random(8).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Tourist->value,
            'status' => 'active',
        ]);

        $location = Location::create([
            'name' => 'Phú Quốc '.Str::random(4),
            'slug' => 'phu-quoc-'.Str::random(6),
            'is_popular' => true,
        ]);

        $service = Service::create([
            'provider_id' => $provider->id,
            'location_id' => $location->id,
            'type' => 'hotel',
            'name' => 'Biệt thự Nghỉ Dưỡng Phú Quốc',
            'slug' => 'biet-thu-pq-'.Str::random(6),
            'description' => 'Nghỉ dưỡng cao cấp',
            'address' => 'Phú Quốc',
            'base_price' => 1500000,
            'price_unit' => 'night',
            'status' => ServiceStatus::Active->value,
        ]);

        return compact('providerUser', 'provider', 'tourist', 'service');
    }

    private function createBooking(Service $service, ProviderProfile $provider, User $tourist, string $status): Booking
    {
        return Booking::create([
            'booking_code' => 'STB-REV-'.Str::upper(Str::random(6)),
            'qr_checkin_token' => hash('sha256', Str::uuid()->toString()),
            'user_id' => $tourist->id,
            'service_id' => $service->id,
            'provider_id' => $provider->id,
            'status' => $status,
            'start_date' => now()->subDays(2)->toDateString(),
            'end_date' => now()->subDay()->toDateString(),
            'quantity' => 1,
            'duration_units' => 1,
            'unit_price' => 1500000,
            'subtotal' => 1500000,
            'total_amount' => 1500000,
            'deposit_rate' => 30,
            'deposit_amount' => 450000,
            'remaining_amount' => 1050000,
            'contact_name' => 'Du Khách A',
            'contact_phone' => '0901234567',
            'contact_email' => $tourist->email,
        ]);
    }

    public function test_tourist_cannot_review_before_completed_or_duplicate_review(): void
    {
        $fixture = $this->seedServiceFixture();
        $checkedInBooking = $this->createBooking($fixture['service'], $fixture['provider'], $fixture['tourist'], 'checked_in');

        // Mới checked_in nhưng chưa completed -> chưa được đánh giá
        $this->actingAs($fixture['tourist'], 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$checkedInBooking->id}/review", [
                'rating' => 5,
                'content' => 'Chưa hoàn thành nhưng thử đánh giá',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // 1. Du khách bấm "Kết thúc chuyến đi"
        $this->actingAs($fixture['tourist'], 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$checkedInBooking->id}/request-checkout")
            ->assertOk()
            ->assertJsonPath('data.status', 'checked_in');

        $this->assertNotNull($checkedInBooking->fresh()->checkout_requested_at);

        // 2. Nhà cung cấp bấm "Xác nhận hoàn thành" -> status = completed
        $this->actingAs($fixture['providerUser'], 'sanctum')
            ->postJson("/api/v1/provider/bookings/{$checkedInBooking->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        // 3. Lúc này Du khách mới được gửi đánh giá chi tiết nhiều mặt
        $this->actingAs($fixture['tourist'], 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$checkedInBooking->id}/review", [
                'rating' => 5,
                'cleanliness_rating' => 5,
                'service_rating' => 5,
                'location_rating' => 4,
                'value_rating' => 5,
                'pros' => 'Phòng sạch, nhân viên thân thiện',
                'cons' => 'Đường vào hơi nhỏ',
                'is_recommended' => true,
                'content' => 'Dịch vụ rất tuyệt vời, phòng sạch đẹp!',
            ])
            ->assertCreated()
            ->assertJsonPath('data.review.rating', 5)
            ->assertJsonPath('data.review.cleanliness_rating', 5)
            ->assertJsonPath('data.review.pros', 'Phòng sạch, nhân viên thân thiện')
            ->assertJsonPath('data.service_rating_avg', 5);

        // 4. Đánh giá lại từ chính đơn này hoặc một đơn completed khác cùng dịch vụ -> cập nhật lại đánh giá cũ (không tạo bản ghi thứ 2)
        $secondCompleted = $this->createBooking($fixture['service'], $fixture['provider'], $fixture['tourist'], 'completed');

        $this->actingAs($fixture['tourist'], 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$secondCompleted->id}/review", [
                'rating' => 4,
                'cleanliness_rating' => 4,
                'service_rating' => 4,
                'location_rating' => 4,
                'value_rating' => 4,
                'content' => 'Lần 2 quay lại vẫn rất tốt, cập nhật lại đánh giá!',
            ])
            ->assertOk()
            ->assertJsonPath('data.is_updated', true)
            ->assertJsonPath('data.review.rating', 4)
            ->assertJsonPath('data.service_rating_avg', 4);

        $this->assertEquals(
            1,
            Review::where('service_id', $fixture['service']->id)
                ->where('user_id', $fixture['tourist']->id)
                ->count()
        );
    }

    public function test_service_rating_avg_updates_and_provider_can_reply_and_public_endpoint_returns_it(): void
    {
        $fixture = $this->seedServiceFixture();

        $tourist2 = User::create([
            'firebase_uid' => 'uid_rev_tour2_'.Str::random(10),
            'email' => 'rev-tour2-'.Str::random(8).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Tourist->value,
            'status' => 'active',
        ]);

        $b1 = $this->createBooking($fixture['service'], $fixture['provider'], $fixture['tourist'], 'completed');
        $b2 = $this->createBooking($fixture['service'], $fixture['provider'], $tourist2, 'completed');

        $r1 = $this->actingAs($fixture['tourist'], 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$b1->id}/review", [
                'rating' => 5,
                'content' => 'Tuyệt vời!',
            ])
            ->assertCreated();

        $this->actingAs($tourist2, 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$b2->id}/review", [
                'rating' => 4,
                'content' => 'Khá hài lòng.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.service_rating_avg', 4.5);

        $this->assertEquals(4.5, (float) $fixture['service']->fresh()->rating_avg);

        $reviewId = $r1->json('data.review.id');

        // Nhà cung cấp dịch vụ phản hồi đánh giá
        $this->actingAs($fixture['providerUser'], 'sanctum')
            ->postJson("/api/v1/provider/reviews/{$reviewId}/reply", [
                'provider_reply' => 'Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!',
            ])
            ->assertOk()
            ->assertJsonPath('data.provider_reply', 'Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!');

        $this->actingAs($fixture['providerUser'], 'sanctum')
            ->getJson('/api/v1/provider/reviews?reply_status=replied')
            ->assertOk()
            ->assertJsonPath('counts.all', 2)
            ->assertJsonPath('counts.replied', 1)
            ->assertJsonPath('counts.unreplied', 1)
            ->assertJsonCount(1, 'data');

        // API công khai trả về danh sách đánh giá kèm phản hồi
        $this->getJson("/api/v1/public/services/{$fixture['service']->id}/reviews?rating=5")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.provider_reply', 'Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!');

        $this->assertDatabaseHas('reviews', [
            'id' => $reviewId,
            'provider_reply' => 'Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ!',
        ]);
    }

    public function test_another_user_or_provider_cannot_review_or_reply_illegally(): void
    {
        $fixture = $this->seedServiceFixture();
        $booking = $this->createBooking($fixture['service'], $fixture['provider'], $fixture['tourist'], 'checked_in');

        $otherTourist = User::create([
            'firebase_uid' => 'uid_other_tour_'.Str::random(8),
            'email' => 'other-tour-'.Str::random(6).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Tourist->value,
            'status' => 'active',
        ]);

        $this->actingAs($otherTourist, 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$booking->id}/review", [
                'rating' => 1,
                'content' => 'Đánh giá hộ',
            ])
            ->assertStatus(403);

        $review = Review::create([
            'booking_id' => $booking->id,
            'service_id' => $fixture['service']->id,
            'user_id' => $fixture['tourist']->id,
            'rating' => 5,
            'content' => 'Tốt',
        ]);

        $otherProviderUser = User::create([
            'firebase_uid' => 'uid_other_prov_'.Str::random(8),
            'email' => 'other-prov-'.Str::random(6).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);
        ProviderProfile::create([
            'user_id' => $otherProviderUser->id,
            'business_name' => 'Cơ sở khác',
            'status' => ProviderStatus::Approved->value,
        ]);

        $this->actingAs($otherProviderUser, 'sanctum')
            ->postJson("/api/v1/provider/reviews/{$review->id}/reply", [
                'provider_reply' => 'Trả lời nhầm cơ sở',
            ])
            ->assertStatus(403);
    }
}
