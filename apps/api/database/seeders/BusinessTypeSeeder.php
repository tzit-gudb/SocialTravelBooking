<?php

namespace Database\Seeders;

use App\Models\BusinessType;
use Illuminate\Database\Seeder;

class BusinessTypeSeeder extends Seeder
{
    /**
     * Dữ liệu khởi tạo cho các loại hình doanh nghiệp đối tác (Provider).
     */
    public function run(): void
    {
        $types = [
            // Nhóm: Chỗ ở
            [
                'type' => 'Chỗ ở',
                'name' => 'Khách sạn',
                'slug' => 'khach-san',
            ],
            [
                'type' => 'Chỗ ở',
                'name' => 'Homestay & Villa',
                'slug' => 'homestay-villa',
            ],
            [
                'type' => 'Chỗ ở',
                'name' => 'Resort',
                'slug' => 'resort',
            ],

            // Nhóm: Giải trí
            [
                'type' => 'Giải trí',
                'name' => 'Tour du lịch & Trải nghiệm',
                'slug' => 'tour-du-lich-trai-nghiem',
            ],

            // Nhóm: Phương tiện
            [
                'type' => 'Phương tiện',
                'name' => 'Phương tiện di chuyển',
                'slug' => 'phuong-tien-di-chuyen',
            ],
            [
                'type' => 'Phương tiện',
                'name' => 'Vé tàu',
                'slug' => 've-tau',
            ],

            // Nhóm: Ăn uống
            [
                'type' => 'Ăn uống',
                'name' => 'Nhà hàng & Ẩm thực',
                'slug' => 'nha-hang-am-thuc',
            ],
        ];

        foreach ($types as $item) {
            BusinessType::updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'type' => $item['type'],
                    'name' => $item['name'],
                ]
            );
        }
    }
}
