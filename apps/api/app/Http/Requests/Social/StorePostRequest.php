<?php

namespace App\Http\Requests\Social;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'min:1', 'max:2000'],
            'location_name' => ['nullable', 'string', 'max:255'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'visibility' => ['nullable', 'string', 'in:public,followers,private'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
            'media_urls' => ['nullable', 'array', 'max:6'],
            'media_urls.*' => ['url', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'content.required' => 'Vui lòng nhập nội dung bài đăng.',
            'content.max' => 'Nội dung bài đăng không được vượt quá 2000 ký tự.',
            'service_id.exists' => 'Dịch vụ được gắn không tồn tại.',
            'media_urls.max' => 'Bạn chỉ có thể đính kèm tối đa 6 hình ảnh.',
            'media_urls.*.url' => 'Đường dẫn hình ảnh đính kèm không hợp lệ.',
        ];
    }
}
