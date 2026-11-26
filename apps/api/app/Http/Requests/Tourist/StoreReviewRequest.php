<?php

namespace App\Http\Requests\Tourist;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
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
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'cleanliness_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'service_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'location_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'value_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'content' => ['nullable', 'string', 'max:2000'],
            'pros' => ['nullable', 'string', 'max:1000'],
            'cons' => ['nullable', 'string', 'max:1000'],
            'is_recommended' => ['nullable', 'boolean'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rating.required' => 'Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao).',
            'rating.integer' => 'Điểm đánh giá phải là số nguyên từ 1 đến 5.',
            'rating.min' => 'Điểm đánh giá tối thiểu là 1 sao.',
            'rating.max' => 'Điểm đánh giá tối đa là 5 sao.',
            'content.max' => 'Nội dung nhận xét không được vượt quá 2000 ký tự.',
            'pros.max' => 'Mục điểm hài lòng không được vượt quá 1000 ký tự.',
            'cons.max' => 'Mục điểm cần cải thiện không được vượt quá 1000 ký tự.',
            'images.max' => 'Chỉ được đính kèm tối đa 5 hình ảnh.',
        ];
    }
}
