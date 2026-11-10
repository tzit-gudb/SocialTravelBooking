<?php

namespace App\Http\Requests\Media;

use App\Services\MediaService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadPrivateMediaRequest extends FormRequest
{
    /**
     * Xác định người dùng có quyền thực hiện yêu cầu hay không.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Quy tắc xác thực dữ liệu đầu vào cho tài liệu nhạy cảm.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $allowedTypes = array_keys(MediaService::PRIVATE_TYPES);

        return [
            'type' => ['required', 'string', Rule::in($allowedTypes)],
            'file' => [
                'required',
                'file',
                'mimes:jpeg,jpg,png,webp,pdf',
                'max:10240', // 10MB
            ],
        ];
    }

    /**
     * Thông báo lỗi tùy chỉnh bằng tiếng Việt.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Vui lòng xác định loại tài liệu bảo mật tải lên (type).',
            'type.in' => 'Loại tài liệu bảo mật không hợp lệ.',
            'file.required' => 'Vui lòng chọn tài liệu cần tải lên.',
            'file.file' => 'Dữ liệu tải lên phải là một tệp tin hợp lệ.',
            'file.mimes' => 'Định dạng tài liệu không được hỗ trợ. Chỉ chấp nhận JPG, JPEG, PNG, WEBP hoặc PDF.',
            'file.max' => 'Dung lượng tài liệu không được vượt quá 10MB.',
        ];
    }
}
