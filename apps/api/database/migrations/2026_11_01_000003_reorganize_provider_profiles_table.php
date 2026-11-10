<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // 1. Tạm gỡ foreign key constraints từ các bảng trỏ đến provider_profiles
            DB::statement('ALTER TABLE IF EXISTS services DROP CONSTRAINT IF EXISTS services_provider_id_foreign;');
            DB::statement('ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_provider_id_foreign;');

            // 2. Tạo bảng mới với cấu trúc và thứ tự cột chuẩn xác, bổ sung representative_name
            DB::statement("
                CREATE TABLE provider_profiles_new (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    business_name VARCHAR(255) NOT NULL,
                    representative_name VARCHAR(255) NULL,
                    business_type_id BIGINT NULL REFERENCES business_types(id) ON DELETE SET NULL,
                    phone VARCHAR(20) NULL,
                    address TEXT NULL,
                    business_license_url TEXT NULL,
                    description TEXT NULL,
                    status VARCHAR(30) NOT NULL DEFAULT 'pending',
                    rejection_reason TEXT NULL,
                    approved_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
                    approved_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ");

            // 3. Tạo index cho status
            DB::statement('CREATE INDEX idx_provider_profiles_status ON provider_profiles_new(status);');

            // 4. Di chuyển dữ liệu hiện có (nếu có)
            DB::statement('
                INSERT INTO provider_profiles_new (
                    id, user_id, business_name, representative_name, business_type_id,
                    phone, address, business_license_url, description, status,
                    rejection_reason, approved_by, approved_at, created_at, updated_at
                )
                SELECT
                    id, user_id, business_name, NULL, business_type_id,
                    phone, address, business_license_url, description, status,
                    rejection_reason, approved_by, approved_at, created_at, updated_at
                FROM provider_profiles;
            ');

            // 5. Đồng bộ sequence ID
            DB::statement("
                SELECT setval(pg_get_serial_sequence('provider_profiles_new', 'id'), COALESCE(MAX(id), 1)) FROM provider_profiles_new;
            ");

            // 6. Xóa bảng cũ và đổi tên bảng mới
            DB::statement('DROP TABLE provider_profiles CASCADE;');
            DB::statement('ALTER TABLE provider_profiles_new RENAME TO provider_profiles;');

            // 7. Tái lập foreign keys cho services và bookings
            DB::statement('ALTER TABLE services ADD CONSTRAINT services_provider_id_foreign FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE;');
            DB::statement('ALTER TABLE bookings ADD CONSTRAINT bookings_provider_id_foreign FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE;');
        });
    }

    public function down(): void
    {
        // No-op rollback
    }
};
