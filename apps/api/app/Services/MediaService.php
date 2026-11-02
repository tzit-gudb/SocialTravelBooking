<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaService
{
    /**
     * Cấu hình các loại upload public (thư mục lưu trữ, dung lượng tối đa tính bằng KB, định dạng cho phép).
     */
    public const PUBLIC_TYPES = [
        'avatar' => [
            'directory' => 'avatars',
            'max_size' => 2048, // 2MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        ],
        'service_cover' => [
            'directory' => 'services/covers',
            'max_size' => 5120, // 5MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        ],
        'service_gallery' => [
            'directory' => 'services/gallery',
            'max_size' => 5120, // 5MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        ],
        'post' => [
            'directory' => 'posts/images',
            'max_size' => 5120, // 5MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        ],
        'review' => [
            'directory' => 'reviews',
            'max_size' => 5120, // 5MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        ],
        'banner' => [
            'directory' => 'banners',
            'max_size' => 5120, // 5MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp'],
        ],
        'category' => [
            'directory' => 'categories',
            'max_size' => 2048, // 2MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'svg'],
        ],
    ];

    /**
     * Cấu hình các loại upload private nhạy cảm.
     */
    public const PRIVATE_TYPES = [
        'kyc_id_card' => [
            'directory' => 'kyc/id_cards',
            'max_size' => 10240, // 10MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
        ],
        'kyc_license' => [
            'directory' => 'kyc/licenses',
            'max_size' => 10240, // 10MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
        ],
        'kyc_document' => [
            'directory' => 'kyc/licenses',
            'max_size' => 10240, // 10MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
        ],
        'invoice' => [
            'directory' => 'invoices',
            'max_size' => 10240, // 10MB
            'mimes' => ['jpeg', 'jpg', 'png', 'webp', 'pdf'],
        ],
    ];

    /**
     * Danh sách extension nguy hiểm bị cấm tuyệt đối để chống tấn công thực thi mã từ xa.
     */
    protected const DANGEROUS_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'exe', 'sh', 'bat', 'cmd',
        'js', 'jsp', 'asp', 'aspx', 'cgi', 'pl', 'py', 'rb', 'jar', 'vbs', 'htaccess',
    ];

    /**
     * Sinh tên file bảo mật dựa trên UUID v4 và phần mở rộng đã qua kiểm duyệt.
     */
    public function generateSecureFileName(UploadedFile $file): string
    {
        $clientExtension = strtolower($file->getClientOriginalExtension());
        $guessedExtension = strtolower($file->guessExtension() ?? '');

        // Ưu tiên extension suy luận từ nội dung file thực tế
        $extension = $guessedExtension ?: $clientExtension;

        if (empty($extension) || in_array($extension, self::DANGEROUS_EXTENSIONS, true) || in_array($clientExtension, self::DANGEROUS_EXTENSIONS, true)) {
            throw ValidationException::withMessages([
                'file' => ['Định dạng tệp tin không hợp lệ hoặc tiềm ẩn rủi ro bảo mật.'],
            ]);
        }

        return Str::uuid()->toString().'.'.$extension;
    }

    /**
     * Lưu trữ file công khai vào disk public.
     *
     * @return array{file_name: string, file_path: string, url: string, file_url: string, mime_type: string, size: int, file_size: int}
     */
    public function uploadPublicFile(UploadedFile $file, string $typeOrDirectory = 'avatars'): array
    {
        $directory = self::PUBLIC_TYPES[$typeOrDirectory]['directory'] ?? $typeOrDirectory;

        $fileName = $this->generateSecureFileName($file);
        $filePath = $file->storeAs($directory, $fileName, 'public');

        $url = Storage::disk('public')->url($filePath);
        $size = (int) $file->getSize();
        $mimeType = $file->getClientMimeType() ?: ($file->getMimeType() ?: 'application/octet-stream');

        return [
            'file_name' => $fileName,
            'file_path' => $filePath,
            'url' => $url,
            'file_url' => $url,
            'mime_type' => $mimeType,
            'size' => $size,
            'file_size' => $size,
        ];
    }

    /**
     * Lưu trữ tài liệu nhạy cảm vào disk local (storage/app/private).
     *
     * @return array{file_name: string, file_path: string, mime_type: string, size: int, file_size: int, is_private: bool}
     */
    public function uploadPrivateFile(UploadedFile $file, string $typeOrDirectory = 'kyc/licenses'): array
    {
        $directory = self::PRIVATE_TYPES[$typeOrDirectory]['directory'] ?? $typeOrDirectory;

        $fileName = $this->generateSecureFileName($file);
        $filePath = $file->storeAs($directory, $fileName, 'local');

        $size = (int) $file->getSize();
        $mimeType = $file->getClientMimeType() ?: ($file->getMimeType() ?: 'application/octet-stream');

        return [
            'file_name' => $fileName,
            'file_path' => $filePath,
            'mime_type' => $mimeType,
            'size' => $size,
            'file_size' => $size,
            'is_private' => true,
        ];
    }

    /**
     * Xóa file vật lý khỏi hệ thống lưu trữ để tối ưu dung lượng VPS.
     */
    public function deleteFile(?string $filePath, string $disk = 'public'): bool
    {
        if (empty($filePath)) {
            return false;
        }

        $cleanedPath = $this->cleanRelativePath($filePath);

        if (Storage::disk($disk)->exists($cleanedPath)) {
            return Storage::disk($disk)->delete($cleanedPath);
        }

        return false;
    }

    /**
     * Chuẩn hóa đường dẫn tương đối (loại bỏ URL tiền tố nếu có).
     */
    public function cleanRelativePath(string $path): string
    {
        // Nếu là URL hoàn chỉnh, trích xuất phần sau /storage/
        if (preg_match('#/storage/(.+)$#', $path, $matches)) {
            return $matches[1];
        }

        $trimmed = ltrim($path, '/');
        if (str_starts_with($trimmed, 'storage/')) {
            return substr($trimmed, 8);
        }

        return $trimmed;
    }

    /**
     * Kiểm tra và chuẩn hóa đường dẫn để chống tấn công Path Traversal.
     */
    public function validateSafePath(string $path): string
    {
        $normalized = str_replace('\\', '/', $path);

        if (str_contains($normalized, '..') || str_contains($normalized, "\0")) {
            throw new \InvalidArgumentException('Đường dẫn tệp tin không hợp lệ.');
        }

        return ltrim($normalized, '/');
    }
}
