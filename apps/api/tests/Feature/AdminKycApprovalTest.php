<?php

namespace Tests\Feature;

use App\Enums\ProviderStatus;
use App\Enums\UserRole;
use App\Models\BusinessType;
use App\Models\ProviderProfile;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Tests\TestCase;

class AdminKycApprovalTest extends TestCase
{
    protected User $adminUser;

    protected string $adminToken;

    protected User $touristUser;

    protected string $touristToken;

    protected User $providerUser;

    protected string $providerToken;

    protected ProviderProfile $pendingProfile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        /** @var User $admin */
        $admin = User::updateOrCreate(
            ['email' => 'admin.kyc.test@gmail.com'],
            [
                'name' => 'Admin KYC Tester',
                'password' => bcrypt('Admin@123'),
                'role' => UserRole::Admin->value,
                'status' => 'active',
                'social_active' => true,
            ]
        );
        $this->adminUser = $admin;
        $this->adminToken = $admin->createToken('test-admin-token')->plainTextToken;

        /** @var User $tourist */
        $tourist = User::updateOrCreate(
            ['email' => 'tourist.kyc.test@gmail.com'],
            [
                'name' => 'Tourist KYC Tester',
                'password' => bcrypt('Password@123'),
                'role' => UserRole::Tourist->value,
                'status' => 'active',
                'social_active' => true,
            ]
        );
        $this->touristUser = $tourist;
        $this->touristToken = $tourist->createToken('test-tourist-token')->plainTextToken;

        /** @var User $provider */
        $provider = User::updateOrCreate(
            ['email' => 'provider.target.test@gmail.com'],
            [
                'name' => 'Target Provider Tester',
                'password' => bcrypt('Password@123'),
                'role' => UserRole::Provider->value,
                'status' => 'pending',
                'social_active' => true,
            ]
        );
        $this->providerUser = $provider;
        $this->providerToken = $provider->createToken('test-provider-token')->plainTextToken;

        $businessType = BusinessType::first();

        $this->pendingProfile = ProviderProfile::updateOrCreate(
            ['user_id' => $provider->id],
            [
                'business_name' => 'Da Nang Scuba Diving Center',
                'representative_name' => 'Nguyen Van Diving',
                'business_type_id' => $businessType ? $businessType->id : 1,
                'phone' => '0905999888',
                'address' => 'Ban dao Son Tra, Da Nang',
                'description' => 'Trung tam lan ngam san ho chuyen nghiep Son Tra.',
                'business_license_url' => ['kyc/licenses/sample_license.pdf'],
                'status' => ProviderStatus::Pending->value,
                'rejection_reason' => null,
                'approved_by' => null,
                'approved_at' => null,
            ]
        );
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $responseList = $this->getJson('/api/v1/admin/kyc/providers');
        $responseList->assertStatus(401);

        $responseShow = $this->getJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id);
        $responseShow->assertStatus(401);

        $responseApprove = $this->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/approve');
        $responseApprove->assertStatus(401);

        $responseReject = $this->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/reject', [
            'rejection_reason' => 'Ly do tu choi kiem thu...',
        ]);
        $responseReject->assertStatus(401);
    }

    public function test_non_admin_roles_are_forbidden(): void
    {
        // 1. Tourist bi chan
        $responseTourist = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->getJson('/api/v1/admin/kyc/providers');
        $responseTourist->assertStatus(403);

        // 2. Provider bi chan
        $responseProvider = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/approve');
        $responseProvider->assertStatus(403);
    }

    public function test_admin_can_get_kyc_providers_list(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/kyc/providers?status=pending');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'business_name',
                        'representative_name',
                        'business_type_name',
                        'phone',
                        'status',
                        'created_at',
                    ],
                ],
                'meta' => [
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                    'pending_count',
                ],
            ]);

        $this->assertGreaterThanOrEqual(1, $response->json('meta.pending_count'));
    }

    public function test_admin_can_filter_kyc_providers_by_search_query(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/kyc/providers?status=all&search=Scuba+Diving');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $items = $response->json('data');
        $this->assertNotEmpty($items);
        $this->assertEquals('Da Nang Scuba Diving Center', $items[0]['business_name']);
    }

    public function test_admin_can_view_single_kyc_provider_detail(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $this->pendingProfile->id)
            ->assertJsonPath('data.business_name', 'Da Nang Scuba Diving Center')
            ->assertJsonPath('data.status', ProviderStatus::Pending->value);
    }

    public function test_admin_view_returns_404_for_non_existent_provider(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->getJson('/api/v1/admin/kyc/providers/999999');

        $response->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_admin_can_approve_provider_kyc_successfully(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/approve');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', ProviderStatus::Approved->value);

        // Kiem tra du lieu ProviderProfile trong database
        $this->pendingProfile->refresh();
        $this->assertEquals(ProviderStatus::Approved->value, $this->pendingProfile->status);
        $this->assertEquals($this->adminUser->id, $this->pendingProfile->approved_by);
        $this->assertNotNull($this->pendingProfile->approved_at);
        $this->assertNull($this->pendingProfile->rejection_reason);

        // Kiem tra User account duoc active va gan role provider
        $this->providerUser->refresh();
        $this->assertEquals('active', $this->providerUser->status);
        $this->assertEquals(UserRole::Provider->value, $this->providerUser->role);
    }

    public function test_admin_reject_fails_when_reason_missing_or_too_short(): void
    {
        // 1. Thieu rejection_reason
        $responseMissing = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/reject', []);

        $responseMissing->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);

        // 2. Ly do qua ngan (< 10 ky tu)
        $responseShort = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/reject', [
                'rejection_reason' => 'Qua ngan',
            ]);

        $responseShort->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);
    }

    public function test_admin_can_reject_provider_kyc_with_valid_reason(): void
    {
        $validReason = 'Giay phep kinh doanh bi mo dau moc do cua So Ke hoach va Dau tu. Vui long scan lai ro rang.';

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->postJson('/api/v1/admin/kyc/providers/'.$this->pendingProfile->id.'/reject', [
                'rejection_reason' => $validReason,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', ProviderStatus::Rejected->value)
            ->assertJsonPath('data.rejection_reason', $validReason);

        $this->pendingProfile->refresh();
        $this->assertEquals(ProviderStatus::Rejected->value, $this->pendingProfile->status);
        $this->assertEquals($validReason, $this->pendingProfile->rejection_reason);
        $this->assertEquals($this->adminUser->id, $this->pendingProfile->approved_by);
        $this->assertNull($this->pendingProfile->approved_at);
    }
}
