<?php

namespace App\Services;

use App\Events\WithdrawalUpdated;
use App\Models\Booking;
use App\Models\ProviderBankAccount;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProviderWalletService
{
    private const ALLOWED_TX_TYPES = [
        'deposit',
        'booking_payment',
        'refund',
        'commission',
        'affiliate_reward',
        'withdraw',
    ];

    private const ALLOWED_WITHDRAWAL_STATUSES = [
        'pending',
        'paid',
        'completed',
        'disputed',
        'rejected',
    ];

    public function ensureWallet(User $user): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'balance' => 0,
                'locked_balance' => 0,
                'currency' => 'VND',
            ]
        );
    }

    /**
     * Tạo URL mã VietQR động trỏ thẳng đến tài khoản ngân hàng của Nhà cung cấp dịch vụ.
     */
    public function buildVietQrUrl(
        string $bankCode,
        string $accountNumber,
        float $amount,
        string $requestCode,
        string $accountHolder
    ): string {
        $cleanBank = rawurlencode(strtoupper(trim($bankCode)));
        $cleanAcc = rawurlencode((string) (preg_replace('/\s+/', '', trim($accountNumber)) ?? ''));

        return sprintf(
            'https://img.vietqr.io/image/%s-%s-compact2.jpg?%s',
            $cleanBank,
            $cleanAcc,
            http_build_query([
                'amount' => (int) round($amount),
                'addInfo' => "RUT {$requestCode}",
                'accountName' => $accountHolder,
            ])
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function transformWithdrawal(WithdrawalRequest $w, bool $includeProvider = false): array
    {
        $payload = [
            'id' => $w->id,
            'request_code' => $w->request_code,
            'provider_id' => $w->provider_id,
            'bank_account_id' => $w->bank_account_id,
            'bank_code' => $w->bank_code,
            'bank_name' => $w->bank_name,
            'account_number' => $w->account_number,
            'account_holder' => $w->account_holder,
            'amount' => round((float) $w->amount, 2),
            'status' => $w->status,
            'payout_method' => $w->payout_method,
            'payout_reference' => $w->payout_reference,
            'note' => $w->note,
            'rejected_reason' => $w->rejected_reason,
            'dispute_note' => $w->dispute_note,
            'paid_at' => $w->paid_at?->toIso8601String(),
            'confirmed_at' => $w->confirmed_at?->toIso8601String(),
            'created_at' => $w->created_at?->toIso8601String(),
            'vietqr_url' => $this->buildVietQrUrl(
                $w->bank_code,
                $w->account_number,
                (float) $w->amount,
                $w->request_code,
                $w->account_holder
            ),
            'transfer_content' => "RUT {$w->request_code}",
        ];

        if ($includeProvider) {
            $payload['provider'] = $w->provider ? [
                'id' => $w->provider->id,
                'business_name' => $w->provider->business_name,
                'phone' => $w->provider->phone,
            ] : null;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function getWalletSummary(User $user, ProviderProfile $provider): array
    {
        $wallet = $this->ensureWallet($user);

        $totalEarned = (float) WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->whereIn('type', ['booking_payment', 'deposit', 'affiliate_reward'])
            ->where('amount', '>', 0)
            ->sum('amount');

        $totalWithdrawn = (float) WithdrawalRequest::query()
            ->where('provider_id', $provider->id)
            ->whereIn('status', ['paid', 'completed'])
            ->sum('amount');

        $pendingWithdrawalAmount = (float) WithdrawalRequest::query()
            ->where('provider_id', $provider->id)
            ->whereIn('status', ['pending', 'disputed'])
            ->sum('amount');

        $pendingEscrowCount = Booking::query()
            ->where('provider_id', $provider->id)
            ->where('status', 'confirmed')
            ->where('deposit_amount', '>', 0)
            ->count();

        $checkedInCount = Booking::query()
            ->where('provider_id', $provider->id)
            ->whereIn('status', ['checked_in', 'completed'])
            ->count();

        $actionableWithdrawalsCount = WithdrawalRequest::query()
            ->where('provider_id', $provider->id)
            ->where('status', 'paid')
            ->count();

        return [
            'provider_id' => $provider->id,
            'wallet' => [
                'id' => $wallet->id,
                'balance' => round((float) $wallet->balance, 2),
                'locked_balance' => round((float) $wallet->locked_balance, 2),
                'currency' => $wallet->currency ?: 'VND',
                'updated_at' => $wallet->updated_at?->toIso8601String(),
            ],
            'stats' => [
                'total_earned' => round($totalEarned, 2),
                'total_withdrawn' => round($totalWithdrawn, 2),
                'pending_withdrawal_amount' => round($pendingWithdrawalAmount, 2),
                'pending_escrow_bookings_count' => $pendingEscrowCount,
                'checked_in_bookings_count' => $checkedInCount,
                'paid_awaiting_confirmation_count' => $actionableWithdrawalsCount,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function listTransactions(User $user, array $filters): array
    {
        $wallet = $this->ensureWallet($user);

        $type = trim((string) ($filters['type'] ?? 'all'));
        $search = trim((string) ($filters['q'] ?? ''));
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 50);

        $baseQuery = WalletTransaction::query()->where('wallet_id', $wallet->id);

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $baseQuery->where(function ($sub) use ($like) {
                $sub->where('reference_id', 'ilike', $like)
                    ->orWhere('note', 'ilike', $like);
            });
        }

        $countsRaw = (clone $baseQuery)
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $counts = [
            'all' => (int) $countsRaw->sum(),
            'booking_payment' => (int) ($countsRaw['booking_payment'] ?? 0),
            'withdraw' => (int) ($countsRaw['withdraw'] ?? 0),
            'refund' => (int) ($countsRaw['refund'] ?? 0),
            'commission' => (int) ($countsRaw['commission'] ?? 0),
            'deposit' => (int) ($countsRaw['deposit'] ?? 0),
            'affiliate_reward' => (int) ($countsRaw['affiliate_reward'] ?? 0),
        ];

        $listQuery = (clone $baseQuery)->orderByDesc('created_at')->orderByDesc('id');

        if ($type !== '' && $type !== 'all' && in_array($type, self::ALLOWED_TX_TYPES, true)) {
            $listQuery->where('type', $type);
        }

        $paginated = $listQuery->paginate($perPage);

        $items = $paginated->getCollection()->map(fn (WalletTransaction $tx) => [
            'id' => $tx->id,
            'type' => $tx->type,
            'amount' => round((float) $tx->amount, 2),
            'balance_before' => round((float) $tx->balance_before, 2),
            'balance_after' => round((float) $tx->balance_after, 2),
            'note' => $tx->note,
            'reference_id' => $tx->reference_id,
            'created_at' => $tx->created_at?->toIso8601String(),
        ])->values();

        return [
            'counts' => $counts,
            'data' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    /**
     * Danh sách yêu cầu rút tiền của Nhà cung cấp dịch vụ.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function listProviderWithdrawals(ProviderProfile $provider, array $filters): array
    {
        $status = trim((string) ($filters['status'] ?? 'all'));
        $perPage = min(max((int) ($filters['per_page'] ?? 10), 1), 50);

        $baseQuery = WithdrawalRequest::query()->where('provider_id', $provider->id);

        $countsRaw = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $counts = [
            'all' => (int) $countsRaw->sum(),
            'pending' => (int) ($countsRaw['pending'] ?? 0),
            'paid' => (int) ($countsRaw['paid'] ?? 0),
            'completed' => (int) ($countsRaw['completed'] ?? 0),
            'disputed' => (int) ($countsRaw['disputed'] ?? 0),
            'rejected' => (int) ($countsRaw['rejected'] ?? 0),
        ];

        $listQuery = (clone $baseQuery)->orderByDesc('created_at')->orderByDesc('id');
        if ($status !== '' && $status !== 'all' && in_array($status, self::ALLOWED_WITHDRAWAL_STATUSES, true)) {
            $listQuery->where('status', $status);
        }

        $paginated = $listQuery->paginate($perPage);

        return [
            'counts' => $counts,
            'data' => $paginated->getCollection()->map(fn (WithdrawalRequest $w) => $this->transformWithdrawal($w))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    /**
     * Nhà cung cấp gửi yêu cầu rút tiền dựa trên tài khoản ngân hàng đã lưu trong Hồ sơ.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function createWithdrawalRequest(User $user, ProviderProfile $provider, array $data): array
    {
        $amount = round((float) $data['amount'], 2);
        $bankAccountId = (int) $data['bank_account_id'];
        $userNote = trim((string) ($data['note'] ?? ''));

        $bankAccount = ProviderBankAccount::query()
            ->where('provider_id', $provider->id)
            ->find($bankAccountId);

        if (! $bankAccount) {
            throw ValidationException::withMessages([
                'bank_account_id' => ['Tài khoản ngân hàng không hợp lệ hoặc không thuộc cơ sở của bạn.'],
            ]);
        }

        $this->ensureWallet($user);

        $result = DB::transaction(function () use ($user, $provider, $bankAccount, $amount, $userNote) {
            $wallet = Wallet::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $balanceBefore = round((float) $wallet->balance, 2);

            if ($amount > $balanceBefore) {
                throw ValidationException::withMessages([
                    'amount' => ['Số dư khả dụng không đủ để thực hiện yêu cầu rút tiền này.'],
                ]);
            }

            $balanceAfter = round($balanceBefore - $amount, 2);
            $wallet->update(['balance' => $balanceAfter]);

            // Định dạng mã không dấu gạch ngang để ngân hàng & SePay giữ nguyên 100%
            $requestCode = 'WD'.now()->format('ymd').strtoupper(Str::random(6));

            $txNote = "Yêu cầu rút tiền {$requestCode} về {$bankAccount->bank_name} ({$bankAccount->account_number})";
            if ($userNote !== '') {
                $txNote .= " · {$userNote}";
            }

            $tx = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'withdraw',
                'amount' => -$amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'note' => Str::limit($txNote, 250, '...'),
                'reference_id' => $requestCode,
            ]);

            $withdrawal = WithdrawalRequest::create([
                'request_code' => $requestCode,
                'provider_id' => $provider->id,
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'bank_account_id' => $bankAccount->id,
                'bank_code' => $bankAccount->bank_code,
                'bank_name' => $bankAccount->bank_name,
                'account_number' => $bankAccount->account_number,
                'account_holder' => $bankAccount->account_holder,
                'amount' => $amount,
                'status' => 'pending',
                'note' => $userNote !== '' ? $userNote : null,
            ]);

            return [
                'wallet' => [
                    'id' => $wallet->id,
                    'balance' => $balanceAfter,
                    'locked_balance' => round((float) $wallet->locked_balance, 2),
                    'currency' => $wallet->currency ?: 'VND',
                    'updated_at' => $wallet->updated_at?->toIso8601String(),
                ],
                'withdrawal_model' => $withdrawal->fresh('provider:id,business_name,phone'),
                'transaction' => [
                    'id' => $tx->id,
                    'type' => $tx->type,
                    'amount' => round((float) $tx->amount, 2),
                    'balance_before' => round((float) $tx->balance_before, 2),
                    'balance_after' => round((float) $tx->balance_after, 2),
                    'note' => $tx->note,
                    'reference_id' => $tx->reference_id,
                    'created_at' => $tx->created_at?->toIso8601String(),
                ],
            ];
        });

        $withdrawalModel = $result['withdrawal_model'];
        unset($result['withdrawal_model']);
        $result['withdrawal'] = $this->transformWithdrawal($withdrawalModel);

        $this->broadcastWithdrawalSafely($withdrawalModel, 'created');

        return $result;
    }

    /**
     * Nhà cung cấp xác nhận ĐÃ nhận khoản chi trả -> Kết thúc phiên rút tiền (completed).
     *
     * @return array<string, mixed>
     */
    public function confirmReceiptByProvider(ProviderProfile $provider, int $withdrawalId): array
    {
        $withdrawal = DB::transaction(function () use ($provider, $withdrawalId) {
            $locked = WithdrawalRequest::query()
                ->where('provider_id', $provider->id)
                ->lockForUpdate()
                ->find($withdrawalId);

            if (! $locked) {
                abort(404, 'Không tìm thấy yêu cầu rút tiền.');
            }

            if ($locked->status === 'completed') {
                return $locked->fresh('provider:id,business_name,phone');
            }

            if (! in_array($locked->status, ['paid', 'disputed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ có thể xác nhận nhận tiền sau khi yêu cầu đã được chuyển khoản chi trả.'],
                ]);
            }

            $locked->update([
                'status' => 'completed',
                'confirmed_at' => now(),
                'dispute_note' => null,
            ]);

            return $locked->fresh('provider:id,business_name,phone');
        });

        $this->broadcastWithdrawalSafely($withdrawal, 'completed');

        return $this->transformWithdrawal($withdrawal);
    }

    /**
     * Nhà cung cấp báo CHƯA nhận được khoản chi trả -> Chuyển sang disputed và báo ngay cho Admin.
     *
     * @return array<string, mixed>
     */
    public function reportIssueByProvider(ProviderProfile $provider, int $withdrawalId, ?string $note): array
    {
        $cleanNote = trim((string) ($note ?? ''));

        $withdrawal = DB::transaction(function () use ($provider, $withdrawalId, $cleanNote) {
            $locked = WithdrawalRequest::query()
                ->where('provider_id', $provider->id)
                ->lockForUpdate()
                ->find($withdrawalId);

            if (! $locked) {
                abort(404, 'Không tìm thấy yêu cầu rút tiền.');
            }

            if ($locked->status !== 'paid') {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ có thể báo chưa nhận tiền khi lệnh rút đang ở trạng thái đã chi trả.'],
                ]);
            }

            $locked->update([
                'status' => 'disputed',
                'dispute_note' => $cleanNote !== '' ? $cleanNote : 'Nhà cung cấp dịch vụ báo chưa nhận được khoản chi trả.',
            ]);

            return $locked->fresh('provider:id,business_name,phone');
        });

        $this->broadcastWithdrawalSafely($withdrawal, 'disputed');

        return $this->transformWithdrawal($withdrawal);
    }

    /**
     * Admin: Danh sách toàn bộ yêu cầu rút tiền trên sàn kèm bộ lọc & số đếm.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function listAdminWithdrawals(array $filters): array
    {
        $status = trim((string) ($filters['status'] ?? 'all'));
        $search = trim((string) ($filters['q'] ?? ''));
        $perPage = min(max((int) ($filters['per_page'] ?? 15), 1), 50);

        $baseQuery = WithdrawalRequest::query()->with('provider:id,business_name,phone');

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $baseQuery->where(function ($sub) use ($like) {
                $sub->where('request_code', 'ilike', $like)
                    ->orWhere('account_number', 'ilike', $like)
                    ->orWhere('account_holder', 'ilike', $like)
                    ->orWhere('payout_reference', 'ilike', $like)
                    ->orWhereHas('provider', fn ($p) => $p->where('business_name', 'ilike', $like));
            });
        }

        $countsRaw = WithdrawalRequest::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $counts = [
            'all' => (int) $countsRaw->sum(),
            'pending' => (int) ($countsRaw['pending'] ?? 0),
            'paid' => (int) ($countsRaw['paid'] ?? 0),
            'disputed' => (int) ($countsRaw['disputed'] ?? 0),
            'completed' => (int) ($countsRaw['completed'] ?? 0),
            'rejected' => (int) ($countsRaw['rejected'] ?? 0),
            'actionable' => (int) (($countsRaw['pending'] ?? 0) + ($countsRaw['disputed'] ?? 0)),
        ];

        $listQuery = (clone $baseQuery)
            ->orderByRaw("CASE WHEN status = 'disputed' THEN 0 WHEN status = 'pending' THEN 1 WHEN status = 'paid' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at');

        if ($status !== '' && $status !== 'all' && in_array($status, self::ALLOWED_WITHDRAWAL_STATUSES, true)) {
            $listQuery->where('status', $status);
        }

        $paginated = $listQuery->paginate($perPage);

        return [
            'counts' => $counts,
            'data' => $paginated->getCollection()->map(fn (WithdrawalRequest $w) => $this->transformWithdrawal($w, true))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    /**
     * Admin xác nhận thủ công đã chuyển khoản (nhập mã tham chiếu giao dịch).
     *
     * @return array<string, mixed>
     */
    public function confirmPaidByAdmin(User $admin, int $withdrawalId, string $payoutReference): array
    {
        $cleanRef = trim($payoutReference);

        $withdrawal = DB::transaction(function () use ($admin, $withdrawalId, $cleanRef) {
            $locked = WithdrawalRequest::query()->lockForUpdate()->find($withdrawalId);
            if (! $locked) {
                abort(404, 'Không tìm thấy yêu cầu rút tiền.');
            }

            if (! in_array($locked->status, ['pending', 'disputed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Yêu cầu rút tiền này đã được xử lý trước đó.'],
                ]);
            }

            $locked->update([
                'status' => 'paid',
                'payout_method' => 'manual_admin',
                'payout_reference' => $cleanRef,
                'paid_at' => now(),
                'paid_by' => $admin->id,
                'dispute_note' => null,
            ]);

            return $locked->fresh('provider:id,business_name,phone');
        });

        $this->broadcastWithdrawalSafely($withdrawal, 'paid');

        return $this->transformWithdrawal($withdrawal, true);
    }

    /**
     * Admin từ chối yêu cầu rút tiền -> Hoàn lại tiền vào số dư khả dụng của NCC.
     *
     * @return array<string, mixed>
     */
    public function rejectByAdmin(int $withdrawalId, string $reason): array
    {
        $cleanReason = trim($reason);

        $withdrawal = DB::transaction(function () use ($withdrawalId, $cleanReason) {
            $locked = WithdrawalRequest::query()->lockForUpdate()->find($withdrawalId);
            if (! $locked) {
                abort(404, 'Không tìm thấy yêu cầu rút tiền.');
            }

            if (! in_array($locked->status, ['pending', 'disputed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Không thể từ chối yêu cầu rút tiền ở trạng thái hiện tại.'],
                ]);
            }

            $wallet = Wallet::query()->where('id', $locked->wallet_id)->lockForUpdate()->firstOrFail();
            $amount = round((float) $locked->amount, 2);
            $before = round((float) $wallet->balance, 2);
            $after = round($before + $amount, 2);

            $wallet->update(['balance' => $after]);

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'refund',
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'note' => Str::limit("Hoàn tiền yêu cầu rút {$locked->request_code}: {$cleanReason}", 250, '...'),
                'reference_id' => $locked->request_code,
            ]);

            $locked->update([
                'status' => 'rejected',
                'rejected_reason' => $cleanReason,
            ]);

            return $locked->fresh('provider:id,business_name,phone');
        });

        $this->broadcastWithdrawalSafely($withdrawal, 'rejected');

        return $this->transformWithdrawal($withdrawal, true);
    }

    /**
     * Tự động xử lý Webhook tiền ra (transferType = 'out') từ SePay khi Admin quét VietQR chuyển tiền.
     *
     * @return array<string, mixed>
     */
    public function markPaidBySepayWebhook(string $requestCode, float $transferAmount, string $referenceCode, mixed $sepayId): array
    {
        $normalizedCode = strtoupper(trim($requestCode));

        $result = DB::transaction(function () use ($normalizedCode, $transferAmount, $referenceCode, $sepayId) {
            $withdrawal = WithdrawalRequest::query()
                ->whereRaw("REPLACE(UPPER(request_code), '-', '') = ?", [$normalizedCode])
                ->lockForUpdate()
                ->first();

            if (! $withdrawal) {
                return [
                    'processed' => false,
                    'ignored' => true,
                    'reason' => 'withdrawal_request_not_found',
                ];
            }

            if (in_array($withdrawal->status, ['paid', 'completed'], true)) {
                return [
                    'processed' => true,
                    'already_processed' => true,
                    'request_code' => $withdrawal->request_code,
                    'withdrawal_status' => $withdrawal->status,
                ];
            }

            if (! in_array($withdrawal->status, ['pending', 'disputed'], true)) {
                return [
                    'processed' => false,
                    'ignored' => true,
                    'reason' => 'withdrawal_not_pending',
                ];
            }

            $expectedAmount = round((float) $withdrawal->amount, 2);
            if ($transferAmount + 1 < $expectedAmount) {
                return [
                    'processed' => false,
                    'ignored' => true,
                    'reason' => 'insufficient_payout_amount',
                    'expected_amount' => $expectedAmount,
                    'received_amount' => $transferAmount,
                ];
            }

            $payoutRef = $referenceCode !== '' ? $referenceCode : ($sepayId ? "SEPAY-OUT-{$sepayId}" : $withdrawal->request_code);

            $withdrawal->update([
                'status' => 'paid',
                'payout_method' => 'sepay_webhook',
                'payout_reference' => $payoutRef,
                'paid_at' => now(),
                'dispute_note' => null,
            ]);

            return [
                'processed' => true,
                'already_processed' => false,
                'request_code' => $withdrawal->request_code,
                'withdrawal_status' => 'paid',
                'amount' => $transferAmount,
                '_withdrawal_model' => $withdrawal->fresh('provider:id,business_name,phone'),
            ];
        });

        if (! empty($result['processed']) && empty($result['already_processed']) && ! empty($result['_withdrawal_model'])) {
            $this->broadcastWithdrawalSafely($result['_withdrawal_model'], 'paid');
        }

        unset($result['_withdrawal_model']);

        return $result;
    }

    private function broadcastWithdrawalSafely(?WithdrawalRequest $withdrawal, string $action): void
    {
        if (! $withdrawal) {
            return;
        }

        try {
            WithdrawalUpdated::dispatch($withdrawal, $action);
        } catch (\Throwable $e) {
            Log::warning("Không thể phát sự kiện realtime WithdrawalUpdated ({$action}): ".$e->getMessage(), [
                'request_code' => $withdrawal->request_code,
            ]);
        }
    }
}
