<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('checkout_requested_at')->nullable()->after('checked_in_at');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedTinyInteger('cleanliness_rating')->nullable()->after('rating');
            $table->unsignedTinyInteger('service_rating')->nullable()->after('cleanliness_rating');
            $table->unsignedTinyInteger('location_rating')->nullable()->after('service_rating');
            $table->unsignedTinyInteger('value_rating')->nullable()->after('location_rating');
            $table->text('pros')->nullable()->after('content');
            $table->text('cons')->nullable()->after('pros');
            $table->boolean('is_recommended')->default(true)->after('cons');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn([
                'cleanliness_rating',
                'service_rating',
                'location_rating',
                'value_rating',
                'pros',
                'cons',
                'is_recommended',
            ]);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('checkout_requested_at');
        });
    }
};
