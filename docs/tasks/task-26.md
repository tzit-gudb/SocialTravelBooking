# Task #26: Xử lý Webhook Sepay (Idempotent, bảo mật chữ ký, tự động cập nhật)

- **EPIC:** `#24` — Cổng Thanh Toán Sepay & Vé QR
- **Sprint:** Sprint 3: Booking Engine & Cổng Thanh Toán Sepay
- **Platform:** API (`apps/api`)
- **Priority:** `P0` | **Estimate:** `3 Points`
- **Branch:** `feat/#26-sepay-webhook`

---

## 1. Mục tiêu

1. Mở endpoint `POST /api/v1/webhooks/sepay` tiếp nhận thông báo biến động số dư realtime từ Sepay.
2. Xác thực nguồn gửi qua `Authorization: Apikey <SEPAY_WEBHOOK_TOKEN>` (hỗ trợ `hash_equals` chống timing attack).
3. Xử lý **Idempotent** trong `DB::transaction` + `lockForUpdate()`:
   - Chống xử lý trùng khi Sepay retry cùng `sepay_id` hoặc khi đơn đã được thanh toán.
   - Đối soát mã đơn (`STB...`), số tài khoản nhận và số tiền chuyển (`transferAmount >= deposit_amount`).
   - Tự động cập nhật `Payment` sang `paid`, `Booking` sang `confirmed`, xóa `payment_expires_at` và tăng `services.total_bookings`.

---

## 2. Danh sách công việc

### Backend (`apps/api`)

- [x] Bổ sung `handleWebhook(array $payload)` vào `SepayService.php`.
- [x] Tạo `SepayWebhookController.php` xác thực token & xử lý webhook.
- [x] Đăng ký `POST /api/v1/webhooks/sepay` trong `routes/api/v1/public.php`.
- [x] Viết `SepayWebhookTest.php` (`DatabaseTransactions`) phủ các kịch bản: sai token (`401`), thanh toán hợp lệ (`confirmed`), webhook trùng (idempotent), chuyển thiếu tiền, và giao dịch tiền ra (`out`).
- [x] Chạy `./vendor/bin/pint.bat --test` và `php artisan test`.

---

## 3. Tiêu chuẩn nghiệm thu (DoD)

- [x] Từ chối request sai/thiếu token với HTTP `401`.
- [x] Giao dịch hợp lệ cập nhật `Booking` sang `confirmed` và `Payment` sang `paid`.
- [x] Webhook gửi trùng không tạo thêm giao dịch và không cộng trùng `total_bookings`.
- [x] Pass `pint --test` và `php artisan test`.
