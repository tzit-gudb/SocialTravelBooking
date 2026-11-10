<?php

namespace App\Http\Requests\Provider;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SubmitKycRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for Provider KYC submission.
     * Supports up to 5 license images OR 1 PDF document.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'business_name' => ['required', 'string', 'min:3', 'max:255'],
            'representative_name' => ['required', 'string', 'min:2', 'max:255'],
            'business_type_id' => ['nullable', 'integer', 'exists:business_types,id'],
            'business_type' => ['nullable', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{8,20}$/'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'business_license' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:10240'],
            'business_licenses' => ['nullable', 'array', 'max:5'],
            'business_licenses.*' => ['file', 'mimes:jpeg,jpg,png,webp,pdf', 'max:10240'],
            'business_license_url' => ['nullable'],
        ];
    }

    public function messages(): array
    {
        return [
            'business_name.required' => 'Vui lòng nhập tên thương mại công ty hoặc cơ sở du lịch.',
            'business_name.min' => 'Tên doanh nghiệp tối thiểu 3 ký tự.',
            'business_name.max' => 'Tên doanh nghiệp không được vượt quá 255 ký tự.',
            'representative_name.required' => 'Vui lòng nhập họ tên người đại diện pháp luật hoặc quản lý cơ sở.',
            'representative_name.min' => 'Họ tên người đại diện tối thiểu 2 ký tự.',
            'representative_name.max' => 'Họ tên người đại diện không được vượt quá 255 ký tự.',
            'business_type_id.exists' => 'Loại hình kinh doanh được chọn không tồn tại trên hệ thống.',
            'phone.required' => 'Vui lòng nhập số điện thoại hoặc hotline hỗ trợ khách hàng.',
            'phone.regex' => 'Số điện thoại không hợp lệ (từ 8 đến 20 ký tự số).',
            'phone.max' => 'Số điện thoại không được vượt quá 20 ký tự.',
            'address.required' => 'Vui lòng nhập địa chỉ cơ sở kinh doanh.',
            'address.max' => 'Địa chỉ không được vượt quá 500 ký tự.',
            'city.max' => 'Tỉnh/Thành phố không được vượt quá 100 ký tự.',
            'description.max' => 'Mô tả không được vượt quá 2000 ký tự.',
            'business_license.file' => 'Giấy phép kinh doanh phải là tệp tin hợp lệ.',
            'business_license.mimes' => 'Giấy phép kinh doanh phải có định dạng JPEG, PNG, WEBP hoặc PDF.',
            'business_license.max' => 'Dung lượng tệp giấy phép kinh doanh tối đa 10MB.',
            'business_licenses.max' => 'Chỉ được tải lên tối đa 5 ảnh giấy phép kinh doanh.',
            'business_licenses.*.mimes' => 'Mỗi tệp giấy phép kinh doanh phải có định dạng JPEG, PNG, WEBP hoặc PDF.',
            'business_licenses.*.max' => 'Dung lượng mỗi tệp giấy phép tối đa 10MB.',
        ];
    }

    /**
     * Cross-field validation: ensures either 1 PDF or up to 5 images.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            // Require either business_type_id or business_type name
            if (! $this->filled('business_type_id') && ! $this->filled('business_type')) {
                $validator->errors()->add('business_type_id', 'Vui lòng chọn hoặc nhập loại hình kinh doanh chính.');
            }

            $hasSingleFile = $this->hasFile('business_license');
            $hasMultipleFiles = $this->hasFile('business_licenses');
            $hasLicenseUrl = $this->filled('business_license_url');

            if (! $hasSingleFile && ! $hasMultipleFiles && ! $hasLicenseUrl) {
                $validator->errors()->add(
                    'business_license',
                    'Vui lòng tải lên tài liệu hoặc ảnh giấy phép kinh doanh / chứng chỉ hành nghề lữ hành.'
                );

                return;
            }

            // Validate file count and formats when uploading files
            if ($hasMultipleFiles) {
                $files = (array) $this->file('business_licenses');
                $pdfCount = 0;
                $imageCount = 0;

                foreach ($files as $file) {
                    $ext = strtolower($file->getClientOriginalExtension());
                    if ($ext === 'pdf') {
                        $pdfCount++;
                    } else {
                        $imageCount++;
                    }
                }

                if ($pdfCount > 0 && ($pdfCount > 1 || $imageCount > 0)) {
                    $validator->errors()->add(
                        'business_licenses',
                        'Chỉ cho phép tải lên tối đa 1 tệp tin PDF HOẶC tối đa 5 ảnh giấy phép kinh doanh.'
                    );
                }

                if ($imageCount > 5) {
                    $validator->errors()->add(
                        'business_licenses',
                        'Chỉ cho phép tải lên tối đa 5 ảnh giấy phép kinh doanh.'
                    );
                }
            }

            // Validate when client sends URL or JSON array of URLs
            if ($hasLicenseUrl) {
                $rawUrls = $this->input('business_license_url');
                if (is_string($rawUrls) && str_starts_with($rawUrls, '[') && str_ends_with($rawUrls, ']')) {
                    $urls = json_decode($rawUrls, true) ?: [];
                } elseif (is_array($rawUrls)) {
                    $urls = $rawUrls;
                } else {
                    $urls = [$rawUrls];
                }

                foreach ($urls as $item) {
                    if (is_string($item) && str_starts_with(trim($item), 'blob:')) {
                        $validator->errors()->add(
                            'business_license_url',
                            'Đường dẫn tạm (blob URL) từ trình duyệt không hợp lệ trên máy chủ. Vui lòng tải lên tệp tin trực tiếp hoặc cung cấp URL hợp lệ.'
                        );
                        break;
                    }
                }

                if (count($urls) > 5) {
                    $validator->errors()->add(
                        'business_license_url',
                        'Chỉ cho phép tải lên tối đa 5 ảnh giấy phép kinh doanh.'
                    );
                }

                $pdfUrls = array_filter($urls, fn ($u) => is_string($u) && (str_contains($u, '.pdf') || str_contains($u, 'data:application/pdf')));
                if (count($pdfUrls) > 0 && (count($pdfUrls) > 1 || count($urls) > 1)) {
                    $validator->errors()->add(
                        'business_license_url',
                        'Chỉ cho phép tải lên tối đa 1 tệp tin PDF HOẶC tối đa 5 ảnh giấy phép kinh doanh.'
                    );
                }
            }
        });
    }
}
