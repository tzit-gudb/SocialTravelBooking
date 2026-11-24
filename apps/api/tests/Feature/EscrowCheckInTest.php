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
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class EscrowCheckInTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.sepay.bank_code' => 'TPBank',
            'services.sepay.account_number' => '10001627519',
            'services.sepay.webhook_token' => 'tranhoangviet',
        ]);
    }

    public function test_sepay_webhook_locks_deposit_and_provider_qr_checkin_releases_to_wallet(): void
    {
        [$providerUser, $provider, $tourist, $booking] = $this->createBookingFixture(300000);

        $transferContent = preg_replace('/[^A-Z0-9]/', '', $booking->booking_code);

        // 1. Sepay Webhook xác nhận thanh toán -> Tiền cọc khóa vào locked_balance
        $whRes = $this->withHeaders(['Authorization' => 'Apikey tranhoangviet'])
            ->postJson('/api/v1/webhooks/sepay', [
                'id' => 555444333,
                'accountNumber' => '10001627519',
                'content' => $transferContent,
                'transferType' => 'in',
                'transferAmount' => 300000,
                'referenceCode' => 'FT99990001',
            ]);
        $whRes->assertStatus(200)->assertJsonPath('data.booking_status', 'confirmed');

        $wallet = Wallet::where('user_id', $providerUser->id)->firstOrFail();
        $this->assertEquals(0.0, (float) $wallet->balance);
        $this->assertEquals(300000.0, (float) $wallet->locked_balance);

        // 2. Provider quét QR Check-in -> Giải phóng từ locked_balance sang balance
        $qrPayload = json_encode([
            'code' => $booking->booking_code,
            'token' => $booking->qr_checkin_token,
        ]);

        $checkInRes = $this->actingAs($providerUser, 'sanctum')
            ->postJson('/api/v1/provider/bookings/check-in', [
                'qr_data' => $qrPayload,
            ]);

        $checkInRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.booking.status', 'checked_in')
            ->assertJsonPath('data.released_amount', 300000);

        $wallet->refresh();
        $booking->refresh();

        $this->assertEquals('checked_in', $booking->status);
        $this->assertNotNull($booking->checked_in_at);
        $this->assertEquals(300000.0, (float) $wallet->balance);
        $this->assertEquals(0.0, (float) $wallet->locked_balance);

        $tx = WalletTransaction::where('wallet_id', $wallet->id)
            ->where('reference_id', $booking->booking_code)
            ->firstOrFail();
        $this->assertEquals('booking_payment', $tx->type);
        $this->assertEquals(300000.0, (float) $tx->amount);

        // 3. Quét lại lần 2 -> Phải chặn (không giải ngân trùng)
        $reScanRes = $this->actingAs($providerUser, 'sanctum')
            ->postJson('/api/v1/provider/bookings/check-in', [
                'qr_data' => $qrPayload,
            ]);
        $reScanRes->assertStatus(422);
    }

    public function test_tourist_can_confirm_checkin_and_release_escrow(): void
    {
        [$providerUser, $provider, $tourist, $booking] = $this->createBookingFixture(450000);

        Wallet::create([
            'user_id' => $providerUser->id,
            'balance' => 100000,
            'locked_balance' => 450000,
            'currency' => 'VND',
        ]);

        $booking->update(['status' => 'confirmed']);

        $res = $this->actingAs($tourist, 'sanctum')
            ->postJson("/api/v1/tourist/bookings/{$booking->id}/confirm-checkin");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'checked_in');

        $wallet = Wallet::where('user_id', $providerUser->id)->firstOrFail();
        $this->assertEquals(550000.0, (float) $wallet->balance);
        $this->assertEquals(0.0, (float) $wallet->locked_balance);
    }

    /**
     * @return array{0: User, 1: ProviderProfile, 2: User, 3: Booking}
     */
    private function createBookingFixture(float $depositAmount): array
    {
        $providerUser = User::create([
            'email' => 'escrow-provider-'.uniqid().'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Escrow Resort '.uniqid(),
            'status' => ProviderStatus::Approved->value,
        ]);
        $tourist = User::create([
            'email' => 'escrow-tourist-'.uniqid().'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Tourist->value,
            'status' => 'active',
        ]);
        $location = Location::first() ?? Location::create([
            'name' => 'Đà Nẵng Escrow',
            'slug' => 'da-nang-escrow-'.uniqid(),
            'is_popular' => true,
        ]);
        $service = Service::create([
            'provider_id' => $provider->id,
            'location_id' => $location->id,
            'name' => 'Khách sạn Escrow '.uniqid(),
            'slug' => 'ks-escrow-'.uniqid(),
            'description' => 'Test Escrow',
            'type' => 'hotel',
            'status' => ServiceStatus::Active->value,
            'base_price' => 1000000,
            'price_unit' => 'night',
            'address' => 'Đà Nẵng',
        ]);

        $booking = Booking::create([
            'booking_code' => 'STB-20261124-ES'.strtoupper(substr(uniqid(), -4)),
            'qr_checkin_token' => 'QR-'.uniqid(),
            'user_id' => $tourist->id,
            'service_id' => $service->id,
            'provider_id' => $provider->id,
            'start_date' => now()->addDays(2)->format('Y-m-d'),
            'end_date' => now()->addDays(3)->format('Y-m-d'),
            'quantity' => 1,
            'duration_units' => 1,
            'unit_price' => 1000000,
            'subtotal' => 1000000,
            'promotion_discount_amount' => 0,
            'coupon_discount_amount' => 0,
            'total_amount' => 1000000,
            'deposit_rate' => 30,
            'deposit_amount' => $depositAmount,
            'remaining_amount' => 1000000 - $depositAmount,
            'status' => 'pending_payment',
            'payment_expires_at' => now()->addMinutes(10),
            'contact_name' => 'Nguyen Escrow',
            'contact_phone' => '0901112223',
            'contact_email' => 'escrow@example.com',
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => 'sepay',
            'amount' => $depositAmount,
            'currency' => 'VND',
            'transaction_code' => preg_replace('/[^A-Z0-9]/', '', $booking->booking_code),
            'status' => 'pending',
        ]);

        return [$providerUser, $provider, $tourist, $booking];
    }
}
