<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\BusinessType;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Khởi tạo tài khoản mẫu cho 3 vai trò: Admin, Provider, Tourist.
     */
    public function run(): void
    {
        // 0. Seed dữ liệu danh mục & loại hình kinh doanh
        $this->call([
            BusinessTypeSeeder::class,
            CategorySeeder::class,
        ]);

        $authService = app(AuthService::class);

        // 1. Tài khoản Quản trị viên (Admin)
        $admin = User::firstOrNew(['email' => 'admin@gmail.com']);
        $admin->password = Hash::make('Admin@123');
        $admin->role = UserRole::Admin->value;
        $admin->status = UserStatus::Active->value;
        $admin->social_active = true;
        $admin->save();

        $authService->ensureUserEcosystem($admin, [
            'name' => 'Ban Quản Trị Hệ Thống',
        ]);

        // 2. Tài khoản Nhà cung cấp dịch vụ (Provider)
        $provider = User::firstOrNew(['email' => 'tranhoangviet.provider@gmail.com']);
        $provider->password = Hash::make('Tranhoangviet@2005');
        $provider->role = UserRole::Provider->value;
        $provider->status = UserStatus::Active->value;
        $provider->social_active = true;
        $provider->save();

        $defaultBusinessType = BusinessType::where('slug', 'tour-du-lich-trai-nghiem')->first();

        $authService->ensureUserEcosystem($provider, [
            'name' => 'Trần Hoàng Việt (Đối tác)',
            'business_name' => 'Đà Nẵng Ocean Travel & Retreat',
            'business_type_id' => $defaultBusinessType?->id,
            'phone' => '0905123456',
            'address' => '218 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
        ]);

        // 3. Tài khoản Khách du lịch (Tourist)
        $tourist = User::firstOrNew(['email' => 'tranhoangviet@gmail.com']);
        $tourist->password = Hash::make('Tranhoangviet@2005');
        $tourist->role = UserRole::Tourist->value;
        $tourist->status = UserStatus::Active->value;
        $tourist->social_active = true;
        $tourist->save();

        $authService->ensureUserEcosystem($tourist, [
            'name' => 'Trần Hoàng Việt',
            'phone' => '0905888999',
        ]);
    }
}
