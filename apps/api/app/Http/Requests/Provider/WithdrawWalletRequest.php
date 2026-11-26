<?php

namespace App\Http\Requests\Provider;

use Illuminate\Foundation\Http\FormRequest;

class WithdrawWalletRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:50000', 'max:500000000'],
            'bank_account_id' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'Vui lòng nhập số tiền cần rút.',
            'amount.numeric' => 'Số tiền rút phải là một số hợp lệ.',
            'amount.min' => 'Số tiền rút tối thiểu là 50.000đ.',
            'amount.max' => 'Số tiền rút tối đa mỗi lần là 500.000.000đ.',
            'bank_account_id.required' => 'Vui lòng chọn tài khoản ngân hàng nhận tiền.',
        ];
    }
}
