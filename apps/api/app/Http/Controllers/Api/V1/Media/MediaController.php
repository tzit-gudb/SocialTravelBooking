<?php

namespace App\Http\Controllers\Api\V1\Media;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\UploadPrivateMediaRequest;
use App\Http\Requests\Media\UploadPublicMediaRequest;
use App\Models\User;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class MediaController extends Controller
{
    public function __construct(
        protected MediaService $mediaService
    ) {}

    /**
     * Tải lên một hoặc nhiều tệp tin công khai (Avatar, Ảnh bìa dịch vụ, Gallery, Bài viết).
     */
    public function upload(UploadPublicMediaRequest $request): JsonResponse
    {
        $type = $request->input('type');

        // Trường hợp tải lên nhiều tệp tin cùng lúc (Album gallery dịch vụ)
        if ($request->hasFile('files')) {
            $files = $request->file('files');
            $uploadedList = [];

            foreach ($files as $file) {
                $uploadedList[] = $this->mediaService->uploadPublicFile($file, $type);
            }

            return response()->json([
                'success' => true,
                'message' => 'Tải lên danh sách tệp tin thành công.',
                'data' => $uploadedList,
            ], 201);
        }

        // Trường hợp tải lên một tệp tin đơn lẻ
        $file = $request->file('file');
        $fileInfo = $this->mediaService->uploadPublicFile($file, $type);

        return response()->json([
            'success' => true,
            'message' => 'Tải lên tệp tin thành công.',
            'data' => $fileInfo,
        ], 201);
    }

    /**
     * Tải lên tài liệu nhạy cảm cần bảo mật (CCCD, Giấy phép kinh doanh, Hóa đơn).
     */
    public function uploadPrivate(UploadPrivateMediaRequest $request): JsonResponse
    {
        $type = $request->input('type');
        $file = $request->file('file');

        $fileInfo = $this->mediaService->uploadPrivateFile($file, $type);

        return response()->json([
            'success' => true,
            'message' => 'Tải lên tài liệu bảo mật thành công.',
            'data' => $fileInfo,
        ], 201);
    }

    /**
     * Xem hoặc tải xuống tài liệu bảo mật có phân quyền nghiêm ngặt.
     */
    public function showPrivate(Request $request, string $path): Response
    {
        /** @var User|null $user */
        $user = $request->user() ?? $request->attributes->get('userModel');

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng đăng nhập để truy cập tài liệu này.',
            ], 401);
        }

        try {
            $cleanPath = $this->mediaService->validateSafePath($path);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Đường dẫn tệp tin không hợp lệ.',
            ], 400);
        }

        // Kiểm tra phân quyền truy cập:
        // - Admin có toàn quyền xem mọi tài liệu.
        // - Provider được phép xem các tài liệu thuộc phân vùng kyc và invoices.
        // - Các vai trò khác (như Tourist) không có quyền truy cập.
        $hasPermission = match ($user->role) {
            'admin' => true,
            'provider' => str_starts_with($cleanPath, 'kyc/') || str_starts_with($cleanPath, 'invoices/'),
            default => false,
        };

        if (! $hasPermission) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập vào tài liệu này.',
            ], 403);
        }

        if (! Storage::disk('local')->exists($cleanPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Tệp tin không tồn tại hoặc đã bị xóa.',
            ], 404);
        }

        return Storage::disk('local')->response($cleanPath, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-cache, no-store, must-revalidate',
        ]);
    }
}
