# Task #34: Tạo Bài Viết Trải Nghiệm (Nội Dung, Upload Ảnh, Tag Địa Điểm)

- **Epic:** #33 — Mạng Xã Hội Du Lịch (Mini Travel Feed, Sprint 4)
- **Branch:** `feat/#34-create-travel-post`
- **Phạm vi:** Backend (`apps/api`) + Mobile (`apps/mobile`)

---

## 1. Mục tiêu

Hoàn thiện luồng tạo và quản lý bài viết trải nghiệm du lịch trên Mobile theo phong cách Threads / Instagram:

1. **Soạn thảo nội dung & Hashtag:** Hỗ trợ viết nội dung trải nghiệm (hoặc đăng bài ảnh không cần nội dung dài), tự động tách `#hashtag`.
2. **Upload nhiều ảnh thật từ thiết bị:** Chọn tối đa 6 ảnh từ thư viện máy hoặc chụp ảnh trực tiếp bằng Camera (`expo-image-picker`), xem trước ngang, xóa từng ảnh, tải lên `POST /api/v1/media/upload` (`type=post`) và lưu vào `post_media`.
3. **Tag địa điểm thông minh:** Gợi ý & tìm kiếm danh sách điểm đến từ hệ thống (`GET /api/v1/public/locations`) hoặc nhập tên địa điểm check-in tùy chỉnh, hiển thị dạng chip trên bài viết.
4. **Gắn dịch vụ du lịch đã trải nghiệm:** Tìm kiếm & gắn dịch vụ Tour/Khách sạn/Homestay/Xe (`GET /api/v1/public/services`) vào bài viết (`service_id`, `service_type`) để người đọc có thể bấm xem chi tiết đặt chỗ.
5. **Quyền riêng tư & Chỉnh sửa bài viết:** Cho phép chọn quyền hiển thị (`public` / `followers` / `private`) khi đăng và cập nhật bài viết qua `PUT /api/v1/social/posts/{id}`.

---

## 2. Hợp đồng API bổ sung / nâng cấp

| Method | Endpoint                                        | Mô tả                                                                                                                                                                                    |
| :----- | :---------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/media/upload` (`type=post`, `files[]`) | Tải lên 1 hoặc nhiều ảnh bài viết (tối đa 5MB/ảnh, JPG/PNG/WEBP), trả về mảng `{ url, path }`.                                                                                           |
| `POST` | `/api/v1/social/posts`                          | Nâng cấp: cho phép đăng bài chỉ có ảnh (`content` `required_without:media_urls`), hỗ trợ `latitude`, `longitude`, `visibility`, `service_id`, `location_name`, `tags[]`, `media_urls[]`. |
| `PUT`  | `/api/v1/social/posts/{id}`                     | Cập nhật nội dung, địa điểm, dịch vụ gắn kèm, hashtag và quyền riêng tư cho bài viết của chính chủ.                                                                                      |
| `GET`  | `/api/v1/public/locations`                      | Danh sách điểm đến gợi ý khi tag địa điểm.                                                                                                                                               |
| `GET`  | `/api/v1/public/services?q=...`                 | Tìm kiếm dịch vụ du lịch đang hoạt động để gắn vào bài viết.                                                                                                                             |

---

## 3. Checklist triển khai

### Backend (`apps/api`)

- [x] Nâng cấp `StorePostRequest`: hỗ trợ `content` `required_without:media_urls`, `latitude`, `longitude`.
- [x] Tạo `UpdatePostRequest` và thêm `updatePost` trong `SocialService` + endpoint `PUT /api/v1/social/posts/{id}`.
- [x] Bổ sung kiểm thử PHPUnit cho luồng upload nhiều ảnh `type=post` -> tạo bài ảnh gắn địa điểm & dịch vụ -> chỉnh sửa bài viết (và chặn người khác sửa `403`).

### Mobile (`apps/mobile`)

- [x] Bổ sung `uploadPostImages`, `getLocations`, `searchServices`, `updatePost` trong `socialService.js`.
- [x] Nâng cấp `CreatePostBottomSheet.js`: chọn nhiều ảnh từ thư viện, chụp ảnh Camera, preview ngang kèm nút xóa, trình chọn địa điểm thông minh (gợi ý + nhập tùy chỉnh), trình gắn dịch vụ du lịch, chọn quyền riêng tư (`public`/`followers`/`private`), trạng thái tải ảnh & đăng bài rõ ràng.
- [x] Chuẩn hóa URL ảnh bài viết qua `resolveMediaUrl` và hiển thị nhãn quyền riêng tư trong `SocialPostCard.js`.

---

## 4. Tiêu chí nghiệm thu (Definition of Done)

- [x] Người dùng chọn ảnh từ máy hoặc chụp ảnh, xem trước, xóa ảnh và đăng bài thành công; ảnh hiển thị đúng trên bảng tin.
- [x] Có thể chọn nhanh địa điểm gợi ý hoặc nhập địa điểm check-in tùy chỉnh, gắn kèm dịch vụ du lịch và chọn quyền riêng tư.
- [x] Backend pass `pint --test` và toàn bộ `php artisan test`; Mobile pass `oxlint` (0 errors, 0 warnings) và `expo export`.
