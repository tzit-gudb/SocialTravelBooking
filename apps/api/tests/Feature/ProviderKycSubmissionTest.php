<?php

namespace Tests\Feature;

use App\Enums\ProviderStatus;
use App\Models\BusinessType;
use App\Models\ProviderProfile;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProviderKycSubmissionTest extends TestCase
{
    protected string $providerToken;

    protected string $touristToken;

    protected User $providerUser;

    protected User $touristUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        /** @var User $provider */
        $provider = User::updateOrCreate(
            ['email' => 'provider.kyc.test@gmail.com'],
            [
                'name' => 'Provider KYC Tester',
                'password' => bcrypt('Password@123'),
                'role' => 'provider',
                'status' => 'active',
                'social_active' => true,
            ]
        );
        $this->providerUser = $provider;
        $this->providerToken = $provider->createToken('test-provider-kyc')->plainTextToken;

        /** @var User $tourist */
        $tourist = User::where('email', 'tranhoangviet@gmail.com')->firstOrFail();
        $this->touristUser = $tourist;
        $this->touristToken = $tourist->createToken('test-tourist-kyc')->plainTextToken;
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $responseSubmit = $this->postJson('/api/v1/provider/kyc/submit', []);
        $responseSubmit->assertStatus(401);

        $responseStatus = $this->getJson('/api/v1/provider/kyc/status');
        $responseStatus->assertStatus(401);
    }

    public function test_tourist_role_cannot_access_provider_kyc_endpoints(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->getJson('/api/v1/provider/kyc/status');

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_provider_can_submit_valid_kyc_with_binary_license_file(): void
    {
        Storage::fake('local');

        $licenseFile = UploadedFile::fake()->create('giay_phep_kinh_doanh.pdf', 2048, 'application/pdf');
        $businessType = BusinessType::first();

        $payload = [
            'business_name' => 'Đà Nẵng Ocean Travel',
            'representative_name' => 'Trần Hoàng Việt',
            'business_type_id' => $businessType ? $businessType->id : 1,
            'phone' => '0905123456',
            'address' => '123 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà',
            'city' => 'Đà Nẵng',
            'description' => 'Đơn vị lữ hành chuyên tour biển đảo và lặn ngắm san hô Sơn Trà.',
            'business_license' => $licenseFile,
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', ProviderStatus::Pending->value)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'status',
                    'provider_profile' => [
                        'id',
                        'user_id',
                        'business_name',
                        'representative_name',
                        'phone',
                        'address',
                        'business_license_url',
                        'status',
                    ],
                ],
            ]);

        $profile = ProviderProfile::where('user_id', $this->providerUser->id)->firstOrFail();
        $this->assertEquals(ProviderStatus::Pending->value, $profile->status);
        $this->assertEquals('Đà Nẵng Ocean Travel', $profile->business_name);
        $this->assertIsArray($profile->business_license_url);
        $this->assertNotEmpty($profile->business_license_url);
        $this->assertStringStartsWith('kyc/licenses/', $profile->business_license_url[0]);
        $this->assertStringEndsWith('.pdf', $profile->business_license_url[0]);

        Storage::disk('local')->assertExists($profile->business_license_url[0]);
    }

    public function test_provider_can_submit_multiple_license_images(): void
    {
        Storage::fake('local');

        $image1 = UploadedFile::fake()->create('giay_phep_mat_1.png', 1024, 'image/png');
        $image2 = UploadedFile::fake()->create('giay_phep_mat_2.jpg', 1024, 'image/jpeg');
        $image3 = UploadedFile::fake()->create('chung_chi_hanh_nghe.webp', 1024, 'image/webp');

        $payload = [
            'business_name' => 'Sơn Trà Eco Travel Group',
            'representative_name' => 'Nguyễn Văn An',
            'business_type' => 'Homestay & Villa',
            'phone' => '0912345678',
            'address' => 'Bán đảo Sơn Trà, Đà Nẵng',
            'business_licenses' => [$image1, $image2, $image3],
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $profile = ProviderProfile::where('user_id', $this->providerUser->id)->firstOrFail();
        $this->assertIsArray($profile->business_license_url);
        $this->assertCount(3, $profile->business_license_url);

        foreach ($profile->business_license_url as $storedPath) {
            $this->assertStringStartsWith('kyc/licenses/', $storedPath);
            Storage::disk('local')->assertExists($storedPath);
        }
    }

    public function test_provider_can_submit_kyc_with_external_url_and_it_is_downloaded_to_private_storage(): void
    {
        Storage::fake('local');
        Http::fake([
            'https://example.com/giay-phep-kinh-doanh.pdf' => Http::response('%PDF-1.4 mock pdf data', 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $payload = [
            'business_name' => 'Bà Nà Hills Eco Travel',
            'representative_name' => 'Võ Văn Nam',
            'business_type_id' => 1,
            'phone' => '0911223344',
            'address' => 'Hòa Vang, Đà Nẵng',
            'business_license_url' => 'https://example.com/giay-phep-kinh-doanh.pdf',
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $profile = ProviderProfile::where('user_id', $this->providerUser->id)->firstOrFail();
        $this->assertIsArray($profile->business_license_url);
        $this->assertNotEmpty($profile->business_license_url);
        $this->assertStringStartsWith('kyc/licenses/', $profile->business_license_url[0]);
        $this->assertStringEndsWith('.pdf', $profile->business_license_url[0]);
        Storage::disk('local')->assertExists($profile->business_license_url[0]);
    }

    public function test_provider_can_submit_kyc_with_base64_license_data_url(): void
    {
        Storage::fake('local');

        $base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        $payload = [
            'business_name' => 'Hội An Heritage Travel',
            'representative_name' => 'Lê Thị Thu',
            'business_type_id' => 1,
            'phone' => '0987654321',
            'address' => 'Trần Phú, Phố Cổ Hội An',
            'business_license_url' => [$base64Png],
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $profile = ProviderProfile::where('user_id', $this->providerUser->id)->firstOrFail();
        $this->assertIsArray($profile->business_license_url);
        $this->assertNotEmpty($profile->business_license_url);
        $this->assertStringStartsWith('kyc/licenses/', $profile->business_license_url[0]);
        $this->assertStringEndsWith('.png', $profile->business_license_url[0]);
        Storage::disk('local')->assertExists($profile->business_license_url[0]);
    }

    public function test_submit_validation_fails_when_more_than_5_images(): void
    {
        $images = [];
        for ($i = 1; $i <= 6; $i++) {
            $images[] = UploadedFile::fake()->create("license_{$i}.png", 500, 'image/png');
        }

        $payload = [
            'business_name' => 'Over Five Images Travel',
            'representative_name' => 'Tester',
            'business_type_id' => 1,
            'phone' => '0901234567',
            'address' => 'Đà Nẵng',
            'business_licenses' => $images,
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['business_licenses']);
    }

    public function test_submit_validation_fails_when_blob_url_provided(): void
    {
        $payload = [
            'business_name' => 'Blob URL Travel',
            'representative_name' => 'Tester',
            'business_type_id' => 1,
            'phone' => '0901234567',
            'address' => 'Đà Nẵng',
            'business_license_url' => ['blob:http://localhost:5173/d80f4cf3-dfca-4495-a646-a9119ff0dd04'],
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->postJson('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['business_license_url']);
    }

    public function test_submit_validation_fails_when_required_fields_missing(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->postJson('/api/v1/provider/kyc/submit', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'business_name',
                'representative_name',
                'phone',
                'address',
                'business_license',
            ]);
    }

    public function test_submit_validation_fails_when_file_exceeds_10mb(): void
    {
        $tooLargeFile = UploadedFile::fake()->create('large_license.pdf', 12000, 'application/pdf');

        $payload = [
            'business_name' => 'Test Travel',
            'representative_name' => 'Tester',
            'business_type_id' => 1,
            'phone' => '0901234567',
            'address' => 'Hà Nội',
            'business_license' => $tooLargeFile,
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['business_license']);
    }

    public function test_provider_can_retrieve_kyc_status(): void
    {
        Storage::fake('local');
        $licenseFile = UploadedFile::fake()->create('license.pdf', 500, 'application/pdf');

        $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/provider/kyc/submit', [
                'business_name' => 'Kiểm Tra Trạng Thái Travel',
                'representative_name' => 'Trần Văn Trạng',
                'business_type_id' => 1,
                'phone' => '0933445566',
                'address' => 'Hải Châu, Đà Nẵng',
                'business_license' => $licenseFile,
            ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->getJson('/api/v1/provider/kyc/status');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', ProviderStatus::Pending->value)
            ->assertJsonPath('data.is_submitted', true)
            ->assertJsonPath('data.profile.business_name', 'Kiểm Tra Trạng Thái Travel')
            ->assertJsonPath('data.profile.representative_name', 'Trần Văn Trạng');

        $licenseUrls = $response->json('data.profile.business_license_url');
        $this->assertIsArray($licenseUrls);
        $this->assertNotEmpty($licenseUrls);
    }
}
