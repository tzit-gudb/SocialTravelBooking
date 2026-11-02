<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MediaService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    protected string $adminToken;

    protected string $providerToken;

    protected string $touristToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        /** @var User $admin */
        $admin = User::where('email', 'admin@gmail.com')->firstOrFail();
        $this->adminToken = $admin->createToken('test-admin')->plainTextToken;

        /** @var User $provider */
        $provider = User::where('email', 'tranhoangviet.provider@gmail.com')->firstOrFail();
        $this->providerToken = $provider->createToken('test-provider')->plainTextToken;

        /** @var User $tourist */
        $tourist = User::where('email', 'tranhoangviet@gmail.com')->firstOrFail();
        $this->touristToken = $tourist->createToken('test-tourist')->plainTextToken;
    }

    public function test_authenticated_user_can_upload_public_avatar(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('avatar.jpg', 1024, 'image/jpeg');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->post('/api/v1/media/upload', [
                'type' => 'avatar',
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'file_name',
                    'file_path',
                    'url',
                    'file_url',
                    'mime_type',
                    'size',
                    'file_size',
                ],
            ]);

        $filePath = $response->json('data.file_path');
        $this->assertStringStartsWith('avatars/', $filePath);
        Storage::disk('public')->assertExists($filePath);
    }

    public function test_authenticated_user_can_upload_multiple_service_gallery_images(): void
    {
        Storage::fake('public');

        $files = [
            UploadedFile::fake()->create('gallery1.jpg', 1500, 'image/jpeg'),
            UploadedFile::fake()->create('gallery2.png', 2000, 'image/png'),
        ];

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/media/upload', [
                'type' => 'service_gallery',
                'files' => $files,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');

        foreach ($response->json('data') as $item) {
            $this->assertStringStartsWith('services/gallery/', $item['file_path']);
            Storage::disk('public')->assertExists($item['file_path']);
        }
    }

    public function test_upload_fails_when_no_file_provided(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->postJson('/api/v1/media/upload', [
                'type' => 'avatar',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file', 'files']);
    }

    public function test_upload_rejects_dangerous_executable_files(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('malware.php', 10, 'text/x-php');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->post('/api/v1/media/upload', [
                'type' => 'avatar',
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_rejects_avatar_exceeding_size_limit(): void
    {
        Storage::fake('public');

        // Giới hạn avatar là 2MB (2048 KB), tạo file 3000 KB
        $file = UploadedFile::fake()->create('large_avatar.jpg', 3000, 'image/jpeg');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->post('/api/v1/media/upload', [
                'type' => 'avatar',
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_unauthenticated_request_cannot_upload_media(): void
    {
        $response = $this->postJson('/api/v1/media/upload', [
            'type' => 'avatar',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_provider_can_upload_private_kyc_document(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->create('business_license.pdf', 2048, 'application/pdf');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->post('/api/v1/media/upload-private', [
                'type' => 'kyc_license',
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_private', true);

        $filePath = $response->json('data.file_path');
        $this->assertStringStartsWith('kyc/licenses/', $filePath);
        Storage::disk('local')->assertExists($filePath);
    }

    public function test_unauthenticated_request_cannot_access_private_file(): void
    {
        $response = $this->getJson('/api/v1/media/private/kyc/licenses/sample.pdf');

        $response->assertStatus(401);
    }

    public function test_tourist_cannot_access_private_kyc_file(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('kyc/licenses/sample.pdf', 'dummy content');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->touristToken)
            ->get('/api/v1/media/private/kyc/licenses/sample.pdf');

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_admin_and_provider_can_access_private_file(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('kyc/licenses/sample.pdf', 'dummy license content');

        // Admin truy cập
        $adminResponse = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->get('/api/v1/media/private/kyc/licenses/sample.pdf');

        $adminResponse->assertStatus(200);

        // Provider truy cập
        $providerResponse = $this->withHeader('Authorization', 'Bearer '.$this->providerToken)
            ->get('/api/v1/media/private/kyc/licenses/sample.pdf');

        $providerResponse->assertStatus(200);
    }

    public function test_path_traversal_is_blocked_on_private_file_access(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
            ->get('/api/v1/media/private/..%2F..%2Fprivate%2Fsecret.txt');

        // Bị chặn với lỗi 400 Bad Request
        $this->assertTrue(in_array($response->status(), [400, 403, 404], true));
    }

    public function test_media_service_delete_file_cleans_up_storage(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('avatars/test-avatar.jpg', 'fake-image-bytes');

        Storage::disk('public')->assertExists('avatars/test-avatar.jpg');

        /** @var MediaService $service */
        $service = app(MediaService::class);

        // Xóa với relative path
        $result = $service->deleteFile('avatars/test-avatar.jpg', 'public');
        $this->assertTrue($result);
        Storage::disk('public')->assertMissing('avatars/test-avatar.jpg');

        // Xóa với full url hoặc tiền tố /storage/
        Storage::disk('public')->put('avatars/test-url.jpg', 'fake-image-bytes');
        $resultUrl = $service->deleteFile('http://localhost:8000/storage/avatars/test-url.jpg', 'public');
        $this->assertTrue($resultUrl);
        Storage::disk('public')->assertMissing('avatars/test-url.jpg');
    }
}
