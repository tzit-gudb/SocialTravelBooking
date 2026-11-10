<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Dữ liệu khởi tạo cho các chủ đề / danh mục trải nghiệm của dịch vụ.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Biển đảo & Lặn ngắm san hô',
                'slug' => 'bien-dao-lan-ngam-san-ho',
                'icon' => 'waves',
                'description' => 'Tour và dịch vụ trải nghiệm biển, đảo, lặn ngắm san hô, cano ngắm vịnh.',
            ],
            [
                'name' => 'Trekking, Cắm trại & Săn mây',
                'slug' => 'trekking-cam-trai-san-may',
                'icon' => 'mountain',
                'description' => 'Chinh phục các cung đường trekking, cắm trại glamping và săn mây thiên nhiên.',
            ],
            [
                'name' => 'Food Tour & Ẩm thực đường phố',
                'slug' => 'food-tour-am-thuc-duong-pho',
                'icon' => 'utensils',
                'description' => 'Khám phá văn hóa ẩm thực địa phương, chợ đêm và món ngon truyền thống.',
            ],
            [
                'name' => 'Văn hóa, Lịch sử & Tâm linh',
                'slug' => 'van-hoa-lich-su-tam-linh',
                'icon' => 'landmark',
                'description' => 'Thăm quan di tích lịch sử, phố cổ, đền chùa và làng nghề truyền thống.',
            ],
            [
                'name' => 'Nghỉ dưỡng & Chữa lành (Wellness)',
                'slug' => 'nghi-duong-chua-lanh-wellness',
                'icon' => 'heart-pulse',
                'description' => 'Trải nghiệm suối khoáng nóng onsen, spa, yoga và không gian thanh tịnh.',
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(
                ['slug' => $cat['slug']],
                [
                    'name' => $cat['name'],
                    'icon' => $cat['icon'],
                    'description' => $cat['description'],
                ]
            );
        }
    }
}
