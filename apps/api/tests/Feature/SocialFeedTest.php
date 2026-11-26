<?php

namespace Tests\Feature;

use App\Enums\ProviderStatus;
use App\Enums\ServiceStatus;
use App\Enums\UserRole;
use App\Models\BusinessType;
use App\Models\Location;
use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SocialFeedTest extends TestCase
{
    use DatabaseTransactions;

    private function createTourist(string $prefix): User
    {
        return User::create([
            'email' => $prefix.'_'.Str::random(6).'@example.com',
            'password' => Hash::make('Secret@123'),
            'role' => 'tourist',
            'status' => 'active',
            'social_active' => false,
        ]);
    }

    public function test_social_profile_onboarding_activates_immediately_and_enforces_unique_username(): void
    {
        $alice = $this->createTourist('alice');
        $bob = $this->createTourist('bob');

        Sanctum::actingAs($alice);

        // Chưa khởi tạo -> is_initialized = false
        $this->getJson('/api/v1/social/profile/me')
            ->assertOk()
            ->assertJsonPath('data.is_initialized', false)
            ->assertJsonPath('data.social_active', false);

        // Không được đăng bài nếu chưa khởi tạo social_profiles
        $this->postJson('/api/v1/social/posts', [
            'content' => 'Chưa có hồ sơ MXH',
        ])->assertForbidden();

        // Khởi tạo hồ sơ MXH -> kích hoạt ngay lập tức không cần Admin duyệt
        $uniqueHandle = 'alice_travel_'.strtolower(Str::random(5));
        $this->postJson('/api/v1/social/profile', [
            'username' => '@'.$uniqueHandle,
            'display_name' => 'Alice Du Lịch',
            'bio' => 'Yêu Đà Lạt và cà phê sáng',
        ])
            ->assertCreated()
            ->assertJsonPath('data.is_initialized', true)
            ->assertJsonPath('data.social_active', true)
            ->assertJsonPath('data.profile.username', $uniqueHandle)
            ->assertJsonPath('data.profile.display_name', 'Alice Du Lịch');

        $this->assertTrue((bool) $alice->fresh()->social_active);

        // Người khác dùng trùng username -> 422
        Sanctum::actingAs($bob);
        $this->postJson('/api/v1/social/profile', [
            'username' => $uniqueHandle,
            'display_name' => 'Bob Clone',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['username']);
    }

    public function test_create_post_like_save_comment_follow_search_and_activity_flow(): void
    {
        $alice = $this->createTourist('alice_feed');
        $bob = $this->createTourist('bob_feed');

        $aliceHandle = 'alice_'.strtolower(Str::random(6));
        $bobHandle = 'bob_'.strtolower(Str::random(6));

        // 1. Khởi tạo hồ sơ cho cả 2
        Sanctum::actingAs($alice);
        $this->postJson('/api/v1/social/profile', [
            'username' => $aliceHandle,
            'display_name' => 'Alice Explorer',
            'bio' => 'Đam mê săn mây Tây Nguyên',
        ])->assertCreated();

        Sanctum::actingAs($bob);
        $this->postJson('/api/v1/social/profile', [
            'username' => $bobHandle,
            'display_name' => 'Bob Backpacker',
            'bio' => 'Phượt biển Phú Quốc',
        ])->assertCreated();

        // 2. Alice đăng bài có địa điểm, hashtag & media URL
        Sanctum::actingAs($alice);
        $createRes = $this->postJson('/api/v1/social/posts', [
            'content' => 'Săn mây Cầu Đất sáng sớm cực chill #dalat #sanmay',
            'location_name' => 'Đà Lạt, Lâm Đồng',
            'media_urls' => ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e'],
        ])->assertCreated();

        $postId = (int) $createRes->json('data.id');
        $this->assertGreaterThan(0, $postId);
        $this->assertSame('Đà Lạt, Lâm Đồng', $createRes->json('data.location_name'));
        $this->assertCount(1, $createRes->json('data.media'));
        $this->assertGreaterThanOrEqual(2, count($createRes->json('data.tags')));

        // 3. Bob xem bảng tin, thả tim, lưu bài, bình luận & theo dõi Alice
        Sanctum::actingAs($bob);
        $this->getJson('/api/v1/social/posts?tab=for_you')
            ->assertOk()
            ->assertJsonFragment(['id' => $postId]);

        $this->postJson("/api/v1/social/posts/{$postId}/like")
            ->assertOk()
            ->assertJsonPath('data.is_liked', true)
            ->assertJsonPath('data.likes_count', 1);

        $this->postJson("/api/v1/social/posts/{$postId}/save")
            ->assertOk()
            ->assertJsonPath('data.is_saved', true);

        $this->postJson("/api/v1/social/posts/{$postId}/comments", [
            'content' => 'View đỉnh quá bạn ơi!',
        ])
            ->assertCreated()
            ->assertJsonPath('data.comments_count', 1);

        $this->getJson("/api/v1/social/posts/{$postId}/comments")
            ->assertOk()
            ->assertJsonFragment(['content' => 'View đỉnh quá bạn ơi!']);

        $this->postJson("/api/v1/social/users/{$alice->id}/follow")
            ->assertOk()
            ->assertJsonPath('data.is_following', true)
            ->assertJsonPath('data.followers_count', 1);

        // 4. Bob kiểm tra tab bài viết đã lưu & tab đang theo dõi
        $this->getJson('/api/v1/social/posts?tab=saved')
            ->assertOk()
            ->assertJsonFragment(['id' => $postId]);

        $this->getJson('/api/v1/social/posts?tab=following')
            ->assertOk()
            ->assertJsonFragment(['id' => $postId]);

        // 5. Bob tìm kiếm tài khoản & bài viết
        $this->getJson('/api/v1/social/search?q=Cầu Đất')
            ->assertOk()
            ->assertJsonFragment(['id' => $postId]);

        $this->getJson('/api/v1/social/search?q='.$aliceHandle)
            ->assertOk()
            ->assertJsonFragment(['username' => $aliceHandle]);

        // 6. Alice kiểm tra tab Hoạt động (nhận đủ 3 thông báo: like, comment, follow) & đánh dấu đã đọc
        Sanctum::actingAs($alice);
        $activityRes = $this->getJson('/api/v1/social/activity')->assertOk();
        $this->assertSame(3, (int) $activityRes->json('unread_count'));

        $this->postJson('/api/v1/social/activity/read')
            ->assertOk()
            ->assertJsonPath('data.marked_read', 3);

        $this->getJson('/api/v1/social/activity')
            ->assertOk()
            ->assertJsonPath('unread_count', 0);

        // 7. Alice xóa bài viết của mình
        $this->deleteJson("/api/v1/social/posts/{$postId}")
            ->assertOk();

        $this->getJson('/api/v1/social/profile/me')
            ->assertOk()
            ->assertJsonPath('data.profile.posts_count', 0);
    }

    public function test_upload_post_images_create_photo_post_with_location_service_and_edit_post(): void
    {
        Storage::fake('public');

        $alice = $this->createTourist('alice_t34');
        $bob = $this->createTourist('bob_t34');

        // Tạo service fixture độc lập cho CI
        $providerUser = User::create([
            'firebase_uid' => 'uid_soc_prov_'.Str::random(8),
            'email' => 'soc-prov-'.Str::random(6).'@example.com',
            'password' => Hash::make('Secret@123'),
            'role' => UserRole::Provider->value,
            'status' => 'active',
        ]);
        $businessType = BusinessType::create([
            'type' => 'Chỗ ở',
            'name' => 'Resort '.Str::random(4),
            'slug' => 'resort-soc-'.Str::random(6),
        ]);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Resort Social '.Str::random(4),
            'business_type_id' => $businessType->id,
            'status' => ProviderStatus::Approved->value,
        ]);
        $location = Location::create([
            'name' => 'Phú Quốc '.Str::random(4),
            'slug' => 'phu-quoc-soc-'.Str::random(6),
            'is_popular' => true,
        ]);
        $service = Service::create([
            'provider_id' => $provider->id,
            'location_id' => $location->id,
            'type' => 'hotel',
            'name' => 'Villa Biển Phú Quốc',
            'slug' => 'villa-bien-pq-'.Str::random(6),
            'description' => 'Villa sát biển',
            'address' => 'Phú Quốc',
            'base_price' => 2100000,
            'price_unit' => 'night',
            'status' => ServiceStatus::Active->value,
        ]);

        // Khởi tạo hồ sơ MXH cho Alice và Bob
        Sanctum::actingAs($alice);
        $this->postJson('/api/v1/social/profile', [
            'username' => 'alice_t34_'.strtolower(Str::random(5)),
            'display_name' => 'Alice Travel',
        ])->assertCreated();

        Sanctum::actingAs($bob);
        $this->postJson('/api/v1/social/profile', [
            'username' => 'bob_t34_'.strtolower(Str::random(5)),
            'display_name' => 'Bob Viewer',
        ])->assertCreated();

        // 1. Alice không thể đăng bài rỗng hoàn toàn (không nội dung & không ảnh)
        Sanctum::actingAs($alice);
        $this->postJson('/api/v1/social/posts', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['content']);

        // 2. Alice upload 2 ảnh bài viết qua /api/v1/media/upload (type=post)
        $tinyPng = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        );
        $uploadRes = $this->post('/api/v1/media/upload', [
            'type' => 'post',
            'files' => [
                UploadedFile::fake()->createWithContent('beach1.png', $tinyPng),
                UploadedFile::fake()->createWithContent('beach2.png', $tinyPng),
            ],
        ], ['Accept' => 'application/json'])->assertCreated();

        $uploadedUrls = collect($uploadRes->json('data'))->pluck('url')->all();
        $this->assertCount(2, $uploadedUrls);

        // 3. Alice đăng bài chỉ có ảnh (content null), gắn địa điểm + tọa độ + dịch vụ + visibility=followers
        $postRes = $this->postJson('/api/v1/social/posts', [
            'location_name' => 'Bãi Sao, Phú Quốc',
            'latitude' => 10.0567,
            'longitude' => 104.0341,
            'service_id' => $service->id,
            'visibility' => 'followers',
            'media_urls' => $uploadedUrls,
        ])->assertCreated();

        $postId = (int) $postRes->json('data.id');
        $this->assertSame('Bãi Sao, Phú Quốc', $postRes->json('data.location_name'));
        $this->assertSame('followers', $postRes->json('data.visibility'));
        $this->assertSame($service->id, $postRes->json('data.service.id'));
        $this->assertCount(2, $postRes->json('data.media'));

        // 4. Alice chỉnh sửa bài viết (thêm nội dung có #hashtag & đổi sang public)
        $this->putJson("/api/v1/social/posts/{$postId}", [
            'content' => 'Hoàng hôn cực đỉnh tại #phuquoc #baisao',
            'visibility' => 'public',
        ])
            ->assertOk()
            ->assertJsonPath('data.visibility', 'public')
            ->assertJsonPath('data.content', 'Hoàng hôn cực đỉnh tại #phuquoc #baisao');

        // 5. Bob không được phép sửa bài của Alice -> 403
        Sanctum::actingAs($bob);
        $this->putJson("/api/v1/social/posts/{$postId}", [
            'content' => 'Hack nội dung',
        ])->assertForbidden();
    }
}
