<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Convert business_license_url to JSONB to store multiple license images or PDF file paths.
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE provider_profiles 
            ALTER COLUMN business_license_url TYPE JSONB 
            USING (
                CASE 
                    WHEN business_license_url IS NULL OR business_license_url = '' THEN '[]'::jsonb
                    WHEN business_license_url LIKE '[%' THEN business_license_url::jsonb
                    ELSE jsonb_build_array(business_license_url)
                END
            );
        ");
    }

    /**
     * Revert the JSONB column back to TEXT if necessary.
     */
    public function down(): void
    {
        DB::statement('
            ALTER TABLE provider_profiles 
            ALTER COLUMN business_license_url TYPE TEXT 
            USING (
                CASE 
                    WHEN business_license_url IS NULL THEN NULL
                    ELSE business_license_url::text
                END
            );
        ');
    }
};
