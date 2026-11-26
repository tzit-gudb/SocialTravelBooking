<?php

namespace App\Http\Controllers\Api\V1\Provider;

use App\Http\Controllers\Controller;
use App\Http\Requests\Provider\WithdrawWalletRequest;
use App\Services\ProviderWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderWalletController extends Controller
{
    public function __construct(
        private readonly ProviderWalletService $walletService
    ) {}

    /**
     * GET /api/v1/provider/wallet
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $provider = $user?->providerProfile;
        if (! $user || ! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->walletService->getWalletSummary($user, $provider),
        ]);
    }

    /**
     * GET /api/v1/provider/wallet/transactions
     */
    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();
        $provider = $user?->providerProfile;
        if (! $user || ! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $result = $this->walletService->listTransactions($user, [
            'type' => $request->query('type', 'all'),
            'q' => $request->query('q', ''),
            'per_page' => $request->query('per_page', 15),
        ]);

        return response()->json(array_merge(['success' => true], $result));
    }

    /**
     * GET /api/v1/provider/wallet/withdrawals
     */
    public function withdrawals(Request $request): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $result = $this->walletService->listProviderWithdrawals($provider, [
            'status' => $request->query('status', 'all'),
            'per_page' => $request->query('per_page', 10),
        ]);

        return response()->json(array_merge(['success' => true], $result));
    }

    /**
     * POST /api/v1/provider/wallet/withdraw
     */
    public function withdraw(WithdrawWalletRequest $request): JsonResponse
    {
        $user = $request->user();
        $provider = $user?->providerProfile;
        if (! $user || ! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $result = $this->walletService->createWithdrawalRequest($user, $provider, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Gửi yêu cầu rút tiền thành công! Đang chờ Quản trị viên chi trả.',
            'data' => $result,
        ], 201);
    }

    /**
     * POST /api/v1/provider/wallet/withdrawals/{id}/confirm-receipt
     */
    public function confirmReceipt(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $updated = $this->walletService->confirmReceiptByProvider($provider, $id);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận nhận khoản chi trả thành công! Phiên rút tiền đã hoàn tất.',
            'data' => $updated,
        ]);
    }

    /**
     * POST /api/v1/provider/wallet/withdrawals/{id}/report-issue
     */
    public function reportIssue(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $validated = $request->validate([
            'dispute_note' => ['nullable', 'string', 'max:255'],
        ]);

        $updated = $this->walletService->reportIssueByProvider($provider, $id, $validated['dispute_note'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phản hồi chưa nhận được tiền tới Quản trị viên để đối soát lại.',
            'data' => $updated,
        ]);
    }
}
