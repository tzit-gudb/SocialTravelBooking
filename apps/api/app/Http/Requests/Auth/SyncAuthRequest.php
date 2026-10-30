<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncAuthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firebase_uid' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:6', 'max:100'],
            'displayName' => ['nullable', 'string', 'min:2', 'max:100'],
            'display_name' => ['nullable', 'string', 'min:2', 'max:100'],
            'avatarUrl' => ['nullable', 'string', 'max:2048'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            // Không cho phép client tự truyền role = admin khi đăng ký mới để chống leo thang đặc quyền
            'role' => ['nullable', 'string', Rule::in(['tourist', 'provider'])],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{8,20}$/'],
            'business_name' => ['nullable', 'string', 'min:2', 'max:255'],
            'business_type' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'displayName.min' => 'Tên hiển thị phải có ít nhất 2 ký tự.',
            'display_name.min' => 'Tên hiển thị phải có ít nhất 2 ký tự.',
            'role.in' => 'Vai trò đăng ký chỉ chấp nhận Khách du lịch (tourist) hoặc Nhà cung cấp (provider).',
            'phone.regex' => 'Số điện thoại không đúng định dạng.',
            'business_name.min' => 'Tên thương hiệu / đơn vị phải có ít nhất 2 ký tự.',
        ];
    }
}
