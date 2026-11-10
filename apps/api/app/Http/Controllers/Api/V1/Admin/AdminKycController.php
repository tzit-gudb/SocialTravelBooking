<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectKycRequest;
use App\Models\User;
use App\Services\AdminKycService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminKycController extends Controller
{
    public function __construct(
        protected AdminKycService $adminKycService
    ) {}

    /**
     * GET /api/v1/admin/kyc/providers
     * Lấy danh sách hồ sơ đối tác chờ duyệt, đã duyệt hoặc bị từ chối kèm phân trang.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'status' => $request->query('status'),
                'search' => $request->query('search'),
                'page' => $request->query('page'),
                'per_page' => $request->query('per_page', 10),
            ];

            $token = $request->bearerToken() ?? $request->query('token');
            $result = $this->adminKycService->getProviders($filters, $token);

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách hồ sơ đối tác thành công.',
                'data' => $result['data'],
                'meta' => $result['meta'],
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Admin KYC Index Error: '.$e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra khi tải danh sách hồ sơ đối tác.',
            ], 500);
        }
    }

    /**
     * GET /api/v1/admin/kyc/providers/{id}
     * Xem thông tin chi tiết một hồ sơ đối tác và các tài liệu pháp lý đính kèm.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        try {
            $token = $request->bearerToken() ?? $request->query('token');
            $profile = $this->adminKycService->getProviderDetail($id, $token);

            return response()->json([
                'success' => true,
                'message' => 'Lấy chi tiết hồ sơ đối tác thành công.',
                'data' => $profile,
            ], 200);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ đối tác yêu cầu.',
            ], 404);
        } catch (\Throwable $e) {
            Log::error('Admin KYC Show Error: '.$e->getMessage(), [
                'id' => $id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra khi lấy chi tiết hồ sơ đối tác.',
            ], 500);
        }
    }

    /**
     * POST /api/v1/admin/kyc/providers/{id}/approve
     * Phê duyệt hồ sơ đối tác: Cấp quyền mở bán dịch vụ trên nền tảng.
     */
    public function approve(Request $request, int|string $id): JsonResponse
    {
        try {
            /** @var User|null $adminUser */
            $adminUser = $request->user() ?? $request->attributes->get('userModel');

            if (! $adminUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phiên đăng nhập quản trị không hợp lệ.',
                ], 401);
            }

            $token = $request->bearerToken() ?? $request->query('token');
            $updatedProfile = $this->adminKycService->approveProvider($id, $adminUser, $token);

            return response()->json([
                'success' => true,
                'message' => 'Đã phê duyệt hồ sơ đối tác thành công.',
                'data' => $updatedProfile,
            ], 200);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ đối tác yêu cầu.',
            ], 404);
        } catch (\Throwable $e) {
            Log::error('Admin KYC Approve Error: '.$e->getMessage(), [
                'id' => $id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra trong quá trình phê duyệt hồ sơ.',
            ], 500);
        }
    }

    /**
     * POST /api/v1/admin/kyc/providers/{id}/reject
     * Từ chối hồ sơ đối tác kèm lý do cụ thể gửi thông báo cho đối tác.
     */
    public function reject(RejectKycRequest $request, int|string $id): JsonResponse
    {
        try {
            /** @var User|null $adminUser */
            $adminUser = $request->user() ?? $request->attributes->get('userModel');

            if (! $adminUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phiên đăng nhập quản trị không hợp lệ.',
                ], 401);
            }

            $token = $request->bearerToken() ?? $request->query('token');
            $reason = (string) $request->validated('rejection_reason');

            $updatedProfile = $this->adminKycService->rejectProvider($id, $reason, $adminUser, $token);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi thông báo từ chối hồ sơ cho đối tác.',
                'data' => $updatedProfile,
            ], 200);
        } catch (ModelNotFoundException) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ đối tác yêu cầu.',
            ], 404);
        } catch (\Throwable $e) {
            Log::error('Admin KYC Reject Error: '.$e->getMessage(), [
                'id' => $id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Đã có lỗi xảy ra trong quá trình từ chối hồ sơ.',
            ], 500);
        }
    }
}
