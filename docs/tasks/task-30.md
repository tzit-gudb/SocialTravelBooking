# Task #30: Provider Dashboard — Quản lý số dư ví, Ngân hàng & Quy trình Rút tiền Chi trả

- **EPIC:** `#28` — Cơ chế Ký quỹ Escrow & Ví Provider
- **Sprint:** Sprint 4: Escrow Quyết Toán, Đánh Giá & Mini Social Feed
- **Platform:** API / Web (`apps/api`, `apps/web`)
- **Priority:** `P1` | **Estimate:** `3 Points`
- **Module:** `Payment` | **Role:** `provider`, `admin`
- **Branch:** `feat/#30-provider-wallet-dashboard`

---

## 1. Mục tiêu

Xây dựng hoàn chỉnh hệ thống **Ví doanh thu, Quản lý tài khoản ngân hàng & Chi trả rút tiền 2 chiều** giữa Nhà cung cấp dịch vụ (Provider) và Quản trị viên (Admin):

1. **Quản lý Tài khoản ngân hàng thụ hưởng (Hồ sơ NCC):** Lưu 1 hoặc nhiều tài khoản ngân hàng theo mã VietQR chuẩn (`TPB`, `VCB`, `TCB`, `MB`, `BIDV`...), chọn tài khoản mặc định.
2. **Quản lý Ví doanh thu (`/provider/wallet`):** Xem số dư khả dụng (`balance`), tiền ký quỹ Escrow (`locked_balance`), tổng đã giải ngân, tổng đã chi trả; tìm kiếm & lọc lịch sử biến động ví (`wallet_transactions`).
3. **Yêu cầu rút tiền & Sinh mã VietQR động:** NCC chọn tài khoản ngân hàng đã lưu để gửi yêu cầu rút tiền (`withdrawal_requests` trạng thái `pending`). Hệ thống trừ số dư khả dụng ngay và sinh `vietqr_url` trỏ đúng ngân hàng & STK của NCC kèm nội dung `RUT WD...`.
4. **Chi trả SePay Webhook tiền ra + Xác nhận thủ công Admin (`/admin/withdrawals`):**
   - Admin nhận **thông báo nổi Realtime** và cập nhật **badge Sidebar** ngay khi có yêu cầu mới hoặc khiếu nại.
   - Admin quét VietQR để chuyển khoản: Webhook SePay chiều ra (`transferType = 'out'`) tự động đối soát mã `WD...` -> chuyển sang `paid`; hoặc Admin nhập mã tham chiếu giao dịch bấm **"Xác nhận đã chi trả"** (dự phòng). Nếu sai thông tin, Admin từ chối -> hoàn tiền lại vào ví NCC.
5. **Xác nhận cuối từ NCC (kết thúc phiên):** Dù qua SePay Webhook hay Admin xác nhận tay, NCC vẫn bấm **"Xác nhận đã nhận khoản chi trả"** (`completed`) hoặc **"Chưa nhận được khoản chi trả"** (`disputed`) và trạng thái đồng bộ Realtime về Admin ngay lập tức.

---

## 2. Danh sách công việc

### Backend (`apps/api`)

- [x] Tạo migration & models `ProviderBankAccount` và `WithdrawalRequest`.
- [x] Tạo `ProviderBankAccountController` & `ProviderBankAccountRequest` (CRUD + đặt mặc định `/api/v1/provider/bank-accounts`).
- [x] Tạo `WithdrawalUpdated` broadcast event (`ShouldBroadcastNow`) trên kênh `admin.withdrawals` & `provider.{id}.wallet`.
- [x] Cập nhật `ProviderWalletService` & `ProviderWalletController` (tạo lệnh rút, danh sách rút tiền, `confirm-receipt`, `report-issue`).
- [x] Mở rộng `SepayService::handleWebhook()` xử lý chiều tiền ra (`transferType = 'out'`) khớp mã `WD...`.
- [x] Tạo `AdminWithdrawalController` (`/api/v1/admin/withdrawals`, `confirm-paid`, `reject`).
- [x] Cập nhật `ProviderWalletTest.php` (`DatabaseTransactions`) và chạy `pint --test` + `php artisan test`.

### Frontend Web (`apps/web`)

- [x] Thêm tab **Tài khoản ngân hàng** trong `ProviderProfilePage.jsx` (`ProviderBankAccountsManager.jsx`).
- [x] Cập nhật `ProviderWithdrawModal.jsx` chọn từ danh sách tài khoản ngân hàng đã lưu.
- [x] Cập nhật `ProviderWalletPage.jsx` theo dõi yêu cầu rút tiền, xác nhận đã nhận / chưa nhận khoản chi trả & lắng nghe Echo Realtime.
- [x] Xây dựng `AdminWithdrawalsPage.jsx` & `AdminWithdrawalDetailModal.jsx` (hiển thị VietQR động của NCC, form xác nhận mã tham chiếu / từ chối hoàn tiền).
- [x] Tích hợp thông báo nổi Realtime (`AdminLayout.jsx`) & badge đếm số yêu cầu trên `AdminSidebar.jsx`.
- [x] Chạy `oxlint` và `pnpm run build:web`.

---

## 3. Tiêu chuẩn nghiệm thu (DoD)

- [x] Không phá vỡ cấu trúc sổ cái `wallets` & `wallet_transactions`; tách riêng `provider_bank_accounts` và `withdrawal_requests`.
- [x] NCC thêm nhiều tài khoản ngân hàng, chọn khi rút tiền và hệ thống sinh đúng link VietQR động.
- [x] SePay webhook `transferType = 'out'` và Admin xác nhận thủ công đều chuyển trạng thái sang `paid`, chờ NCC xác nhận `completed` hoặc báo `disputed`.
- [x] Realtime đồng bộ tức thời thông báo nổi, badge Sidebar Admin và trạng thái ở cả Admin & NCC.
- [x] Pass `pint --test`, `php artisan test`, `oxlint` và `pnpm run build:web`.
