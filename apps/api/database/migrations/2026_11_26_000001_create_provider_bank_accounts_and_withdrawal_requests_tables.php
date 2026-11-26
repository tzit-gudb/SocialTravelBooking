<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->string('bank_code', 20);
            $table->string('bank_name', 100);
            $table->string('account_number', 50);
            $table->string('account_holder', 120);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['provider_id', 'is_default']);
        });

        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_code', 40)->unique();
            $table->foreignId('provider_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained('provider_bank_accounts')->nullOnDelete();
            $table->string('bank_code', 20);
            $table->string('bank_name', 100);
            $table->string('account_number', 50);
            $table->string('account_holder', 120);
            $table->decimal('amount', 15, 2);
            $table->string('status', 30)->default('pending'); // pending, paid, completed, disputed, rejected
            $table->string('payout_method', 30)->nullable(); // sepay_webhook, manual_admin
            $table->string('payout_reference', 120)->nullable();
            $table->string('note', 255)->nullable();
            $table->string('rejected_reason', 255)->nullable();
            $table->string('dispute_note', 255)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['provider_id', 'status', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
        Schema::dropIfExists('provider_bank_accounts');
    }
};
