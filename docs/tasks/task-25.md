# Task #25: Tích hợp Cổng Sepay (Tạo QR thanh toán cọc 30%)

- **EPIC:** `#24` — Cổng Thanh Toán Sepay & Vé QR
- **Sprint:** Sprint 3: Booking Engine & Cổng Thanh Toán Sepay
- **Platform:** API / Mobile (`apps/api`, `apps/mobile`)
- **Priority:** `P0` | **Estimate:** `3 Points`
- **Branch:** `feat/#25-sepay-qr-payment`

---

## 1. Mục tiêu

1. Cấu hình thông tin tài khoản ngân hàng Sepay và xây dựng `SepayService` sinh mã VietQR động kèm nội dung chuyển khoản chuẩn hóa (`STB...`) theo số tiền cọc (`deposit_amount`) của đơn.
2. Mở API tạo QR thanh toán và kiểm tra trạng thái thanh toán (hỗ trợ cả Thành viên đăng nhập và Khách vãng lai), kèm API hủy đơn cho Khách vãng lai.
3. Xây dựng màn hình `SepayPaymentScreen` trên Mobile:
   - Hiển thị mã VietQR Sepay, thông tin chuyển khoản thủ công, đếm ngược giữ chỗ 10 phút, và auto-polling kiểm tra trạng thái thanh toán.
   - Nút **Hủy đơn hàng** mở bottom-sheet chọn/nhập lý do hủy.
   - Nút **Back** hiển thị hộp thoại xác nhận thoát về thẳng **Trang chủ (`TouristMainTabs`)**.
4. Xây dựng `PendingBookingContext` (lưu `AsyncStorage`) + `FloatingPendingBookingBanner` nổi trên màn hình chính kèm bộ đếm ngược thời gian, giúp cả Khách vãng lai lẫn Thành viên quay lại màn hình thanh toán chỉ với 1 chạm.

---

## 2. Danh sách công việc

### Backend (`apps/api`)

- [x] Thêm cấu hình `sepay` vào `config/services.php` và `.env.example`.
- [x] Tạo `SepayService.php` (`createOrGetQrPayment`, `getPaymentStatus`).
- [x] Bổ sung `cancelGuestBooking` trong `BookingService.php`.
- [x] Tạo `TouristPaymentController.php` và đăng ký routes trong `tourist.php` & `public.php`.
- [x] Viết `SepayPaymentTest.php` và chạy `pint --test` + `php artisan test`.

### Frontend Mobile (`apps/mobile`)

- [x] Thêm `createSepayPayment`, `checkPaymentStatus`, `cancelGuestBooking` vào `bookingService.js`.
- [x] Tạo `PendingBookingContext.js` (lưu `AsyncStorage`) và `FloatingPendingBookingBanner.js`.
- [x] Tạo `SepayPaymentScreen.js` (QR, đếm ngược, auto-polling, Back xác nhận về Trang chủ, Hủy đơn bottom-sheet).
- [x] Cập nhật `CancelBookingModal.js` dạng bottom-sheet, nối `BookingCheckoutScreen.js`, `BookingDetailScreen.js`, `TouristTabsNavigator.js`, `RootNavigator.js`, `App.js`.
- [x] Chạy `oxlint` kiểm tra không có lỗi/cảnh báo.

---

## 3. Tiêu chuẩn nghiệm thu (DoD)

- [x] API sinh đúng URL VietQR Sepay theo `deposit_amount` và tái sử dụng bản ghi `Payment` đang `pending`.
- [x] Hỗ trợ đầy đủ cả Thành viên và Khách vãng lai (tạo QR, polling trạng thái, hủy đơn).
- [x] Mobile hiển thị thanh nổi đơn chưa thanh toán kèm đếm ngược và cho phép quay lại thanh toán 1 chạm.
- [x] Pass `pint --test`, `php artisan test` và `oxlint`.
