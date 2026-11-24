<?php

namespace App\Http\Controllers\Api\V1\Webhook;

use App\Http\Controllers\Controller;
use App\Services\SepayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SepayWebhookController extends Controller
{
    public function __construct(
        private readonly SepayService $sepayService
    ) {}

    /**
     * POST /api/v1/webhooks/sepay
     * Xác thực Apikey từ Sepay và cập nhật trạng thái thanh toán đơn đặt chỗ (Idempotent).
     */
    public function handle(Request $request): JsonResponse
    {
        $configuredToken = trim((string) config('services.sepay.webhook_token', ''));
        if ($configuredToken === '') {
            return response()->json([
                'success' => false,
                'message' => 'Webhook token chưa được cấu hình trên máy chủ.',
            ], 500);
        }

        $providedToken = $this->extractToken($request);
        if ($providedToken === '' || ! hash_equals($configuredToken, $providedToken)) {
            return response()->json([
                'success' => false,
                'message' => 'Webhook signature/token không hợp lệ.',
            ], 401);
        }

        $result = $this->sepayService->handleWebhook($request->all());

        return response()->json([
            'success' => true,
            'data' => $result,
        ], 200);
    }

    private function extractToken(Request $request): string
    {
        $authHeader = trim((string) $request->header('Authorization', ''));
        if (preg_match('/^(?:Apikey|Bearer)\s+(.+)$/i', $authHeader, $matches)) {
            return trim($matches[1]);
        }

        $customHeader = trim((string) $request->header('X-Sepay-Token', ''));
        if ($customHeader !== '') {
            return $customHeader;
        }

        return '';
    }
}
