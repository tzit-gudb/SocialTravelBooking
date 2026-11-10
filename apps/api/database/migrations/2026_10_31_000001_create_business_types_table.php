<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Bảng Loại hình Doanh nghiệp Nhà cung cấp (Business Types)
        Schema::create('business_types', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // Phân loại lớn: 'Chỗ ở', 'Giải trí', 'Phương tiện', 'Ăn uống'...
            $table->string('name', 100); // Tên chi tiết: 'Khách sạn', 'Resort', 'Homestay & Villa', 'Tour du lịch & Trải nghiệm'...
            $table->string('slug', 100)->unique();
            $table->timestamps();

            $table->index('type');
        });

        // 2. Bổ sung business_type_id vào provider_profiles
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->foreignId('business_type_id')
                ->nullable()
                ->after('business_name')
                ->constrained('business_types')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropForeign(['business_type_id']);
            $table->dropColumn('business_type_id');
        });

        Schema::dropIfExists('business_types');
    }
};
