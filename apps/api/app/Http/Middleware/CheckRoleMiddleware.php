<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckRoleMiddleware
{
    /**
     * Kiểm tra quyền truy cập dựa trên vai trò (admin, provider, tourist).
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        /** @var User|null $user */
        $user = $request->user() ?? $request->attributes->get('userModel');

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa được đồng bộ trên hệ thống. Vui lòng đăng nhập lại.',
            ], 401);
        }

        if ($user->status === 'banned') {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản của bạn đã bị khóa.',
            ], 403);
        }

        if (! empty($roles) && ! in_array($user->role, $roles, true)) {
            Log::warning("CheckRoleMiddleware: Người dùng ID [{$user->id}] có vai trò [{$user->role}] bị từ chối truy cập route yêu cầu: ".implode(', ', $roles));

            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào phân hệ này.',
            ], 403);
        }

        return $next($request);
    }
}
