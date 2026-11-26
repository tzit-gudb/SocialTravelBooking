<?php

namespace App\Events;

use App\Models\WithdrawalRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WithdrawalUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $action;

    public int $withdrawalId;

    public string $requestCode;

    public int $providerId;

    public string $providerName;

    public float $amount;

    public string $status;

    public ?string $payoutMethod;

    public ?string $payoutReference;

    public int $actionableCount;

    public ?string $paidAt;

    public ?string $confirmedAt;

    public function __construct(WithdrawalRequest $withdrawal, string $action = 'updated')
    {
        $withdrawal->loadMissing('provider:id,business_name');

        $this->action = $action;
        $this->withdrawalId = (int) $withdrawal->id;
        $this->requestCode = (string) $withdrawal->request_code;
        $this->providerId = (int) $withdrawal->provider_id;
        $this->providerName = (string) ($withdrawal->provider?->business_name ?? 'Nhà cung cấp dịch vụ');
        $this->amount = round((float) $withdrawal->amount, 2);
        $this->status = (string) $withdrawal->status;
        $this->payoutMethod = $withdrawal->payout_method;
        $this->payoutReference = $withdrawal->payout_reference;
        $this->paidAt = $withdrawal->paid_at?->toIso8601String();
        $this->confirmedAt = $withdrawal->confirmed_at?->toIso8601String();
        $this->actionableCount = WithdrawalRequest::query()
            ->whereIn('status', ['pending', 'disputed'])
            ->count();
    }

    /**
     * Phát sóng tức thời đến Admin và Nhà cung cấp dịch vụ.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('admin.withdrawals'),
            new Channel("provider.{$this->providerId}.wallet"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'withdrawal.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'withdrawal_id' => $this->withdrawalId,
            'request_code' => $this->requestCode,
            'provider_id' => $this->providerId,
            'provider_name' => $this->providerName,
            'amount' => $this->amount,
            'status' => $this->status,
            'payout_method' => $this->payoutMethod,
            'payout_reference' => $this->payoutReference,
            'actionable_count' => $this->actionableCount,
            'paid_at' => $this->paidAt,
            'confirmed_at' => $this->confirmedAt,
        ];
    }
}
