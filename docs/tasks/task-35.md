# Task #35: Mini Mạng Xã Hội Du Lịch — Cộng Đồng Độc Lập (Threads / Instagram Vibe)

- **Epic:** Mạng Xã Hội Du Lịch (Sprint 4)
- **Branch:** `feat/#35-mini-social-travel-feed`
- **Phạm vi:** Backend (`apps/api`) + Mobile (`apps/mobile`)

---

## 1. Mục tiêu & Yêu cầu chi tiết từ Product Owner

1. **Không gian Mạng xã hội độc lập (Standalone Social Shell):**
   - Khi người dùng nhấn vào tab **Khám phá** trên thanh điều hướng Booking chính, ứng dụng chuyển sang màn hình Mạng xã hội/Cộng đồng du lịch hoàn toàn độc lập (`SocialApp` trong `RootNavigator`), ẩn thanh Footer của Booking.
   - **Header riêng:** Logo **"Social Travel Booking"** nằm chính giữa và nút **Quay lại (Back)** ở bên trái để thoát khỏi Mạng xã hội về lại màn hình Booking.
   - **Footer riêng gồm 5 tab:**
     1. **Trang chủ** (Bảng tin cộng đồng)
     2. **Tìm kiếm** (Tìm kiếm bài viết & du khách)
     3. **Tạo bài đăng** (Nút `+` mở BottomSheet tạo bài viết mới)
     4. **Hoạt động** (Thông báo tương tác: thích, bình luận, theo dõi)
     5. **Cá nhân** (Trang cá nhân MXH: thống kê, chỉnh sửa hồ sơ, bài viết của tôi & bài viết đã lưu)

2. **Giao diện Bảng tin phong cách Threads / Instagram:**
   - Ngay bên dưới Header của tab Trang chủ là thanh khởi tạo bài viết nhanh: **Ảnh đại diện** bên trái, **Tên hiển thị** bên cạnh, ngay dưới tên là dòng chữ **"Có gì mới?"** — nhấn vào sẽ mở **BottomSheet tạo bài đăng mới**.
   - Tiếp theo là danh sách bài đăng của cộng đồng theo phong cách tối giản của Threads/Instagram: Avatar + tên tài khoản (`@username`), thời gian đăng, nội dung, hashtag, hình ảnh, địa điểm check-in, gắn dịch vụ du lịch (nhấn vào mở chi tiết dịch vụ Booking), thanh tương tác (Thả tim, Bình luận, Lưu bài viết, Chia sẻ) và nút Theo dõi.

3. **Khởi tạo tài khoản Mạng xã hội riêng biệt (`social_profiles`):**
   - Mạng xã hội là phân hệ tách biệt trong ứng dụng đặt chỗ nên cần hồ sơ riêng tại bảng `social_profiles`.
   - Lần đầu tiên người dùng đã đăng nhập mở màn hình Mạng xã hội, nếu chưa có bản ghi `social_profiles` thì phải điền thông tin khởi tạo (`username`, `display_name`, `bio` tùy chọn, `avatar_url` tùy chọn).
   - Quá trình khởi tạo **kích hoạt ngay lập tức** (`users.social_active = true`), không cần Admin duyệt.

---

## 2. Hợp đồng API (`/api/v1/social` — Yêu cầu `firebase.auth`)

| Method   | Endpoint                               | Mô tả                                                                                                                                            |
| :------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/v1/social/profile/me`            | Lấy trạng thái khởi tạo & thông tin `social_profiles` của người dùng hiện tại + gợi ý `username`/`display_name`.                                 |
| `POST`   | `/api/v1/social/profile`               | Khởi tạo (lần đầu) hoặc cập nhật hồ sơ MXH (`username`, `display_name`, `bio`, `avatar_url`, `website_url`). Tự động bật `social_active = true`. |
| `GET`    | `/api/v1/social/users/{userId}`        | Xem hồ sơ MXH của một người dùng bất kỳ kèm cờ `is_following`.                                                                                   |
| `POST`   | `/api/v1/social/users/{userId}/follow` | Bật/tắt theo dõi người dùng; cập nhật `followers_count`/`following_count` và tạo thông báo `follow_user`.                                        |
| `GET`    | `/api/v1/social/posts`                 | Lấy bảng tin phân trang (`tab=for_you                                                                                                            | following | mine | saved`, `user_id`, `q`, `tag`, `per_page`). |
| `POST`   | `/api/v1/social/posts`                 | Đăng bài viết mới (`content`, `location_name`, `service_id`, `visibility`, `tags[]`, `media_urls[]`). Yêu cầu đã khởi tạo `social_profiles`.     |
| `DELETE` | `/api/v1/social/posts/{id}`            | Xóa mềm bài viết của chính chủ và giảm `posts_count`.                                                                                            |
| `POST`   | `/api/v1/social/posts/{id}/like`       | Bật/tắt thả tim bài viết; cập nhật `likes_count` và tạo thông báo `like_post`.                                                                   |
| `POST`   | `/api/v1/social/posts/{id}/save`       | Bật/tắt lưu (bookmark) bài viết.                                                                                                                 |
| `GET`    | `/api/v1/social/posts/{id}/comments`   | Lấy danh sách bình luận phân trang của bài viết.                                                                                                 |
| `POST`   | `/api/v1/social/posts/{id}/comments`   | Thêm bình luận mới; tăng `comments_count` và tạo thông báo `comment_post`.                                                                       |
| `GET`    | `/api/v1/social/search`                | Tìm kiếm đồng thời tài khoản (`social_profiles`) và bài viết (`posts`) theo từ khóa; trả về gợi ý khi từ khóa trống.                             |
| `GET`    | `/api/v1/social/activity`              | Danh sách thông báo MXH (`social_notifications`) phân trang kèm `unread_count`.                                                                  |
| `POST`   | `/api/v1/social/activity/read`         | Đánh dấu toàn bộ thông báo MXH đã đọc.                                                                                                           |

---

## 3. Checklist triển khai

### Backend (`apps/api`)

- [x] Tạo `routes/api/v1/social.php` và gắn vào `routes/api.php` dưới prefix `social` + middleware `firebase.auth`.
- [x] Tạo FormRequests: `SetupSocialProfileRequest`, `StorePostRequest`, `StoreCommentRequest`.
- [x] Xây dựng `SocialService` xử lý toàn bộ nghiệp vụ hồ sơ MXH, bảng tin, đăng/xóa bài, thả tim, lưu bài, bình luận, theo dõi, tìm kiếm và thông báo (tránh `updated_at` trên bảng pivot chỉ có `created_at`).
- [x] Tạo Controllers: `SocialProfileController`, `SocialPostController`, `SocialInteractionController`.
- [x] Viết Feature Test `SocialFeedTest` (`DatabaseTransactions`, tự khởi tạo fixtures độc lập cho CI).

### Mobile (`apps/mobile`)

- [x] Tạo `src/features/social/services/socialService.js` kết nối đầy đủ API `/social/*`.
- [x] Xây dựng `SocialOnboardingView` khởi tạo hồ sơ MXH lần đầu (không cần duyệt).
- [x] Xây dựng `CreatePostBottomSheet` soạn bài đăng mới (nội dung, địa điểm, hashtag, URL ảnh đính kèm).
- [x] Xây dựng `SocialPostCard` & `CommentsBottomSheet` theo phong cách Threads / Instagram.
- [x] Xây dựng các tab: `SocialSearchTab`, `SocialActivityTab`, `SocialProfileTab`.
- [x] Xây dựng `SocialAppScreen` độc lập với Header (`Back` + logo `"Social Travel Booking"`) + thanh `"Có gì mới?"` + Footer 5 tab riêng biệt.
- [x] Đăng ký màn hình `SocialApp` trong `RootNavigator` và điều hướng từ tab **Khám phá** của `TouristTabsNavigator`.

---

## 4. Tiêu chí nghiệm thu (Definition of Done)

- [x] Nhấn tab **Khám phá** mở giao diện Mạng xã hội độc lập, ẩn thanh điều hướng Booking; nút Back quay lại màn hình Booking mượt mà.
- [x] Người dùng chưa có `social_profiles` thấy form khởi tạo tài khoản MXH và được kích hoạt ngay sau khi điền đủ thông tin.
- [x] Trên Trang chủ MXH có khu vực `[Avatar] [Tên] / "Có gì mới?"` mở BottomSheet đăng bài; bài đăng mới xuất hiện ngay trên đầu bảng tin.
- [x] Đủ 5 tab Footer: Trang chủ, Tìm kiếm, Tạo bài đăng, Hoạt động, Cá nhân hoạt động đầy đủ dữ liệu thật từ Backend.
- [x] Backend pass `pint --test` và toàn bộ `php artisan test`; Mobile pass lint và `expo export`.
