<?php

namespace Tests\Feature;

use App\Enums\ProviderStatus;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\BusinessType;
use App\Models\Location;
use App\Models\ProviderBankAccount;
use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\WithdrawalRequest;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProviderWalletTest extends TestCase
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

    /**
     * @return array{user: User, provider: ProviderProfile, service: Service, admin: User}
     */
    private function seedProviderFixture(): array
    {
        $user = User::create([
            'firebase_uid' => 'uid_wallet_'.Str::random(10),
            'email' => 'wallet_'.Str::random(8).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);

        $admin = User::create([
            'firebase_uid' => 'uid_admin_'.Str::random(10),
            'email' => 'admin_'.Str::random(8).'@example.com',
            'password' => bcrypt('password'),
            'role' => UserRole::Admin->value,
            'status' => 'active',
        ]);

        $businessType = BusinessType::create([
            'type' => 'Chỗ ở',
            'name' => 'Khách sạn '.Str::random(4),
            'slug' => 'khach-san-'.Str::random(6),
        ]);

        $provider = ProviderProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Resort Biển Xanh '.Str::random(4),
            'representative_name' => 'Nguyễn Văn B',
            'business_type_id' => $businessType->id,
            'phone' => '0909123456',
            'address' => 'Đà Nẵng',
            'status' => ProviderStatus::Approved->value,
        ]);

        $location = Location::create([
            'name' => 'Đà Nẵng '.Str::random(4),
            'slug' => 'da-nang-'.Str::random(6),
            'is_popular' => true,
        ]);

        $service = Service::create([
            'provider_id' => $provider->id,
            'location_id' => $location->id,
            'type' => 'hotel',
            'name' => 'Phòng Deluxe View Biển',
            'slug' => 'phong-deluxe-'.Str::random(6),
            'description' => 'Phòng view biển test ví Provider',
            'address' => 'Đà Nẵng',
            'base_price' => 1000000,
            'price_unit' => 'night',
            'status' => ServiceStatus::Active->value,
        ]);

        return compact('user', 'provider', 'service', 'admin');
    }

    public function test_provider_can_manage_multiple_bank_accounts(): void
    {
        $fixture = $this->seedProviderFixture();

        $first = $this->actingAs($fixture['user'], 'sanctum')
            ->postJson('/api/v1/provider/bank-accounts', [
                'bank_code' => 'TPB',
                'bank_name' => 'TPBank',
                'account_number' => '10001627519',
                'account_holder' => 'Nguyen Van B',
            ]);

        $first->assertCreated()
            ->assertJsonPath('data.is_default', true);

        $second = $this->actingAs($fixture['user'], 'sanctum')
            ->postJson('/api/v1/provider/bank-accounts', [
                'bank_code' => 'VCB',
                'bank_name' => 'Vietcombank',
                'account_number' => '9988776655',
                'account_holder' => 'Nguyen Van B',
                'is_default' => true,
            ]);

        $second->assertCreated()
            ->assertJsonPath('data.is_default', true);

        $secondId = $second->json('data.id');
        $firstId = $first->json('data.id');

        $this->assertFalse(ProviderBankAccount::findOrFail($firstId)->is_default);

        $this->actingAs($fixture['user'], 'sanctum')
            ->patchJson("/api/v1/provider/bank-accounts/{$firstId}/default")
            ->assertOk()
            ->assertJsonPath('data.is_default', true);

        $this->actingAs($fixture['user'], 'sanctum')
            ->deleteJson("/api/v1/provider/bank-accounts/{$secondId}")
            ->assertOk();

        $this->actingAs($fixture['user'], 'sanctum')
            ->getJson('/api/v1/provider/bank-accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_provider_can_view_wallet_summary_and_escrow_stats(): void
    {
        $fixture = $this->seedProviderFixture();

        $wallet = Wallet::create([
            'user_id' => $fixture['user']->id,
            'balance' => 1500000,
            'locked_balance' => 600000,
            'currency' => 'VND',
        ]);

        WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'booking_payment',
            'amount' => 2000000,
            'balance_before' => 0,
            'balance_after' => 2000000,
            'note' => 'Nhà cung cấp dịch vụ quét QR check-in',
            'reference_id' => 'STB-TEST-001',
        ]);

        Booking::create([
            'booking_code' => 'STB-ESCROW-'.Str::upper(Str::random(6)),
            'qr_checkin_token' => hash('sha256', Str::uuid()->toString()),
            'provider_id' => $fixture['provider']->id,
            'service_id' => $fixture['service']->id,
            'status' => 'confirmed',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'quantity' => 1,
            'duration_units' => 1,
            'unit_price' => 2000000,
            'subtotal' => 2000000,
            'total_amount' => 2000000,
            'deposit_rate' => 30,
            'deposit_amount' => 600000,
            'remaining_amount' => 1400000,
            'contact_name' => 'Khách A',
            'contact_phone' => '0901111222',
            'contact_email' => 'khacha@example.com',
        ]);

        $response = $this->actingAs($fixture['user'], 'sanctum')
            ->getJson('/api/v1/provider/wallet');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.provider_id', $fixture['provider']->id)
            ->assertJsonPath('data.wallet.balance', 1500000)
            ->assertJsonPath('data.wallet.locked_balance', 600000)
            ->assertJsonPath('data.stats.total_earned', 2000000)
            ->assertJsonPath('data.stats.pending_escrow_bookings_count', 1);
    }

    public function test_full_withdrawal_flow_with_sepay_outbound_webhook_and_provider_confirmation(): void
    {
        $fixture = $this->seedProviderFixture();

        Wallet::create([
            'user_id' => $fixture['user']->id,
            'balance' => 800000,
            'locked_balance' => 300000,
            'currency' => 'VND',
        ]);

        $bank = ProviderBankAccount::create([
            'provider_id' => $fixture['provider']->id,
            'bank_code' => 'VCB',
            'bank_name' => 'Vietcombank',
            'account_number' => '9988776655',
            'account_holder' => 'NGUYEN VAN B',
            'is_default' => true,
        ]);

        // Chặn rút vượt số dư khả dụng
        $this->actingAs($fixture['user'], 'sanctum')
            ->postJson('/api/v1/provider/wallet/withdraw', [
                'amount' => 900000,
                'bank_account_id' => $bank->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        // 1. NCC tạo yêu cầu rút 500.000đ -> pending, balance còn 300.000đ, sinh VietQR
        $createRes = $this->actingAs($fixture['user'], 'sanctum')
            ->postJson('/api/v1/provider/wallet/withdraw', [
                'amount' => 500000,
                'bank_account_id' => $bank->id,
                'note' => 'Quyết toán cuối tuần',
            ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.wallet.balance', 300000)
            ->assertJsonPath('data.withdrawal.status', 'pending')
            ->assertJsonPath('data.withdrawal.bank_code', 'VCB');

        $withdrawalId = $createRes->json('data.withdrawal.id');
        $requestCode = $createRes->json('data.withdrawal.request_code');
        $this->assertStringContainsString('img.vietqr.io/image/VCB-9988776655', $createRes->json('data.withdrawal.vietqr_url'));

        // 2. SePay bắn Webhook tiền ra (transferType = 'out') chứa mã WD... (kể cả khi ngân hàng ghép dính "RUTWD...") -> tự chuyển sang paid
        $webhookRes = $this->withHeaders([
            'Authorization' => 'Apikey tranhoangviet',
        ])->postJson('/api/v1/webhooks/sepay', [
            'id' => 99112233,
            'accountNumber' => '10001627519',
            'content' => 'MBVCB.123456',
            'description' => "BankAPINotify RUT{$requestCode} CHUYEN KHOAN",
            'transferType' => 'out',
            'transferAmount' => 500000,
            'referenceCode' => 'FT26330998877',
        ]);

        $webhookRes->assertOk()
            ->assertJsonPath('data.processed', true)
            ->assertJsonPath('data.withdrawal_status', 'paid');

        $this->assertDatabaseHas('withdrawal_requests', [
            'id' => $withdrawalId,
            'status' => 'paid',
            'payout_method' => 'sepay_webhook',
            'payout_reference' => 'FT26330998877',
        ]);

        // 3. NCC xác nhận đã nhận khoản chi trả -> completed
        $this->actingAs($fixture['user'], 'sanctum')
            ->postJson("/api/v1/provider/wallet/withdrawals/{$withdrawalId}/confirm-receipt")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->assertEquals('completed', WithdrawalRequest::findOrFail($withdrawalId)->status);
    }

    public function test_admin_manual_payout_dispute_and_reject_refund_flow(): void
    {
        $fixture = $this->seedProviderFixture();

        Wallet::create([
            'user_id' => $fixture['user']->id,
            'balance' => 1000000,
            'locked_balance' => 0,
            'currency' => 'VND',
        ]);

        $bank = ProviderBankAccount::create([
            'provider_id' => $fixture['provider']->id,
            'bank_code' => 'TPB',
            'bank_name' => 'TPBank',
            'account_number' => '10001627519',
            'account_holder' => 'NGUYEN VAN B',
            'is_default' => true,
        ]);

        $res = $this->actingAs($fixture['user'], 'sanctum')
            ->postJson('/api/v1/provider/wallet/withdraw', [
                'amount' => 400000,
                'bank_account_id' => $bank->id,
            ])->assertCreated();

        $withdrawalId = $res->json('data.withdrawal.id');

        // 1. Admin xác nhận chi trả thủ công -> paid
        $this->actingAs($fixture['admin'], 'sanctum')
            ->postJson("/api/v1/admin/withdrawals/{$withdrawalId}/confirm-paid", [
                'payout_reference' => 'FT-ADMIN-12345',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payout_method', 'manual_admin');

        // 2. NCC báo chưa nhận được khoản chi trả -> disputed
        $this->actingAs($fixture['user'], 'sanctum')
            ->postJson("/api/v1/provider/wallet/withdrawals/{$withdrawalId}/report-issue", [
                'dispute_note' => 'Chưa thấy tiền về tài khoản TPBank',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'disputed');

        // 3. Admin từ chối & hoàn tiền lại vào ví NCC -> rejected, balance về lại 1.000.000đ
        $this->actingAs($fixture['admin'], 'sanctum')
            ->postJson("/api/v1/admin/withdrawals/{$withdrawalId}/reject", [
                'rejected_reason' => 'Giao dịch ngân hàng bị treo, hoàn tiền về ví để rút lại',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $wallet = Wallet::where('user_id', $fixture['user']->id)->firstOrFail();
        $this->assertEquals(1000000.0, (float) $wallet->balance);
    }
}
