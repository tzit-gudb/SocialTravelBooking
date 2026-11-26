# Task #31 (EPIC #31): Đánh giá Dịch vụ (Review & Rating) & Phản hồi từ Nhà cung cấp

- **EPIC:** `#31` — Đánh giá Dịch vụ (Review & Rating)
- **Sprint:** Sprint 4: Escrow Quyết Toán, Đánh Giá & Mini Social Feed
- **Platform:** API / Mobile / Web (`apps/api`, `apps/mobile`, `apps/web`)
- **Priority:** `P0` | **Estimate:** `3 Points`
- **Module:** `Booking` | **Role:** `user`, `provider`
- **Branch:** `feat/#31-service-review-rating`

---

## 1. Mục tiêu

Hoàn thiện chu trình trải nghiệm sau chuyến đi cho Du khách và Nhà cung cấp dịch vụ:

1. **Gửi đánh giá từ Du khách (Mobile):** Sau khi đơn đặt chỗ đã `checked_in` hoặc `completed`, Du khách có thể chấm điểm `1 - 5 sao` và viết nhận xét cho dịch vụ ngay từ màn hình Chi tiết đơn (`BookingDetailScreen`), mỗi đơn chỉ đánh giá tối đa 1 lần.
2. **Tự động cập nhật điểm trung bình dịch vụ (`services.rating_avg`):** Khi có đánh giá mới, hệ thống tự tính lại điểm trung bình và số lượt đánh giá của dịch vụ một cách đồng bộ (transaction + row lock).
3. **Quản lý & Phản hồi đánh giá cho Nhà cung cấp dịch vụ (`/provider/reviews` trên Web):** Xem thống kê đánh giá, lọc theo trạng thái phản hồi / số sao, gửi hoặc cập nhật `provider_reply`.
4. **Realtime cập nhật đánh giá & phản hồi:** Phát sự kiện `ReviewUpdated` qua Laravel Reverb lên `service.{serviceId}.reviews` và `provider.{providerId}.reviews`.

---

## 2. Danh sách công việc

### Backend (`apps/api`)

- [x] Tạo `StoreReviewRequest.php` validate `rating` (1–5), `content`, `images`.
- [x] Tạo `ReviewUpdated.php` broadcast event (`ShouldBroadcastNow`).
- [x] Tạo `ReviewService.php` xử lý `createReviewForBooking`, `listPublicServiceReviews`, `listProviderReviews`, `replyByProvider` và tính lại `services.rating_avg`.
- [x] Tạo `TouristReviewController.php` (`POST /api/v1/tourist/bookings/{id}/review`).
- [x] Tạo `ProviderReviewController.php` (`GET /api/v1/provider/reviews`, `POST /api/v1/provider/reviews/{id}/reply`).
- [x] Thêm `PublicServiceController::reviews()` (`GET /api/v1/public/services/{id}/reviews`).
- [x] Viết `ReviewRatingTest.php` (`DatabaseTransactions`) và chạy `pint --test` + `php artisan test`.

### Frontend Mobile (`apps/mobile`)

- [x] Thêm `submitReview(bookingId, payload)` vào `bookingService.js`.
- [x] Tạo `ReviewModal.js` (chọn 1–5 sao, nhập nhận xét, validate).
- [x] Cập nhật `BookingDetailScreen.js` (nút **Đánh giá dịch vụ** cho đơn `checked_in`/`completed` chưa đánh giá, hiển thị đánh giá đã gửi + phản hồi từ Nhà cung cấp).
- [x] Cập nhật `BookingCard.js` (huy hiệu trạng thái đánh giá) và `ServiceDetailScreen.js` (lắng nghe Echo realtime đánh giá mới).

### Frontend Web (`apps/web`)

- [x] Tạo `providerReviewApi.js`.
- [x] Xây dựng `ProviderReviewsPage.jsx` tại `/provider/reviews` (KPI tổng quan, bộ lọc chưa phản hồi / số sao, tìm kiếm URL, form gửi/sửa phản hồi & Realtime Echo).
- [x] Đăng ký `/provider/reviews` trong `AppRouter.jsx`.
- [x] Chạy `oxlint` và `pnpm run build:web`.

---

## 3. Tiêu chuẩn nghiệm thu (DoD)

- [x] Chỉ chủ đơn có trạng thái `checked_in` hoặc `completed` mới được gửi đánh giá; mỗi đơn chỉ đánh giá 1 lần.
- [x] Điểm `services.rating_avg` tự động cập nhật chính xác sau mỗi đánh giá mới.
- [x] Nhà cung cấp xem và phản hồi đúng đánh giá thuộc dịch vụ của mình; hiển thị rõ phản hồi trên Mobile `ServiceDetailReviews` & `BookingDetailScreen`.
- [x] Pass `pint --test`, `php artisan test`, `oxlint` và `pnpm run build:web`.
