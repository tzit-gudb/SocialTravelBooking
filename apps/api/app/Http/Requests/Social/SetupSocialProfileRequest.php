<?php

namespace App\Http\Requests\Social;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SetupSocialProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('username') && is_string($this->input('username'))) {
            $cleaned = strtolower(trim($this->input('username')));
            $cleaned = ltrim($cleaned, '@');
            $this->merge(['username' => $cleaned]);
        }

        if ($this->has('display_name') && is_string($this->input('display_name'))) {
            $this->merge(['display_name' => trim($this->input('display_name'))]);
        }
    }

    public function rules(): array
    {
        $user = $this->user() ?? $this->attributes->get('userModel');
        $existingProfileId = $user?->socialProfile?->id;

        return [
            'username' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-z0-9._]+$/',
                Rule::unique('social_profiles', 'username')->ignore($existingProfileId),
            ],
            'display_name' => ['required', 'string', 'min:2', 'max:100'],
            'bio' => ['nullable', 'string', 'max:300'],
            'avatar_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/storage\/)/i'],
            'cover_photo_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/storage\/)/i'],
            'website_url' => ['nullable', 'url', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'username.required' => 'Vui lòng nhập tên người dùng (username).',
            'username.min' => 'Tên người dùng cần tối thiểu 3 ký tự.',
            'username.max' => 'Tên người dùng không được vượt quá 50 ký tự.',
            'username.regex' => 'Tên người dùng chỉ gồm chữ thường không dấu, số, dấu chấm hoặc gạch dưới.',
            'username.unique' => 'Tên người dùng này đã có người sử dụng, vui lòng chọn tên khác.',
            'display_name.required' => 'Vui lòng nhập tên hiển thị trên mạng xã hội.',
            'display_name.min' => 'Tên hiển thị cần tối thiểu 2 ký tự.',
            'display_name.max' => 'Tên hiển thị không được vượt quá 100 ký tự.',
            'bio.max' => 'Tiểu sử không được vượt quá 300 ký tự.',
            'avatar_url.regex' => 'Đường dẫn ảnh đại diện chưa hợp lệ.',
            'website_url.url' => 'Đường dẫn liên kết cá nhân chưa hợp lệ.',
        ];
    }
}
