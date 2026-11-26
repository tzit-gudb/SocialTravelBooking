<?php

namespace App\Http\Requests\Social;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'location_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'service_id' => ['sometimes', 'nullable', 'integer', 'exists:services,id'],
            'visibility' => ['sometimes', 'string', 'in:public,followers,private'],
            'tags' => ['sometimes', 'nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'content.max' => 'Nội dung bài đăng không được vượt quá 2000 ký tự.',
            'service_id.exists' => 'Dịch vụ được gắn không tồn tại.',
            'visibility.in' => 'Quyền hiển thị bài đăng không hợp lệ.',
        ];
    }
}
