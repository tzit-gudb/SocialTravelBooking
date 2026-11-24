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
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SepayWebhookTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.sepay.bank_code' => 'TPBank',
            'services.sepay.account_number' => '10001627519',
            'services.sepay.account_name' => 'TRAN HOANG VIET',
            'services.sepay.webhook_token' => 'tranhoangviet',
        ]);
    }

    public function test_webhook_rejects_invalid_or_missing_apikey(): void
    {
        $resMissing = $this->postJson('/api/v1/webhooks/sepay', ['id' => 1]);
        $resMissing->assertStatus(401);

        $resWrong = $this->withHeaders([
            'Authorization' => 'Apikey wrong-token',
        ])->postJson('/api/v1/webhooks/sepay', ['id' => 1]);
        $resWrong->assertStatus(401);
    }

    public function test_webhook_confirms_booking_and_is_idempotent_on_retry(): void
    {
        [$booking, $service] = $this->createBookingWithPendingPayment(300000);
        $transferContent = preg_replace('/[^A-Z0-9]/', '', $booking->booking_code);
        $initialBookingsCount = (int) $service->total_bookings;

        $payload = [
            'id' => 999888777,
            'gateway' => 'TPBank',
            'transactionDate' => '2026-11-24 15:10:00',
            'accountNumber' => '10001627519',
            'code' => null,
            'content' => "CHUYEN KHOAN {$transferContent} THANH TOAN COC",
            'transferType' => 'in',
            'transferAmount' => 300000,
            'referenceCode' => 'FT263290001234',
        ];

        $first = $this->withHeaders([
            'Authorization' => 'Apikey tranhoangviet',
        ])->postJson('/api/v1/webhooks/sepay', $payload);

        $first->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.processed', true)
            ->assertJsonPath('data.already_processed', false)
            ->assertJsonPath('data.booking_status', 'confirmed');

        $booking->refresh();
        $service->refresh();
        $payment = Payment::where('booking_id', $booking->id)->firstOrFail();

        $this->assertEquals('confirmed', $booking->status);
        $this->assertNull($booking->payment_expires_at);
        $this->assertEquals('paid', $payment->status);
        $this->assertEquals('FT263290001234', $payment->transaction_code);
        $this->assertEquals($initialBookingsCount + 1, $service->total_bookings);

        // Retry cùng payload -> phải idempotent, không cộng trùng total_bookings hay tạo payment mới
        $retry = $this->withHeaders([
            'Authorization' => 'Apikey tranhoangviet',
        ])->postJson('/api/v1/webhooks/sepay', $payload);

        $retry->assertStatus(200)
            ->assertJsonPath('data.processed', true)
            ->assertJsonPath('data.already_processed', true);

        $service->refresh();
        $this->assertEquals(1, Payment::where('booking_id', $booking->id)->count());
        $this->assertEquals($initialBookingsCount + 1, $service->total_bookings);
    }

    public function test_webhook_does_not_confirm_when_transfer_amount_is_insufficient(): void
    {
        [$booking] = $this->createBookingWithPendingPayment(300000);
        $transferContent = preg_replace('/[^A-Z0-9]/', '', $booking->booking_code);

        $res = $this->withHeaders([
            'Authorization' => 'Apikey tranhoangviet',
        ])->postJson('/api/v1/webhooks/sepay', [
            'id' => 888777666,
            'gateway' => 'TPBank',
            'accountNumber' => '10001627519',
            'content' => $transferContent,
            'transferType' => 'in',
            'transferAmount' => 150000,
            'referenceCode' => 'FT263290009999',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.processed', false)
            ->assertJsonPath('data.reason', 'insufficient_amount');

        $booking->refresh();
        $this->assertEquals('pending_payment', $booking->status);
    }

    public function test_webhook_ignores_outgoing_transfer(): void
    {
        $res = $this->withHeaders([
            'Authorization' => 'Apikey tranhoangviet',
        ])->postJson('/api/v1/webhooks/sepay', [
            'id' => 777666555,
            'accountNumber' => '10001627519',
            'content' => 'RUT TIEN',
            'transferType' => 'out',
            'transferAmount' => 500000,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.ignored', true)
            ->assertJsonPath('data.reason', 'not_incoming_transfer');
    }

    /**
     * @return array{0: Booking, 1: Service}
     */
    private function createBookingWithPendingPayment(float $depositAmount): array
    {
        $providerUser = User::create([
            'email' => 'wh-provider-'.uniqid().'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Resort Webhook Test '.uniqid(),
            'status' => ProviderStatus::Approved->value,
        ]);
        $location = Location::first() ?? Location::create([
            'name' => 'Đà Nẵng Webhook',
            'slug' => 'da-nang-wh-'.uniqid(),
            'is_popular' => true,
        ]);
        $service = Service::create([
            'provider_id' => $provider->id,
            'location_id' => $location->id,
            'name' => 'Khách sạn Webhook Test '.uniqid(),
            'slug' => 'khach-san-wh-'.uniqid(),
            'description' => 'Test webhook Sepay',
            'type' => 'hotel',
            'status' => ServiceStatus::Active->value,
            'base_price' => 1000000,
            'price_unit' => 'night',
            'address' => 'Đà Nẵng',
            'total_bookings' => 5,
        ]);

        $booking = Booking::create([
            'booking_code' => 'STB-20261124-WH'.strtoupper(substr(uniqid(), -4)),
            'qr_checkin_token' => 'QR-'.uniqid(),
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
            'deposit_amount' => $depositAmount,
            'remaining_amount' => 700000,
            'status' => 'pending_payment',
            'payment_expires_at' => now()->addMinutes(10),
            'contact_name' => 'Nguyen Van Webhook',
            'contact_phone' => '0909888777',
            'contact_email' => 'webhook@example.com',
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => 'sepay',
            'amount' => $depositAmount,
            'currency' => 'VND',
            'transaction_code' => preg_replace('/[^A-Z0-9]/', '', $booking->booking_code),
            'status' => 'pending',
        ]);

        return [$booking, $service];
    }
}
