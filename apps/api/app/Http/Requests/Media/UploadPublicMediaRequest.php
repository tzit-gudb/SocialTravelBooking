<?php

namespace App\Http\Requests\Media;

use App\Services\MediaService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UploadPublicMediaRequest extends FormRequest
{
    /**
     * Xác định người dùng có quyền thực hiện yêu cầu hay không.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Quy tắc xác thực dữ liệu đầu vào.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $allowedTypes = array_keys(MediaService::PUBLIC_TYPES);

        return [
            'type' => ['required', 'string', Rule::in($allowedTypes)],
            'file' => [
                'nullable',
                'file',
                'mimes:jpeg,jpg,png,webp',
                'max:5120',
                'required_without:files',
            ],
            'files' => [
                'nullable',
                'array',
                'required_without:file',
            ],
            'files.*' => [
                'file',
                'mimes:jpeg,jpg,png,webp',
                'max:5120',
            ],
        ];
    }

    /**
     * Bổ sung kiểm tra logic động theo từng loại tệp tin sau khi qua bước validation cơ bản.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $type = $this->input('type');
            if (! isset(MediaService::PUBLIC_TYPES[$type])) {
                return;
            }

            $maxKb = MediaService::PUBLIC_TYPES[$type]['max_size'];

            // Kiểm tra dung lượng file đơn
            if ($this->hasFile('file')) {
                $file = $this->file('file');
                if ($file->getSize() > $maxKb * 1024) {
                    $v->errors()->add(
                        'file',
                        'Tệp tin vượt quá dung lượng tối đa cho phép ('.($maxKb / 1024).'MB).'
                    );
                }
            }

            // Kiểm tra dung lượng mảng file
            if ($this->hasFile('files')) {
                foreach ($this->file('files') as $index => $file) {
                    if ($file->getSize() > $maxKb * 1024) {
                        $v->errors()->add(
                            "files.{$index}",
                            'Tệp tin tại vị trí '.($index + 1).' vượt quá dung lượng tối đa cho phép ('.($maxKb / 1024).'MB).'
                        );
                    }
                }
            }
        });
    }

    /**
     * Thông báo lỗi tùy chỉnh bằng tiếng Việt.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Vui lòng xác định loại tài nguyên tải lên (type).',
            'type.in' => 'Loại tài nguyên không hợp lệ.',
            'file.required_without' => 'Vui lòng chọn tệp tin cần tải lên.',
            'files.required_without' => 'Vui lòng chọn danh sách tệp tin cần tải lên.',
            'file.file' => 'Dữ liệu tải lên phải là một tệp tin hợp lệ.',
            'file.mimes' => 'Định dạng tệp tin không được hỗ trợ. Chỉ chấp nhận JPG, JPEG, PNG, WEBP.',
            'file.max' => 'Dung lượng tệp tin không được vượt quá 5MB.',
            'files.*.file' => 'Mỗi phần tử tải lên phải là một tệp tin hợp lệ.',
            'files.*.mimes' => 'Định dạng tệp tin trong danh sách không được hỗ trợ. Chỉ chấp nhận JPG, JPEG, PNG, WEBP.',
            'files.*.max' => 'Dung lượng từng tệp tin trong album không được vượt quá 5MB.',
        ];
    }
}
