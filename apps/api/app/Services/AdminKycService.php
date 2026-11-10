<?php

namespace App\Services;

use App\Enums\ProviderStatus;
use App\Enums\UserRole;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminKycService
{
    /**
     * Truy vấn danh sách hồ sơ đối tác có lọc theo trạng thái, từ khóa tìm kiếm và phân trang.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getProviders(array $filters = [], ?string $token = null): array
    {
        $query = ProviderProfile::with(['businessType', 'user', 'approvedByUser']);

        // 1. Lọc theo trạng thái hồ sơ: mặc định 'pending', 'all' để lấy tất cả
        $status = $filters['status'] ?? ProviderStatus::Pending->value;
        if (! empty($status) && $status !== 'all') {
            $query->where('status', $status);
        }

        // 2. Tìm kiếm theo tên doanh nghiệp, tên người đại diện hoặc số điện thoại
        if (! empty($filters['search'])) {
            $search = mb_strtolower(trim($filters['search']));
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(business_name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(representative_name) LIKE ?', ["%{$search}%"])
                    ->orWhere('phone', 'LIKE', "%{$search}%");
            });
        }

        // Sắp xếp hồ sơ mới nhất lên đầu
        $query->orderBy('created_at', 'desc');

        $perPage = max(1, min((int) ($filters['per_page'] ?? 10), 100));
        $page = max(1, (int) ($filters['page'] ?? 1));

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        // Đếm tổng số hồ sơ đang chờ duyệt để cung cấp badge cho thanh điều hướng
        $pendingCount = ProviderProfile::where('status', ProviderStatus::Pending->value)->count();

        $formattedItems = array_map(
            fn (ProviderProfile $profile) => $this->formatProfile($profile, $token),
            $paginator->items()
        );

        return [
            'data' => $formattedItems,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'pending_count' => $pendingCount,
            ],
        ];
    }

    /**
     * Lấy thông tin chi tiết một hồ sơ đối tác theo ID.
     *
     * @return array<string, mixed>
     */
    public function getProviderDetail(int|string $id, ?string $token = null): array
    {
        $profile = ProviderProfile::with(['businessType', 'user', 'approvedByUser'])->findOrFail($id);

        return $this->formatProfile($profile, $token);
    }

    /**
     * Phê duyệt hồ sơ đối tác: Chuyển trạng thái sang approved, kích hoạt tài khoản User và ghi Audit Log.
     *
     * @return array<string, mixed>
     */
    public function approveProvider(int|string $id, User $adminUser, ?string $token = null): array
    {
        return DB::transaction(function () use ($id, $adminUser, $token) {
            $profile = ProviderProfile::with('user')->findOrFail($id);

            $profile->update([
                'status' => ProviderStatus::Approved->value,
                'approved_by' => $adminUser->id,
                'approved_at' => now(),
                'rejection_reason' => null,
            ]);

            // Kích hoạt tài khoản người dùng và đảm bảo vai trò là Provider
            if ($profile->user) {
                $profile->user->update([
                    'status' => 'active',
                    'role' => UserRole::Provider->value,
                ]);
            }

            // Ghi nhật ký kiểm toán (Audit Log) về hành động phê duyệt của Admin
            Log::info("KYC Audit: Admin [ID: {$adminUser->id} - {$adminUser->email}] approved provider profile [ID: {$profile->id}] for business [{$profile->business_name}]", [
                'action' => 'approve_kyc',
                'admin_id' => $adminUser->id,
                'admin_email' => $adminUser->email,
                'provider_profile_id' => $profile->id,
                'user_id' => $profile->user_id,
                'business_name' => $profile->business_name,
                'approved_at' => $profile->approved_at?->toIso8601String(),
            ]);

            return $this->formatProfile(
                $profile->fresh(['businessType', 'user', 'approvedByUser']),
                $token
            );
        });
    }

    /**
     * Từ chối hồ sơ đối tác: Ghi nhận lý do từ chối cụ thể để đối tác khắc phục và ghi Audit Log.
     *
     * @return array<string, mixed>
     */
    public function rejectProvider(int|string $id, string $reason, User $adminUser, ?string $token = null): array
    {
        return DB::transaction(function () use ($id, $reason, $adminUser, $token) {
            $profile = ProviderProfile::with('user')->findOrFail($id);

            $profile->update([
                'status' => ProviderStatus::Rejected->value,
                'rejection_reason' => trim($reason),
                'approved_by' => $adminUser->id,
                'approved_at' => null,
            ]);

            // Ghi nhật ký kiểm toán (Audit Log) về hành động từ chối kèm lý do
            Log::info("KYC Audit: Admin [ID: {$adminUser->id} - {$adminUser->email}] rejected provider profile [ID: {$profile->id}] for business [{$profile->business_name}]", [
                'action' => 'reject_kyc',
                'admin_id' => $adminUser->id,
                'admin_email' => $adminUser->email,
                'provider_profile_id' => $profile->id,
                'user_id' => $profile->user_id,
                'business_name' => $profile->business_name,
                'rejection_reason' => trim($reason),
                'rejected_at' => now()->toIso8601String(),
            ]);

            return $this->formatProfile(
                $profile->fresh(['businessType', 'user', 'approvedByUser']),
                $token
            );
        });
    }

    /**
     * Chuẩn hóa dữ liệu hồ sơ đối tác trả về cho Admin Frontend.
     * Tự động giải quyết đường dẫn private file thành URL có thể xem trực tiếp qua trình duyệt.
     *
     * @return array<string, mixed>
     */
    public function formatProfile(ProviderProfile $profile, ?string $token = null): array
    {
        $rawUrls = $profile->business_license_url ?? [];
        if (is_string($rawUrls)) {
            $rawUrls = json_decode($rawUrls, true) ?: [$rawUrls];
        }

        $resolvedUrls = [];
        foreach ($rawUrls as $path) {
            if (! empty($path) && is_string($path)) {
                $resolvedUrls[] = $this->resolveMediaUrl($path, $token);
            }
        }

        return [
            'id' => $profile->id,
            'user_id' => $profile->user_id,
            'business_name' => $profile->business_name,
            'representative_name' => $profile->representative_name,
            'business_type_id' => $profile->business_type_id,
            'business_type_name' => $profile->businessType?->name ?? 'Dịch vụ du lịch',
            'business_type' => $profile->businessType ? [
                'id' => $profile->businessType->id,
                'name' => $profile->businessType->name,
                'type' => $profile->businessType->type,
                'slug' => $profile->businessType->slug,
            ] : null,
            'phone' => $profile->phone,
            'address' => $profile->address,
            'description' => $profile->description,
            'business_license_url' => $resolvedUrls,
            'raw_business_license_url' => $rawUrls,
            'status' => $profile->status,
            'rejection_reason' => $profile->rejection_reason,
            'approved_by' => $profile->approved_by,
            'approved_at' => $profile->approved_at?->toISOString(),
            'created_at' => $profile->created_at?->toISOString(),
            'updated_at' => $profile->updated_at?->toISOString(),
            'user' => $profile->user ? [
                'id' => $profile->user->id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'role' => $profile->user->role,
                'status' => $profile->user->status,
            ] : null,
            'approved_by_user' => $profile->approvedByUser ? [
                'id' => $profile->approvedByUser->id,
                'name' => $profile->approvedByUser->name,
                'email' => $profile->approvedByUser->email,
            ] : null,
        ];
    }

    /**
     * Chuyển đổi đường dẫn file lưu trữ nội bộ thành URL truy cập được (kèm token xác thực nếu có).
     */
    protected function resolveMediaUrl(string $path, ?string $token = null): string
    {
        $trimmed = trim($path);
        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://') || str_starts_with($trimmed, 'data:')) {
            return $trimmed;
        }

        $cleanPath = ltrim(preg_replace('/^\/?(storage\/|private\/)?/', '', $trimmed), '/');
        $baseUrl = url('/api/v1/media/private/'.$cleanPath);

        return $token ? $baseUrl.'?token='.urlencode($token) : $baseUrl;
    }
}
