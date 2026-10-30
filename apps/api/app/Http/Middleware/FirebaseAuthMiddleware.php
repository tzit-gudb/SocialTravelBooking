<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Exception\Auth\FailedToVerifyToken;
use Kreait\Firebase\Exception\Auth\RevokedIdToken;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Laravel\Sanctum\PersonalAccessToken;

class FirebaseAuthMiddleware
{
    /**
     * Xác thực người dùng qua Bearer Token (Hỗ trợ cả Firebase ID Token và Sanctum Token).
     */
    public function handle(Request $request, Closure $next): mixed
    {
        $bearerToken = $request->bearerToken();

        if (! $bearerToken) {
            return $this->unauthorizedResponse('Vui lòng đăng nhập để tiếp tục.');
        }

        // 1. Nếu là Sanctum Personal Access Token (định dạng: id|token)
        if (str_contains($bearerToken, '|')) {
            return $this->handleSanctumToken($request, $next, $bearerToken);
        }

        // 2. Xác thực qua Firebase ID Token (JWT)
        try {
            set_time_limit(60);

            $auth = Firebase::auth();
            $verifiedToken = $auth->verifyIdToken($bearerToken, false, 60);

            $uid = $verifiedToken->claims()->get('sub');
            $email = $verifiedToken->claims()->get('email');
            $claims = $verifiedToken->claims()->all();

            $request->attributes->set('firebaseUid', $uid);
            $request->attributes->set('firebaseEmail', $email ? strtolower($email) : null);
            $request->attributes->set('firebaseUser', $claims);

            $user = User::where('firebase_uid', $uid)
                ->orWhere(function ($query) use ($email) {
                    if ($email) {
                        $query->where('email', strtolower($email));
                    }
                })
                ->first();

            if ($user) {
                if ($user->status === 'banned') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tài khoản của bạn đã bị khóa do vi phạm chính sách.',
                    ], 403);
                }

                // Tự động gắn firebase_uid nếu tài khoản đã có sẵn qua email
                if (! $user->firebase_uid && $uid) {
                    $user->update(['firebase_uid' => $uid]);
                }

                $request->setUserResolver(fn () => $user);
                $request->attributes->set('userModel', $user);
            }

            return $next($request);
        } catch (RevokedIdToken $e) {
            Log::warning('Firebase Auth: Token revoked', ['error' => $e->getMessage()]);

            return $this->unauthorizedResponse('Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.');
        } catch (FailedToVerifyToken $e) {
            Log::warning('Firebase Auth: Invalid token', ['error' => $e->getMessage()]);

            return $this->unauthorizedResponse('Mã xác thực không hợp lệ hoặc đã hết hạn.');
        } catch (\Throwable $e) {
            Log::error('Firebase Auth Error: '.$e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Không thể xác thực phiên đăng nhập. Vui lòng thử lại sau.',
            ], 500);
        }
    }

    /**
     * Xử lý xác thực bằng Sanctum Personal Access Token.
     */
    private function handleSanctumToken(Request $request, Closure $next, string $bearerToken): mixed
    {
        $accessToken = PersonalAccessToken::findToken($bearerToken);

        if (! $accessToken || ! $accessToken->tokenable instanceof User) {
            return $this->unauthorizedResponse('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
        }

        /** @var User $user */
        $user = $accessToken->tokenable;

        if ($user->status === 'banned') {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản của bạn đã bị khóa do vi phạm chính sách.',
            ], 403);
        }

        $request->attributes->set('firebaseUid', $user->firebase_uid ?? 'local_'.$user->id);
        $request->attributes->set('firebaseEmail', $user->email);
        $request->attributes->set('firebaseUser', [
            'name' => $user->name,
            'email' => $user->email,
            'picture' => $user->avatar_url,
        ]);

        $request->setUserResolver(fn () => $user);
        $request->attributes->set('userModel', $user);

        return $next($request);
    }

    private function unauthorizedResponse(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 401);
    }
}
