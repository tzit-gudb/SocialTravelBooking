<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeAndValidateRequestMiddleware
{
    /**
     * Danh sách các trường mật khẩu không được can thiệp nội dung.
     *
     * @var array<int, string>
     */
    protected array $except = [
        'password',
        'password_confirmation',
        'current_password',
    ];

    /**
     * Kiểm duyệt, làm sạch và chuẩn hóa dữ liệu từ Client gửi lên Server.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Ép buộc response trả về định dạng JSON chuẩn cho mọi API
        $request->headers->set('Accept', 'application/json');

        // 2. Kiểm tra kích thước payload (chặn payload quá lớn bất thường > 10MB trên API JSON)
        $contentLength = (int) $request->header('Content-Length', 0);
        if ($contentLength > 10 * 1024 * 1024) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu gửi lên vượt quá dung lượng cho phép (tối đa 10MB).',
            ], 413);
        }

        // 3. Làm sạch đệ quy toàn bộ input từ body và query
        $input = $request->all();
        if (! empty($input)) {
            $sanitized = $this->sanitizeArray($input);
            $request->replace($sanitized);
        }

        return $next($request);
    }

    /**
     * Làm sạch mảng dữ liệu đệ quy.
     */
    private function sanitizeArray(array $data): array
    {
        $cleaned = [];

        foreach ($data as $key => $value) {
            if (in_array($key, $this->except, true)) {
                $cleaned[$key] = $value;

                continue;
            }

            if (is_array($value)) {
                $cleaned[$key] = $this->sanitizeArray($value);
            } elseif (is_string($value)) {
                $cleaned[$key] = $this->cleanString($key, $value);
            } else {
                $cleaned[$key] = $value;
            }
        }

        return $cleaned;
    }

    /**
     * Xử lý chuỗi: xóa ký tự null byte, loại bỏ script độc hại và chuẩn hóa định dạng.
     */
    private function cleanString(string $key, string $value): string
    {
        // Xóa null bytes
        $value = str_replace("\0", '', $value);

        // Loại bỏ các thẻ <script>, <iframe> và thuộc tính sự kiện inline nguy hiểm (XSS)
        $value = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $value) ?? $value;
        $value = preg_replace('/<iframe\b[^>]*>(.*?)<\/iframe>/is', '', $value) ?? $value;
        $value = preg_replace('/javascript\s*:/i', '', $value) ?? $value;

        // Cắt khoảng trắng thừa ở 2 đầu
        $value = trim($value);

        // Chuẩn hóa email về chữ thường
        if ($key === 'email') {
            $value = strtolower($value);
        }

        // Chuẩn hóa số điện thoại (xóa khoảng trắng và dấu gạch ngang)
        if (in_array($key, ['phone', 'phone_number', 'contact_phone'], true)) {
            $value = preg_replace('/[\s\-]+/', '', $value) ?? $value;
        }

        return $value;
    }
}
