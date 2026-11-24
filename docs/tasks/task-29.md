# Task #29: Check-in quét QR / User xác nhận -> Tự động giải phóng tiền cọc vào ví

- **EPIC:** `#28` — Cơ chế Ký quỹ Escrow & Ví Provider
- **Sprint:** Sprint 4: Escrow Quyết Toán, Đánh Giá & Mini Social Feed
- **Platform:** API / Web / Mobile (`apps/api`, `apps/web`, `apps/mobile`)
- **Priority:** `P0` | **Estimate:** `3 Points`
- **Branch:** `feat/#29-escrow-qr-checkin`

---

## 1. Mục tiêu

1. **Ký quỹ Escrow khi thanh toán:** Khi Webhook Sepay xác nhận đơn `confirmed`, tự động cộng `deposit_amount` vào `wallets.locked_balance` của Nhà cung cấp.
2. **Giải phóng tiền cọc vào ví khả dụng (`balance`):**
   - Khi **Nhà cung cấp quét mã QR Check-in** (`POST /api/v1/provider/bookings/check-in`) hoặc **Du khách tự xác nhận đã nhận dịch vụ** (`POST /api/v1/tourist/bookings/{id}/confirm-checkin`):
   - Chuyển trạng thái đơn sang `checked_in`, ghi nhận `checked_in_at`.
   - Giải phóng `deposit_amount` từ `locked_balance` sang `balance` và ghi log `WalletTransaction` (`type = 'booking_payment'`, chống giải ngân trùng lặp).
3. **Trang Đối soát vé QR Check-in cho Nhà cung cấp (`/provider/qr-checkin` trên Web Responsive/PWA):**
   - Hỗ trợ quét trực tiếp bằng **Camera sau điện thoại / Webcam laptop** (`jsQR` + `getUserMedia` chuẩn iOS Safari `playsInline`), **Tải ảnh QR**, và **Nhập mã vé**.

---

## 2. Danh sách công việc

### Backend (`apps/api`)

- [x] Tạo `EscrowService.php` (`lockDepositOnPayment`, `checkInByQr`, `confirmCheckInByTourist`).
- [x] Tích hợp `lockDepositOnPayment` vào `SepayService::handleWebhook()`.
- [x] Thêm `ProviderBookingController::checkInByQr()` và `TouristBookingController::confirmCheckIn()` + routes.
- [x] Viết `EscrowCheckInTest.php` (`DatabaseTransactions`) và chạy `pint --test` + `php artisan test`.

### Frontend Web (`apps/web`)

- [x] Cài `jsqr` và xây dựng `ProviderQrCheckinPage.jsx` tại `/provider/qr-checkin` (Camera, Upload ảnh, Nhập mã).
- [x] Đăng ký `/provider/qr-checkin` trong `AppRouter.jsx`.

### Frontend Mobile (`apps/mobile`)

- [x] Thêm nút **Xác nhận đã nhận dịch vụ** trên `BookingDetailScreen.js` cho đơn `confirmed`.
- [x] Chạy `oxlint`, `pnpm run lint` và `pnpm run build:web`.

---

## 3. Tiêu chuẩn nghiệm thu (DoD)

- [x] Thanh toán Sepay cộng đúng `deposit_amount` vào `locked_balance` của Provider.
- [x] Quét QR Check-in hợp lệ chuyển đơn sang `checked_in`, giải phóng `locked_balance` -> `balance` và tạo `WalletTransaction`.
- [x] Chống check-in & giải ngân trùng lặp (idempotent / guard).
- [x] Pass `pint --test`, `php artisan test`, `oxlint` và `pnpm run build:web`.
