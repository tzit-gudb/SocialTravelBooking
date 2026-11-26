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
            'content' => ['nullable', 'string', 'max:2000', 'required_without:media_urls'],
            'location_name' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'visibility' => ['nullable', 'string', 'in:public,followers,private'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
            'media_urls' => ['nullable', 'array', 'max:6'],
            'media_urls.*' => ['string', 'max:1000', 'regex:/^(https?:\/\/|\/storage\/)/i'],
        ];
    }

    public function messages(): array
    {
        return [
            'content.required_without' => 'Vui lòng nhập nội dung bài đăng hoặc đính kèm ít nhất 1 hình ảnh.',
            'content.max' => 'Nội dung bài đăng không được vượt quá 2000 ký tự.',
            'service_id.exists' => 'Dịch vụ được gắn không tồn tại.',
            'media_urls.max' => 'Bạn chỉ có thể đính kèm tối đa 6 hình ảnh.',
            'media_urls.*.regex' => 'Đường dẫn hình ảnh đính kèm không hợp lệ.',
        ];
    }
}
