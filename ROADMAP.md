# Kế Hoạch Phát Triển MVP - Social Travel Booking

**Tổng quan:** Kế hoạch tập trung phát triển các chức năng cốt lõi của dự án theo lộ trình: **Nền tảng Auth & KYC (Sprint 1) -> Hệ sinh thái Quản trị Admin & Dịch vụ Provider (Sprint 2) -> Đặt chỗ & Thanh toán Sepay (Sprint 3) -> Escrow, Đánh giá & Social Feed (Sprint 4)**.
**Định hướng nền tảng (Platform Strategy):**

- **Admin & Provider:** Ưu tiên tối đa trên **Web Portal** (kiểm duyệt KYC, kiểm duyệt dịch vụ, quản trị tài khoản, ưu đãi, danh mục, báo cáo và đối soát vận hành).
- **Tourist (Khách du lịch):** Ưu tiên trên **Mobile App** (tìm kiếm, đặt chỗ, thanh toán Sepay, nhận vé QR code và tương tác mạng xã hội).
- **Backend API (Laravel):** Đảm bảo RESTful API chuẩn hóa, tài liệu hóa và bảo vệ bằng middleware phân quyền (`firebase.auth`, `role:*`).

---

## 📋 Quy ước Custom Fields trên GitHub Projects

- **Status:** `Todo` | `In Progress` | `Done`
- **Priority:** `P0 (Critical)` | `P1 (High)` | `P2 (Normal)` | `P3 (Nice to have)`
- **Estimate:** Điểm độ phức tạp / Story Points (1, 2, 3, 5, 8)
- **Module:** `Auth` | `Booking` | `Payment` | `Social` | `Admin` | `DevOps`
- **Role:** `user` | `provider` | `admin` | `general`
- **Platform:** `API` | `Web` | `Mobile` | `Monorepo`

---

## SPRINT 1: Authentication, Onboarding & Nền Tảng Kỹ Thuật (Tuần 1)

**Mục tiêu (Sprint Goal):** Hoàn thiện luồng xác thực đa vai trò, chuẩn bị hạ tầng upload media/CI-CD, Provider gửi hồ sơ KYC và Admin phê duyệt thành công.
**Thời gian:** 26/10 - 01/11 | **Tổng Estimate:** 16 Points

| Tên Task (Issue / Sub-issues)                            |        Platform        |  Status  | Priority | Estimate | Module     | Role        | Start date | Date target |
| :------------------------------------------------------- | :--------------------: | :------: | :------: | :------: | :--------- | :---------- | :--------- | :---------- |
| **[EPIC] Nền tảng Xác thực & User**                      | **API / Web / Mobile** | **Done** |  **P0**  |  **6**   | **Auth**   | **general** | 26/10      | 30/10       |
| ↳ Đăng ký/Đăng nhập Email, SĐT & Phân quyền vai trò      |          All           |   Done   |    P0    |    2     | Auth       | general     | 26/10      | 28/10       |
| ↳ Hoàn thiện Google OAuth2 / Firebase Auth Client        |       Web/Mobile       |   Done   |    P1    |    2     | Auth       | user        | 28/10      | 30/10       |
| ↳ Quản lý trang hồ sơ cá nhân (Profile cá nhân cơ bản)   |       Web/Mobile       |   Done   |    P1    |    2     | Auth       | general     | 29/10      | 30/10       |
| **[EPIC] Hạ tầng DevOps & Media Storage**                |   **API / Monorepo**   | **Done** |  **P0**  |  **4**   | **DevOps** | **admin**   | 26/10      | 28/10       |
| ↳ Pipeline CI/CD cơ bản (Lint, Typecheck, Unit Test API) |        Monorepo        |   Done   |    P0    |    2     | DevOps     | admin       | 26/10      | 27/10       |
| ↳ Module Upload Media (Hỗ trợ upload ảnh KYC & Dịch vụ)  |          API           |   Done   |    P0    |    2     | DevOps     | general     | 27/10      | 28/10       |
| **[EPIC] Provider Onboarding & Phê Duyệt KYC**           |     **API / Web**      | **Done** |  **P0**  |  **6**   | **Admin**  | **admin**   | 29/10      | 01/11       |
| ↳ Form đăng ký Provider & Nộp hồ sơ KYC (CCCD, GPKD)     |       Web/Mobile       |   Done   |    P0    |    3     | Auth       | provider    | 29/10      | 31/10       |
| ↳ Admin Dashboard: Danh sách & Xét duyệt/Từ chối KYC     |          Web           |   Done   |    P0    |    3     | Admin      | admin       | 31/10      | 01/11       |

---

## SPRINT 2: Quản Lý Dịch Vụ, Admin Operations & Khám Phá Trải Nghiệm (Tuần 2)

**Mục tiêu (Sprint Goal):** Provider đăng ký và cấu hình dịch vụ bán hàng, Admin hoàn thiện toàn bộ chức năng kiểm duyệt & quản trị sàn (Users, Coupons, Settings, Reports, Dashboard/Bookings) trước khi mở sang luồng Khách du lịch.
**Thời gian:** 02/11 - 28/11 | **Tổng Estimate:** 32 Points

| Tên Task (Issue / Sub-issues)                                                      |     Platform     |     Status      | Priority | Estimate | Module      | Role         | Start date | Date target |
| :--------------------------------------------------------------------------------- | :--------------: | :-------------: | :------: | :------: | :---------- | :----------- | :--------- | :---------- |
| **[EPIC] Quản lý Dịch vụ (#15)**                                                   |  **API / Web**   |    **Done**     |  **P0**  |  **10**  | **Booking** | **provider** | 02/11      | 07/11       |
| ↳ CRUD Dịch vụ du lịch (Tour / Khách sạn) + Quản lý album ảnh                      |       Web        |      Done       |    P0    |    5     | Booking     | provider     | 02/11      | 05/11       |
| ↳ Cấu hình Lịch phục vụ (Availability) & Bảng giá theo ngày                        |       Web        |      Done       |    P0    |    3     | Booking     | provider     | 05/11      | 06/11       |
| ↳ Admin Dashboard: Kiểm duyệt & Phê duyệt/Từ chối Dịch vụ [#46]                    |    Web / API     |      Done       |    P0    |    2     | Admin       | admin        | 06/11      | 07/11       |
| **[EPIC] Quản trị Hệ thống & Điều hành Sàn (Admin Operations - #51)**              |  **API / Web**   | **In Progress** |  **P0**  |  **18**  | **Admin**   | **admin**    | 21/11      | 28/11       |
| ↳ Quản lý Tài khoản Người dùng (Lọc vai trò, xem hồ sơ, khóa/mở khóa) [#52]        |    Web / API     |      Done       |    P0    |    3     | Admin       | admin        | 21/11      | 22/11       |
| ↳ Quản lý Mã ưu đãi toàn sàn (CRUD Coupons, giới hạn & hiệu lực) [#53]             |    Web / API     |      Done       |    P1    |    3     | Admin       | admin        | 22/11      | 23/11       |
| ↳ Cấu hình Hệ thống (CRUD Điểm đến, Danh mục & Loại hình kinh doanh) [#54]         |    Web / API     |      Done       |    P0    |    3     | Admin       | admin        | 24/11      | 25/11       |
| ↳ Tái cấu trúc đồng bộ trạng thái URL (useSearchParams) cho Provider & Admin [#59] |       Web        |      Todo       |    P1    |    2     | Admin       | general      | 25/11      | 25/11       |
| ↳ Kiểm duyệt Nội dung & Báo cáo Cộng đồng (Bài viết, bình luận vi phạm) [#55]      |    Web / API     |      Todo       |    P1    |    3     | Admin       | admin        | 25/11      | 26/11       |
| ↳ Tổng quan Vận hành Thực tế & Giám sát Đơn đặt chỗ / Đối soát Ví [#56]            |    Web / API     |      Todo       |    P0    |    4     | Admin       | admin        | 27/11      | 28/11       |
| **[EPIC] Khám phá & Tìm kiếm Dịch vụ (Tourist)**                                   | **API / Mobile** |    **Todo**     |  **P0**  |  **6**   | **Booking** | **user**     | 29/11      | 01/12       |
| ↳ Trang chủ & Tìm kiếm (Theo điểm đến, từ khóa, khoảng giá)                        |    Mobile/Web    |      Todo       |    P0    |    3     | Booking     | user         | 29/11      | 30/11       |
| ↳ Màn hình Chi tiết Dịch vụ (Thông tin, ảnh, chính sách, giá)                      |      Mobile      |      Todo       |    P0    |    3     | Booking     | user         | 30/11      | 01/12       |

---

## SPRINT 3: Booking Engine & Cổng Thanh Toán Sepay (Tuần 3) ⚠️

**Mục tiêu (Sprint Goal):** Xử lý đặt chỗ không bị trùng lặp (No Overbooking), tích hợp thanh toán cọc 30% qua cổng Sepay và xuất vé QR Code xác nhận.
**Thời gian:** 02/12 - 08/12 | **Tổng Estimate:** 15 Points

| Tên Task (Issue / Sub-issues)                                        |     Platform     |     Status      | Priority | Estimate | Module      | Role        | Start date | Date target |
| :------------------------------------------------------------------- | :--------------: | :-------------: | :------: | :------: | :---------- | :---------- | :--------- | :---------- |
| **[EPIC] Booking Engine (Xử lý Đặt chỗ)**                            | **API / Mobile** |    **Done**     |  **P0**  |  **7**   | **Booking** | **user**    | 02/12      | 04/12       |
| ↳ Logic tạo đơn, tính toán tiền cọc 30% & Kiểm tra xung đột lịch     |       API        |      Done       |    P0    |    4     | Booking     | user        | 02/12      | 03/12       |
| ↳ Giao diện đặt chỗ & Màn hình quản lý Lịch sử đơn đặt               |      Mobile      |      Done       |    P1    |    3     | Booking     | user        | 03/12      | 04/12       |
| **[EPIC] Cổng Thanh Toán Sepay & Vé QR**                             |  **API / All**   | **In Progress** |  **P0**  |  **8**   | **Payment** | **general** | 05/12      | 08/12       |
| ↳ Tích hợp Cổng Sepay (Tạo QR thanh toán cọc 30%)                    |    API/Mobile    |      Done       |    P0    |    3     | Payment     | user        | 05/12      | 06/12       |
| ↳ Xử lý Webhook Sepay (Idempotent, bảo mật chữ ký, tự động cập nhật) |       API        |      Todo       |    P0    |    3     | Payment     | general     | 06/12      | 07/12       |
| ↳ Xuất mã vé điện tử QR Code xác nhận đặt chỗ                        |    Mobile/Web    |      Todo       |    P1    |    2     | Booking     | user        | 07/12      | 08/12       |

---

## SPRINT 4: Escrow Quyết Toán, Đánh Giá & Mini Social Feed (Tuần 4)

**Mục tiêu (Sprint Goal):** Hoàn tất vòng đời đơn hàng với cơ chế Escrow (giải phóng tiền vào ví Provider), đánh giá chất lượng và chia sẻ bài viết trải nghiệm.
**Thời gian:** 09/12 - 15/12 | **Tổng Estimate:** 14 Points

| Tên Task (Issue / Sub-issues)                                            |     Platform     |  Status  | Priority | Estimate | Module      | Role      | Start date | Date target |
| :----------------------------------------------------------------------- | :--------------: | :------: | :------: | :------: | :---------- | :-------- | :--------- | :---------- |
| **[EPIC] Cơ chế Ký quỹ Escrow & Ví Provider**                            |  **API / Web**   | **Todo** |  **P0**  |  **5**   | **Payment** | **admin** | 09/12      | 11/12       |
| ↳ Check-in quét QR / User xác nhận -> Tự động giải phóng tiền cọc vào ví |       API        |   Todo   |    P0    |    3     | Payment     | general   | 09/12      | 10/12       |
| ↳ Provider Dashboard: Quản lý số dư ví & Lịch sử giao dịch               |       Web        |   Todo   |    P1    |    2     | Payment     | provider  | 10/12      | 11/12       |
| **[EPIC] Đánh giá Dịch vụ (Review & Rating)**                            | **API / Mobile** | **Todo** |  **P0**  |  **3**   | **Booking** | **user**  | 11/12      | 12/12       |
| ↳ Tính năng gửi đánh giá sao & nhận xét sau khi hoàn thành chuyến đi     |      Mobile      |   Todo   |    P0    |    3     | Booking     | user      | 11/12      | 12/12       |
| **[EPIC] Mạng Xã Hội Du Lịch (Mini Travel Feed)**                        | **API / Mobile** | **Todo** |  **P1**  |  **6**   | **Social**  | **user**  | 13/12      | 15/12       |
| ↳ Tạo bài viết trải nghiệm (Nội dung, upload ảnh, tag địa điểm)          |      Mobile      |   Todo   |    P1    |    3     | Social      | user      | 13/12      | 14/12       |
| ↳ Trang Bảng tin (Feed) khám phá bài viết & Thả tim/Tương tác            |      Mobile      |   Todo   |    P1    |    3     | Social      | user      | 14/12      | 15/12       |

---

## 🎯 Tổng Kết Phân Bổ Nguồn Lực & Mốc Nghiệm Thu

1. **Tổng Story Points toàn dự án:** ~77 Points (4 Sprints).
2. **Các mốc bàn giao nghiệm thu chính (Milestones):**
   - **M1 (01/11):** Nền tảng tài khoản, phân quyền, KYC Provider và CI/CD tự động (`Done`).
   - **M2 (28/11):** Cửa hàng dịch vụ Provider, Kiểm duyệt Dịch vụ & Toàn bộ Phân hệ Quản trị Admin (`#51` - `#56`) + Tìm kiếm Tourist.
   - **M3 (08/12):** Hoàn thành dòng tiền (Đặt chỗ + Thanh toán cọc Sepay realtime).
   - **M4 (15/12):** Khép kín nghiệm thu MVP (Escrow quyết toán ví + Review + Travel Feed).
