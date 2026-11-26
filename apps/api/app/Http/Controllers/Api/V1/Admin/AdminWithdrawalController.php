<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\ProviderWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminWithdrawalController extends Controller
{
    public function __construct(
        private readonly ProviderWalletService $walletService
    ) {}

    /**
     * GET /api/v1/admin/withdrawals
     */
    public function index(Request $request): JsonResponse
    {
        $result = $this->walletService->listAdminWithdrawals([
            'status' => $request->query('status', 'all'),
            'q' => $request->query('q', ''),
            'per_page' => $request->query('per_page', 15),
        ]);

        return response()->json(array_merge(['success' => true], $result));
    }

    /**
     * POST /api/v1/admin/withdrawals/{id}/confirm-paid
     */
    public function confirmPaid(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payout_reference' => ['required', 'string', 'max:120'],
        ], [
            'payout_reference.required' => 'Vui lòng nhập mã tham chiếu giao dịch chuyển khoản.',
        ]);

        $updated = $this->walletService->confirmPaidByAdmin(
            $request->user(),
            $id,
            $validated['payout_reference']
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận chi trả! Đang chờ Nhà cung cấp dịch vụ xác nhận đã nhận tiền.',
            'data' => $updated,
        ]);
    }

    /**
     * POST /api/v1/admin/withdrawals/{id}/reject
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'rejected_reason' => ['required', 'string', 'max:255'],
        ], [
            'rejected_reason.required' => 'Vui lòng nhập lý do từ chối yêu cầu rút tiền.',
        ]);

        $updated = $this->walletService->rejectByAdmin($id, $validated['rejected_reason']);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối yêu cầu rút tiền và hoàn lại số dư khả dụng cho Nhà cung cấp dịch vụ.',
            'data' => $updated,
        ]);
    }
}
