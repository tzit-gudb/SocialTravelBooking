<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RejectKycRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Quy tắc xác thực lý do từ chối hồ sơ đối tác (bắt buộc, tối thiểu 10 ký tự).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'min:10', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'Vui lòng nhập lý do từ chối hồ sơ đối tác.',
            'rejection_reason.string' => 'Lý do từ chối phải là chuỗi văn bản.',
            'rejection_reason.min' => 'Lý do từ chối tối thiểu 10 ký tự để đối tác nắm rõ nguyên nhân.',
            'rejection_reason.max' => 'Lý do từ chối không được vượt quá 1000 ký tự.',
        ];
    }
}
