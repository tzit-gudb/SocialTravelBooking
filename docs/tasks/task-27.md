# Task #27: Xuất mã vé điện tử QR Code xác nhận đặt chỗ

- **EPIC:** `#24` — Cổng Thanh Toán Sepay & Vé QR
- **Sprint:** Sprint 3: Booking Engine & Cổng Thanh Toán Sepay
- **Platform:** Mobile / Web / API (`apps/mobile`, `apps/web`, `apps/api`)
- **Priority:** `P1` | **Estimate:** `2 Points`
- **Branch:** `feat/#27-qr-ticket`

---

## 1. Mục tiêu

1. Xuất mã vé điện tử **QR Code** thật (quét được bằng camera/máy quét) dựa trên `qr_checkin_token` cho các đơn đã xác nhận (`confirmed`, `checked_in`, `completed`).
2. Hiển thị thẻ vé điện tử QR trên Mobile (`BookingDetailScreen` + modal phóng to dễ quét tại quầy).
3. Bổ sung hiển thị mã vé QR / trạng thái check-in trên Web Portal (giám sát đơn đặt chỗ) và đảm bảo API trả đầy đủ `qr_checkin_token`, `checked_in_at`.

---

## 2. Danh sách công việc

### Backend (`apps/api`)

- [x] Bổ sung `qr_checkin_token` và `checked_in_at` vào `TouristBookingController::index()`.
- [x] Kiểm tra `TouristBookingEngineTest` đảm bảo không có regression.

### Frontend Mobile (`apps/mobile`)

- [x] Cài `qrcode` (pure JS, dùng chung với `react-native-svg` sẵn có, tương thích 100% Expo Go).
- [x] Tạo `QrCodeSvg.js` và nâng cấp `TouristQrTicketCard.js` hiển thị mã QR thật, trạng thái check-in, và modal phóng to để quét tại quầy.
- [x] Tích hợp `TouristQrTicketCard` vào `BookingDetailScreen.js` cho các đơn `confirmed` / `checked_in` / `completed`.

### Frontend Web (`apps/web`)

- [x] Hiển thị mã vé QR & trạng thái check-in trong phần chi tiết/giám sát đơn đặt chỗ trên Web Portal.
- [x] Chạy `pnpm run lint` và `pnpm run build:web`.

---

## 3. Tiêu chuẩn nghiệm thu (DoD)

- [x] Đơn đã xác nhận (`confirmed` / `checked_in` / `completed`) hiển thị đúng mã QR Code quét được từ `qr_checkin_token`.
- [x] Đơn `pending_payment` hoặc `cancelled` không xuất vé QR check-in.
- [x] Pass `pint --test`, `php artisan test`, `pnpm run lint`, `pnpm run build:web` và `oxlint`.
