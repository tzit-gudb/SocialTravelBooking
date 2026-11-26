<?php

namespace App\Http\Controllers\Api\V1\Provider;

use App\Http\Controllers\Controller;
use App\Http\Requests\Provider\ProviderBankAccountRequest;
use App\Models\ProviderBankAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProviderBankAccountController extends Controller
{
    /**
     * GET /api/v1/provider/bank-accounts
     */
    public function index(Request $request): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $accounts = ProviderBankAccount::query()
            ->where('provider_id', $provider->id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    /**
     * POST /api/v1/provider/bank-accounts
     */
    public function store(ProviderBankAccountRequest $request): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $validated = $request->validated();

        $account = DB::transaction(function () use ($provider, $validated) {
            $hasExisting = ProviderBankAccount::where('provider_id', $provider->id)->exists();
            $isDefault = ! $hasExisting || (bool) ($validated['is_default'] ?? false);

            if ($isDefault) {
                ProviderBankAccount::where('provider_id', $provider->id)->update(['is_default' => false]);
            }

            return ProviderBankAccount::create([
                'provider_id' => $provider->id,
                'bank_code' => strtoupper(trim((string) $validated['bank_code'])),
                'bank_name' => trim((string) $validated['bank_name']),
                'account_number' => trim((string) $validated['account_number']),
                'account_holder' => strtoupper(trim((string) $validated['account_holder'])),
                'is_default' => $isDefault,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Thêm tài khoản ngân hàng thành công!',
            'data' => $account,
        ], 201);
    }

    /**
     * PUT /api/v1/provider/bank-accounts/{id}
     */
    public function update(ProviderBankAccountRequest $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $account = ProviderBankAccount::where('provider_id', $provider->id)->find($id);
        if (! $account) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tài khoản ngân hàng.',
            ], 404);
        }

        $validated = $request->validated();

        $updated = DB::transaction(function () use ($provider, $account, $validated) {
            $isDefault = array_key_exists('is_default', $validated)
                ? (bool) $validated['is_default']
                : $account->is_default;

            if ($isDefault) {
                ProviderBankAccount::where('provider_id', $provider->id)
                    ->where('id', '!=', $account->id)
                    ->update(['is_default' => false]);
            }

            $account->update([
                'bank_code' => strtoupper(trim((string) $validated['bank_code'])),
                'bank_name' => trim((string) $validated['bank_name']),
                'account_number' => trim((string) $validated['account_number']),
                'account_holder' => strtoupper(trim((string) $validated['account_holder'])),
                'is_default' => $isDefault,
            ]);

            return $account->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật tài khoản ngân hàng thành công!',
            'data' => $updated,
        ]);
    }

    /**
     * PATCH /api/v1/provider/bank-accounts/{id}/default
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $account = ProviderBankAccount::where('provider_id', $provider->id)->find($id);
        if (! $account) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tài khoản ngân hàng.',
            ], 404);
        }

        DB::transaction(function () use ($provider, $account) {
            ProviderBankAccount::where('provider_id', $provider->id)->update(['is_default' => false]);
            $account->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã đặt làm tài khoản ngân hàng mặc định.',
            'data' => $account->fresh(),
        ]);
    }

    /**
     * DELETE /api/v1/provider/bank-accounts/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $provider = $request->user()?->providerProfile;
        if (! $provider) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ Nhà cung cấp dịch vụ.',
            ], 403);
        }

        $account = ProviderBankAccount::where('provider_id', $provider->id)->find($id);
        if (! $account) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tài khoản ngân hàng.',
            ], 404);
        }

        DB::transaction(function () use ($provider, $account) {
            $wasDefault = $account->is_default;
            $account->delete();

            if ($wasDefault) {
                $next = ProviderBankAccount::where('provider_id', $provider->id)
                    ->orderByDesc('id')
                    ->first();
                if ($next) {
                    $next->update(['is_default' => true]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa tài khoản ngân hàng.',
        ]);
    }
}
