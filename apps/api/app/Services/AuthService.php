<?php

namespace App\Services;

use App\Enums\ProviderStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ProviderProfile;
use App\Models\SocialProfile;
use App\Models\TouristProfile;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Kreait\Firebase\Exception\Auth\UserNotFound;
use Kreait\Laravel\Firebase\Facades\Firebase;

class AuthService
{
    /**
     * Tự động đồng bộ tài khoản với Firebase Admin SDK để đảm bảo tài khoản luôn có firebase_uid.
     */
    public function syncWithFirebaseAdmin(string $email, ?string $password = null): ?string
    {
        try {
            $auth = Firebase::auth();
            try {
                $firebaseUser = $auth->getUserByEmail($email);

                return $firebaseUser->uid;
            } catch (UserNotFound $e) {
                $properties = ['email' => $email];
                if (! empty($password) && strlen($password) >= 6) {
                    $properties['password'] = $password;
                }
                $firebaseUser = $auth->createUser($properties);

                return $firebaseUser->uid;
            }
        } catch (\Throwable $e) {
            Log::warning('Firebase Admin Sync Warning: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Đồng bộ tài khoản từ Firebase (Đăng nhập / Đăng ký qua Firebase Email/Password hoặc Google OAuth).
     * Chỉ tạo bản ghi users và phân quyền, KHÔNG tự động tạo hồ sơ profile.
     */
    public function syncFirebaseUser(array $firebaseData): array
    {
        return DB::transaction(function () use ($firebaseData) {
            $firebaseUid = $firebaseData['uid'] ?? $firebaseData['firebase_uid'] ?? null;
            $firebaseEmail = isset($firebaseData['email']) ? strtolower(trim($firebaseData['email'])) : null;
            $password = $firebaseData['password'] ?? null;
            $requestedRole = in_array($firebaseData['role'] ?? '', [UserRole::Tourist->value, UserRole::Provider->value], true)
                ? $firebaseData['role']
                : UserRole::Provider->value;

            $isNewUser = false;

            $user = null;
            if ($firebaseUid) {
                $user = User::where('firebase_uid', $firebaseUid)->first();
            }
            if (! $user && $firebaseEmail) {
                $user = User::where('email', $firebaseEmail)->first();
                if ($user && $firebaseUid && empty($user->firebase_uid)) {
                    $user->firebase_uid = $firebaseUid;
                }
            }

            if ($user && $user->status === UserStatus::Banned->value) {
                throw ValidationException::withMessages([
                    'email' => ['Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.'],
                ]);
            }

            if (! $user) {
                $isNewUser = true;

                $user = User::create([
                    'firebase_uid' => $firebaseUid,
                    'email' => $firebaseEmail ?? ($firebaseUid.'@firebase.local'),
                    'password' => $password ? Hash::make($password) : null,
                    'role' => $requestedRole,
                    'status' => UserStatus::Active->value,
                    'social_active' => false,
                ]);
            } else {
                $dirty = false;
                if ($firebaseUid && empty($user->firebase_uid)) {
                    $user->firebase_uid = $firebaseUid;
                    $dirty = true;
                }
                if ($password) {
                    $user->password = Hash::make($password);
                    $dirty = true;
                }
                if ($dirty) {
                    $user->save();
                }
            }

            $sanctumToken = $user->createToken('stb_client_token')->plainTextToken;

            return [
                'user' => $this->formatUserPayload($user),
                'token' => $sanctumToken,
                'is_new_user' => $isNewUser,
            ];
        });
    }

    /**
     * Đăng ký tài khoản mới trực tiếp qua Backend API (dùng cho Mobile & Web).
     * Tự động đồng bộ sang Firebase Auth để lấy firebase_uid cho role tourist.
     * KHÔNG tự động tạo hồ sơ profile.
     */
    public function registerWithCredentials(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $email = strtolower(trim($data['email']));
            $password = $data['password'];
            $role = in_array($data['role'] ?? '', [UserRole::Tourist->value, UserRole::Provider->value], true)
                ? $data['role']
                : UserRole::Tourist->value;

            // Đảm bảo có firebase_uid bằng cách đồng bộ sang Firebase Auth
            $firebaseUid = $data['firebase_uid'] ?? $this->syncWithFirebaseAdmin($email, $password);

            $user = User::create([
                'firebase_uid' => $firebaseUid,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => $role,
                'status' => UserStatus::Active->value,
                'social_active' => false,
            ]);

            $token = $user->createToken('stb_client_token')->plainTextToken;

            return [
                'user' => $this->formatUserPayload($user),
                'token' => $token,
                'is_new_user' => true,
            ];
        });
    }

    /**
     * Đăng nhập bằng Email và Mật khẩu trực tiếp qua Backend API.
     */
    public function loginWithCredentials(string $email, string $password): array
    {
        $normalizedEmail = strtolower(trim($email));
        $user = User::where('email', $normalizedEmail)->first();

        if (! $user || ! $user->password || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'],
            ]);
        }

        if ($user->status === UserStatus::Banned->value) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ bộ phận hỗ trợ.'],
            ]);
        }

        // Tự động đồng bộ firebase_uid nếu tài khoản trước đó chưa có
        if (empty($user->firebase_uid)) {
            $user->firebase_uid = $this->syncWithFirebaseAdmin($normalizedEmail, $password);
            if ($user->firebase_uid) {
                $user->save();
            }
        }

        $token = $user->createToken('stb_client_token')->plainTextToken;

        return [
            'user' => $this->formatUserPayload($user),
            'token' => $token,
            'is_new_user' => false,
        ];
    }

    /**
     * Khởi tạo hồ sơ người dùng (Dành cho bước hoàn tất hồ sơ sau này hoặc Seed dữ liệu).
     */
    public function ensureUserEcosystem(User $user, array $extra = []): void
    {
        // 1. Khởi tạo Ví điện tử
        Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'balance' => 0.00,
                'locked_balance' => 0.00,
                'currency' => 'VND',
            ]
        );

        $resolvedName = $extra['name']
            ?? $extra['displayName']
            ?? $extra['display_name']
            ?? explode('@', $user->email)[0]
            ?? 'User';

        $avatar = $extra['picture']
            ?? $extra['avatarUrl']
            ?? $extra['avatar_url']
            ?? null;

        // 2. Khởi tạo Hồ sơ theo Vai trò
        if ($user->role === UserRole::Provider->value) {
            ProviderProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'business_name' => $extra['business_name'] ?? ($resolvedName.' Travel'),
                    'business_type' => $extra['business_type'] ?? 'Tour & Lưu trú',
                    'phone' => $extra['phone'] ?? null,
                    'address' => $extra['address'] ?? null,
                    'status' => ProviderStatus::Approved->value,
                    'approved_at' => now(),
                ]
            );
        } elseif ($user->role === UserRole::Tourist->value) {
            TouristProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $resolvedName,
                    'phone_number' => $extra['phone'] ?? null,
                    'nationality' => 'Việt Nam',
                ]
            );
        }

        // 3. Khởi tạo Hồ sơ Mạng xã hội độc lập
        if (! $user->socialProfile()->exists()) {
            $baseUsername = Str::slug($resolvedName, '');
            if (strlen($baseUsername) < 3) {
                $baseUsername = 'traveler';
            }
            $username = substr($baseUsername, 0, 35).'_'.$user->id;

            SocialProfile::create([
                'user_id' => $user->id,
                'username' => $username,
                'display_name' => $resolvedName,
                'avatar_url' => $avatar,
                'bio' => $user->role === UserRole::Provider->value
                    ? 'Đối tác cung cấp trải nghiệm du lịch chính thức trên Social Travel Booking.'
                    : 'Đam mê xê dịch và khám phá vẻ đẹp Việt Nam.',
                'is_verified' => $user->role === UserRole::Admin->value || $user->role === UserRole::Provider->value,
            ]);
        }
    }

    /**
     * Định dạng chuẩn hóa thông tin người dùng trả về cho Web & Mobile.
     */
    public function formatUserPayload(User $user): array
    {
        $user->loadMissing(['touristProfile', 'providerProfile', 'socialProfile', 'wallet']);

        $displayName = $user->display_name;
        $avatarUrl = $user->avatar_url ?? $user->socialProfile?->avatar_url;

        $isProfileCompleted = match ($user->role) {
            UserRole::Provider->value => ! is_null($user->providerProfile),
            UserRole::Tourist->value => ! is_null($user->touristProfile),
            UserRole::Admin->value => true,
            default => false,
        };

        return [
            'id' => $user->id,
            'firebase_uid' => $user->firebase_uid,
            'name' => $displayName,
            'display_name' => $displayName,
            'email' => $user->email,
            'avatar_url' => $avatarUrl,
            'role' => $user->role,
            'status' => $user->status,
            'social_active' => (bool) $user->social_active,
            'is_profile_completed' => $isProfileCompleted,
            'wallet' => $user->wallet ? [
                'balance' => (float) $user->wallet->balance,
                'locked_balance' => (float) $user->wallet->locked_balance,
                'currency' => $user->wallet->currency,
            ] : null,
            'tourist_profile' => $user->touristProfile ? [
                'id' => $user->touristProfile->id,
                'name' => $user->touristProfile->name,
                'phone_number' => $user->touristProfile->phone_number,
                'nationality' => $user->touristProfile->nationality,
            ] : null,
            'provider_profile' => $user->providerProfile ? [
                'id' => $user->providerProfile->id,
                'business_name' => $user->providerProfile->business_name,
                'business_type' => $user->providerProfile->business_type,
                'phone' => $user->providerProfile->phone,
                'address' => $user->providerProfile->address,
                'status' => $user->providerProfile->status,
            ] : null,
            'social_profile' => $user->socialProfile ? [
                'id' => $user->socialProfile->id,
                'username' => $user->socialProfile->username,
                'display_name' => $user->socialProfile->display_name,
                'bio' => $user->socialProfile->bio,
                'is_verified' => (bool) $user->socialProfile->is_verified,
                'followers_count' => (int) $user->socialProfile->followers_count,
                'following_count' => (int) $user->socialProfile->following_count,
                'posts_count' => (int) $user->socialProfile->posts_count,
            ] : null,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
