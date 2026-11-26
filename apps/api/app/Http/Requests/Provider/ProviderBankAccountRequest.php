<?php

namespace App\Http\Requests\Provider;

use Illuminate\Foundation\Http\FormRequest;

class ProviderBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'bank_code' => ['required', 'string', 'max:20'],
            'bank_name' => ['required', 'string', 'max:100'],
            'account_number' => ['required', 'string', 'min:5', 'max:50', 'regex:/^[A-Za-z0-9]+$/'],
            'account_holder' => ['required', 'string', 'min:2', 'max:120'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'bank_code.required' => 'Vui lòng chọn ngân hàng thụ hưởng.',
            'bank_name.required' => 'Vui lòng chọn tên ngân hàng thụ hưởng.',
            'account_number.required' => 'Vui lòng nhập số tài khoản ngân hàng.',
            'account_number.regex' => 'Số tài khoản chỉ được chứa chữ số hoặc ký tự liền mạch không dấu cách.',
            'account_holder.required' => 'Vui lòng nhập tên chủ tài khoản ngân hàng.',
        ];
    }
}
