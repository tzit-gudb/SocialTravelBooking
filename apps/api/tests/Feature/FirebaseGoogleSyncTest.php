<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SocialProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AuthService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FirebaseGoogleSyncTest extends TestCase
{
    protected AuthService $authService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authService = app(AuthService::class);
    }

    /**
     * Tiêu chuẩn nghiệm thu 2 & 4:
     * - Tự động tạo user trong database (role mặc định tourist).
     * - Cấp Sanctum token hợp lệ và khởi tạo ví mặc định.
     * - Đồng bộ avatar và tên hiển thị từ Google.
     */
    public function test_sync_creates_new_user_with_tourist_role_wallet_and_google_avatar(): void
    {
        $uniqueId = time().'_'.rand(1000, 9999);
        $firebaseData = [
            'uid' => 'google_uid_'.$uniqueId,
            'email' => 'google_user_'.$uniqueId.'@gmail.com',
            'name' => 'Nguyễn Văn Google',
            'picture' => 'https://lh3.googleusercontent.com/a/sample_avatar_'.$uniqueId,
            'role' => null, // Kiểm tra gán role mặc định tourist
        ];

        $result = $this->authService->syncFirebaseUser($firebaseData);

        $this->assertTrue($result['is_new_user']);
        $this->assertNotEmpty($result['token']);
        $this->assertEquals('tourist', $result['user']['role']);
        $this->assertEquals('Nguyễn Văn Google', $result['user']['name']);
        $this->assertEquals($firebaseData['picture'], $result['user']['avatar_url']);

        // Kiểm tra database
        $user = User::where('firebase_uid', $firebaseData['uid'])->first();
        $this->assertNotNull($user);
        $this->assertEquals(UserRole::Tourist->value, $user->role);
        $this->assertEquals(UserStatus::Active->value, $user->status);

        // Kiểm tra khởi tạo ví tiền
        $wallet = Wallet::where('user_id', $user->id)->first();
        $this->assertNotNull($wallet);
        $this->assertEquals('0.00', (string) $wallet->balance);
        $this->assertEquals('VND', $wallet->currency);

        // Kiểm tra SocialProfile lưu avatar và display_name
        $socialProfile = SocialProfile::where('user_id', $user->id)->first();
        $this->assertNotNull($socialProfile);
        $this->assertEquals($firebaseData['picture'], $socialProfile->avatar_url);
        $this->assertEquals('Nguyễn Văn Google', $socialProfile->display_name);
    }

    /**
     * Tiêu chuẩn nghiệm thu 3:
     * - Đăng nhập Google nhiều lần với cùng 1 tài khoản không bị nhân bản bản ghi trong bảng users.
     */
    public function test_multiple_google_logins_do_not_duplicate_users(): void
    {
        $uniqueId = time().'_'.rand(1000, 9999);
        $firebaseData = [
            'uid' => 'google_repeat_'.$uniqueId,
            'email' => 'repeat_user_'.$uniqueId.'@gmail.com',
            'name' => 'Lê Khách Hàng',
            'picture' => 'https://lh3.googleusercontent.com/avatar_1.png',
            'role' => 'tourist',
        ];

        // Lần 1: Tạo mới
        $firstResult = $this->authService->syncFirebaseUser($firebaseData);
        $this->assertTrue($firstResult['is_new_user']);
        $firstUserId = $firstResult['user']['id'];

        // Lần 2: Cùng tài khoản Google, đổi avatar mới
        $firebaseData['picture'] = 'https://lh3.googleusercontent.com/avatar_updated.png';
        $secondResult = $this->authService->syncFirebaseUser($firebaseData);

        $this->assertFalse($secondResult['is_new_user']);
        $this->assertEquals($firstUserId, $secondResult['user']['id']);
        $this->assertEquals($firebaseData['picture'], $secondResult['user']['avatar_url']);

        // Xác nhận chỉ có đúng 1 record trong bảng users
        $userCount = User::where('firebase_uid', $firebaseData['uid'])->count();
        $this->assertEquals(1, $userCount);
    }

    /**
     * Kiểm tra chặn tài khoản bị khóa (banned).
     */
    public function test_banned_user_cannot_sync(): void
    {
        $uniqueId = time().'_'.rand(1000, 9999);
        $bannedEmail = 'banned_'.$uniqueId.'@gmail.com';
        $bannedUid = 'banned_uid_'.$uniqueId;

        User::create([
            'email' => $bannedEmail,
            'firebase_uid' => $bannedUid,
            'role' => UserRole::Tourist->value,
            'status' => UserStatus::Banned->value,
            'social_active' => false,
        ]);

        $this->expectException(ValidationException::class);

        $this->authService->syncFirebaseUser([
            'uid' => $bannedUid,
            'email' => $bannedEmail,
        ]);
    }

    /**
     * Kiểm tra endpoint POST /api/v1/auth/sync xử lý khi thiếu định danh xác thực.
     */
    public function test_sync_endpoint_rejects_missing_uid(): void
    {
        $response = $this->postJson('/api/v1/auth/sync', [
            'email' => 'invalid_sync@gmail.com',
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Không tìm thấy định danh xác thực trong yêu cầu.');
    }
}
