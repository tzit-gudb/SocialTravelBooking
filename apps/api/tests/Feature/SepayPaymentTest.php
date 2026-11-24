<?php

namespace Tests\Feature;

use App\Enums\ProviderStatus;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Payment;
use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\ServicePolicy;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SepayPaymentTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.sepay.bank_code' => 'TPBank',
            'services.sepay.account_number' => '10001627519',
            'services.sepay.account_name' => 'TRAN HOANG VIET',
            'services.sepay.qr_base_url' => 'https://qr.sepay.vn/img',
        ]);
    }

    public function test_tourist_can_create_and_reuse_sepay_qr_payment(): void
    {
        $tourist = User::create([
            'email' => 'sepay-tourist-'.uniqid().'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Tourist->value,
            'status' => 'active',
        ]);
        $booking = $this->createPendingBooking($tourist->id, '0901234567');

        $first = $this->actingAs($tourist, 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$booking->id}/payment/sepay");

        $first->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.booking_code', $booking->booking_code)
            ->assertJsonPath('data.bank_code', 'TPBank')
            ->assertJsonPath('data.account_number', '10001627519')
            ->assertJsonPath('data.transfer_content', preg_replace('/[^A-Z0-9]/', '', $booking->booking_code));

        $this->assertStringContainsString('https://qr.sepay.vn/img?', (string) $first->json('data.qr_url'));
        $this->assertEquals(1, Payment::where('booking_id', $booking->id)->count());

        // Gọi lại lần 2 phải tái sử dụng bản ghi pending, không tạo rác thêm
        $second = $this->actingAs($tourist, 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$booking->id}/payment/sepay");

        $second->assertStatus(200)
            ->assertJsonPath('data.payment_id', $first->json('data.payment_id'));
        $this->assertEquals(1, Payment::where('booking_id', $booking->id)->count());

        // Polling trạng thái thanh toán
        $statusRes = $this->actingAs($tourist, 'sanctum')
            ->getJson("/api/v1/tourist/bookings/{$booking->id}/payment/status");

        $statusRes->assertStatus(200)
            ->assertJsonPath('data.booking_status', 'pending_payment')
            ->assertJsonPath('data.payment_status', 'pending');
    }

    public function test_guest_can_create_sepay_qr_poll_status_and_cancel_booking(): void
    {
        $booking = $this->createPendingBooking(null, '0988777666');

        $qrRes = $this->postJson("/api/v1/public/bookings/{$booking->booking_code}/payment/sepay", [
            'contact_phone' => '0988777666',
        ]);

        $qrRes->assertStatus(200)
            ->assertJsonPath('data.booking_code', $booking->booking_code)
            ->assertJsonPath('data.amount', 300000);

        $statusRes = $this->getJson("/api/v1/public/bookings/{$booking->booking_code}/payment/status?contact_phone=0988777666");
        $statusRes->assertStatus(200)
            ->assertJsonPath('data.booking_status', 'pending_payment');

        // Hủy đơn khách vãng lai kèm lý do
        $cancelRes = $this->postJson("/api/v1/public/bookings/{$booking->booking_code}/cancel", [
            'contact_phone' => '0988777666',
            'cancel_reason' => 'Đổi kế hoạch chuyến đi',
        ]);

        $cancelRes->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancel_reason', 'Đổi kế hoạch chuyến đi');
    }

    public function test_expired_booking_cannot_generate_sepay_qr(): void
    {
        $tourist = User::create([
            'email' => 'sepay-expired-'.uniqid().'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Tourist->value,
            'status' => 'active',
        ]);
        $booking = $this->createPendingBooking($tourist->id, '0901234567', now()->subMinute());

        $res = $this->actingAs($tourist, 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$booking->id}/payment/sepay");

        $res->assertStatus(422);
    }

    private function createPendingBooking(?int $userId, string $phone, $expiresAt = null): Booking
    {
        $providerUser = User::create([
            'email' => 'sepay-provider-'.uniqid().'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Resort Test Sepay '.uniqid(),
            'status' => ProviderStatus::Approved->value,
        ]);
        $location = Location::first() ?? Location::create([
            'name' => 'Đà Nẵng Test',
            'slug' => 'da-nang-test-'.uniqid(),
            'is_popular' => true,
        ]);
        $service = Service::create([
            'provider_id' => $provider->id,
            'location_id' => $location->id,
            'name' => 'Khách sạn Test Sepay '.uniqid(),
            'slug' => 'khach-san-test-sepay-'.uniqid(),
            'description' => 'Mô tả test Sepay',
            'type' => 'hotel',
            'status' => ServiceStatus::Active->value,
            'base_price' => 1000000,
            'price_unit' => 'night',
            'address' => 'Đà Nẵng',
        ]);

        $depositPolicy = ServicePolicy::where('slug', 'dat-coc-giu-cho-30')->first();
        if ($depositPolicy) {
            $service->policies()->sync([$depositPolicy->id]);
        }

        return Booking::create([
            'booking_code' => 'STB-20261124-'.strtoupper(substr(uniqid(), -6)),
            'qr_checkin_token' => 'QR-'.uniqid(),
            'user_id' => $userId,
            'service_id' => $service->id,
            'provider_id' => $provider->id,
            'start_date' => now()->addDays(3)->format('Y-m-d'),
            'end_date' => now()->addDays(4)->format('Y-m-d'),
            'quantity' => 1,
            'duration_units' => 1,
            'unit_price' => 1000000,
            'subtotal' => 1000000,
            'promotion_discount_amount' => 0,
            'coupon_discount_amount' => 0,
            'total_amount' => 1000000,
            'deposit_rate' => 30,
            'deposit_amount' => 300000,
            'remaining_amount' => 700000,
            'status' => 'pending_payment',
            'payment_expires_at' => $expiresAt ?? now()->addMinutes(10),
            'contact_name' => 'Nguyen Van Test',
            'contact_phone' => $phone,
            'contact_email' => 'test@example.com',
        ]);
    }
}
