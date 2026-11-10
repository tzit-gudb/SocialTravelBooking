<?php

namespace App\Http\Controllers\Api\V1\Provider;

use App\Http\Controllers\Controller;
use App\Http\Requests\Provider\SubmitKycRequest;
use App\Models\User;
use App\Services\ProviderKycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class KycController extends Controller
{
    public function __construct(
        protected ProviderKycService $kycService
    ) {}

    /**
     * POST /api/v1/provider/kyc/submit
     * Nộp hoặc cập nhật hồ sơ định danh KYC của Nhà cung cấp (Provider).
     */
    public function submit(SubmitKycRequest $request): JsonResponse
    {
        try {
            /** @var User|null $user */
            $user = $request->user() ?? $request->attributes->get('userModel');

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng đăng nhập để thực hiện nộp hồ sơ KYC.',
                ], 401);
            }

            $licenseFiles = $request->file('business_licenses') ?? $request->file('business_license');

            $profile = $this->kycService->submitKyc(
                $user,
                $request->validated(),
                $licenseFiles
            );

            return response()->json([
                'success' => true,
                'message' => 'Nộp hồ sơ xét duyệt KYC thành công.',
                'data' => [
                    'status' => $profile->status,
                    'provider_profile' => $profile,
                ],
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Provider KYC Submit Error: '.$e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra khi nộp hồ sơ KYC. Vui lòng thử lại sau.',
            ], 500);
        }
    }

    /**
     * GET /api/v1/provider/kyc/status
     * Xem trạng thái xét duyệt hồ sơ KYC hiện tại của Provider.
     */
    public function status(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user() ?? $request->attributes->get('userModel');

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng đăng nhập để xem trạng thái KYC.',
            ], 401);
        }

        $kycStatus = $this->kycService->getKycStatus($user);

        return response()->json([
            'success' => true,
            'message' => 'Lấy trạng thái hồ sơ KYC thành công.',
            'data' => $kycStatus,
        ]);
    }
}
