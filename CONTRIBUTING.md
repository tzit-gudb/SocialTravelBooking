# Hướng dẫn đóng góp mã nguồn (Contribution Guide)

Tài liệu này cung cấp các tiêu chuẩn và quy tắc chung nhằm đảm bảo chất lượng mã nguồn, tính nhất quán trong Monorepo và quy trình làm việc trơn tru giữa các thành viên.

---

## Mục lục

1. [Kiến trúc Monorepo & Phân vai trò](#1-kiến-trúc-monorepo--phân-vai-trò)
2. [Quy tắc đặt tên nhánh (Branch Naming Convention)](#2-quy-tắc-đặt-tên-nhánh-branch-naming-convention)
3. [Quy tắc viết Commit Message (Conventional Commits)](#3-quy-tắc-viết-commit-message-conventional-commits)
4. [Tiêu chuẩn mã nguồn (Code Style & Formatting)](#4-tiêu-chuẩn-mã-nguồn-code-style--formatting)
5. [Quy trình đóng góp (Development & PR Workflow)](#5-quy-trình-đóng-góp-development--pr-workflow)
6. [Quy định về bảo mật & Biến môi trường](#6-quy-định-về-bảo-mật--biến-môi-trường)

---

## 1. Kiến trúc Monorepo & Phân vai trò

Dự án áp dụng kiến trúc Monorepo với pnpm workspaces. Các module được phân tách rõ ràng theo vai trò nghiệp vụ:

| Tên Module / Ứng dụng         | Workspace           | Vai trò phục vụ chính                                                                                        |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Mobile App (Expo)**         | `@stb/mobile`       | **Tourist** (Khách du lịch: lướt feed, tìm kiếm, đặt tour, ví tiền, chat) & **Provider** (Quét mã check-in)  |
| **Web Portal (Vite + React)** | `@stb/web`          | **Admin** (Quản trị hệ thống, phê duyệt đối tác) & **Provider** (Quản lý tour, phòng, lịch trình, doanh thu) |
| **Backend API (Laravel)**     | `apps/api`          | Cung cấp RESTful API cho toàn bộ hệ thống, phân quyền chặt chẽ (`admin`, `provider`, `tourist`)              |
| **Shared Types**              | `@stb/shared-types` | Chứa Enums, Interfaces, DTOs chia sẻ giữa Web và Mobile                                                      |

> [!IMPORTANT]
> Khi phát triển bất kỳ tính năng nào, hãy xác định rõ tính năng đó thuộc vai trò nào (**Admin**, **Provider**, hay **Tourist**) để đặt đúng thư mục và phân quyền API tương ứng.

---

## 2. Quy tắc đặt tên nhánh (Branch Naming Convention)

Mọi nhánh làm việc phải được phân nhánh từ nhánh chính `main` và đặt tên theo định dạng sau:

```
<type>/<scope>-<short-description>
# Hoặc gắn kèm mã Task/Issue trên GitHub:
<type>/#<issue-id>-<short-description>
```

### 2.1. Các tiền tố `<type>` được phép sử dụng:

- **`feat/`**: Phát triển tính năng mới.
- **`fix/`**: Sửa lỗi (bug fix).
- **`refactor/`**: Tái cấu trúc mã nguồn (không đổi tính năng bên ngoài).
- **`docs/`**: Thêm mới hoặc cập nhật tài liệu.
- **`test/`**: Viết thêm hoặc sửa đổi unit test / integration test.
- **`chore/`**: Thay đổi cấu hình build, dependencies, tooling monorepo.
- **`perf/`**: Cải thiện hiệu năng.

### 2.2. Các `<scope>` thường dùng trong dự án:

- Phạm vi workspace: `web`, `mobile`, `api`, `shared`, `infra`
- Phạm vi vai trò / tính năng: `admin`, `provider`, `tourist`, `auth`, `booking`, `payment`, `chat`

### 2.3. Ví dụ đặt tên nhánh chuẩn (kết hợp GitHub Issues / Projects):

- `feat/#12-mobile-tourist-booking` (Làm task #12: Màn hình đặt tour cho Tourist trên Mobile)
- `feat/#25-web-admin-approval` (Làm task #25: Duyệt đối tác cho Admin trên Web)
- `feat/#34-api-provider-create-tour` (Làm task #34: Viết API tạo tour cho Provider)
- `fix/#48-api-booking-status-ongoing` (Làm task #48: Sửa lỗi trạng thái booking trong Laravel API)
- `refactor/mobile-navigation-flow` (Tái cấu trúc luồng chuyển trang trong Mobile)
- `docs/update-database-schema` (Cập nhật schema tài liệu CSDL)

> [!TIP]
> **Khi làm việc với GitHub Projects**: Luôn gắn số Task ID (Ví dụ `#12`) vào tên nhánh để các thành viên khác khi xem danh sách branch hoặc pull request sẽ biết ngay nhánh này đang giải quyết công việc nào.

---

## 3. Quy tắc viết Commit Message (Conventional Commits) & Tự động hóa GitHub

Dự án áp dụng tiêu chuẩn **Conventional Commits** và được kiểm tra tự động qua **Commitlint** & **Husky**. Mọi commit không đúng định dạng sẽ bị Git từ chối.

### 3.1. Cấu trúc Commit Message:

```text
<type>(<scope>): <mô tả ngắn gọn>

[Nội dung mô tả chi tiết nếu cần]

[Từ khóa liên kết Task GitHub: Closes #12, Fixes #48]
```

### 3.2. Chi tiết các thành phần:

1. **`<type>`** _(Bắt buộc)_:
   - `feat`: Tính năng mới cho người dùng.
   - `fix`: Sửa lỗi cho người dùng.
   - `refactor`: Tái cấu trúc mã nguồn mà không sửa bug hay thêm feature.
   - `docs`: Thay đổi tài liệu (`README.md`, `docs/`, comment code...).
   - `style`: Thay đổi format, căn lề, chấm phẩy (không ảnh hưởng logic).
   - `perf`: Cải thiện hiệu năng.
   - `test`: Bổ sung hoặc chỉnh sửa bộ kiểm thử.
   - `chore`: Cập nhật cấu hình, dependency, kịch bản CI/CD.

2. **`<scope>`** _(Khuyến khích)_:
   - Tên workspace hoặc chức năng chịu ảnh hưởng: `mobile`, `web`, `api`, `shared-types`, `admin`, `provider`, `tourist`, `auth`, `deps`.

3. **`<mô tả ngắn gọn>`** _(Bắt buộc)_:
   - Viết ngắn gọn (dưới 72 ký tự).
   - Không viết hoa chữ cái đầu tiên (nếu dùng tiếng Anh).
   - Không để dấu chấm `.` ở cuối dòng tiêu đề.

4. **Tự động đóng Task trên GitHub Projects (Auto-close Keywords)**:
   GitHub hỗ trợ các từ khóa đặc biệt để tự động cập nhật bảng Kanban dự án khi Pull Request được merge vào `main`:
   - `Closes #ID` hoặc `Close #ID`
   - `Fixes #ID` hoặc `Fix #ID`
   - `Resolves #ID` hoặc `Resolve #ID`

### 3.3. Ví dụ commit hợp lệ:

```bash
# Thêm tính năng và gắn task GitHub
git commit -m "feat(mobile): add tourist explore tour list screen (closes #12)"
git commit -m "feat(web/admin): implement provider approval table (closes #25)"
git commit -m "feat(api): add middleware to verify firebase token and user role"

# Sửa lỗi và gắn task GitHub
git commit -m "fix(shared-types): include ongoing state in BookingStatus enum (fixes #48)"
git commit -m "fix(api/provider): resolve missing location_id validation"

# Cập nhật cấu hình / tài liệu
git commit -m "chore(deps): update expo sdk packages"
git commit -m "docs: add database schema guide and diagrams"
```

---

## 4. Tiêu chuẩn mã nguồn (Code Style & Formatting)

### 4.1. Tự động Format trước khi Commit

Dự án đã tích hợp sẵn **Husky** và **lint-staged**:

- Mỗi khi bạn chạy `git commit`, hệ thống sẽ tự động quét các file staging (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`) và định dạng lại qua **Prettier**.
- Bạn có thể chủ động định dạng toàn bộ dự án bằng lệnh:
  ```bash
  pnpm format
  ```

### 4.2. Quy tắc cho từng phần:

- **Web (`@stb/web`)**: Tuân thủ quy chuẩn của React Hooks và Tailwind CSS v4. Kiểm tra lint bằng `pnpm --filter @stb/web lint`.
- **Mobile (`@stb/mobile`)**: Viết UI dùng React Native StyleSheets chuẩn, tránh hardcode kích thước màn hình.
- **Backend (`apps/api`)**: Tuân theo chuẩn PSR-12 của PHP. Sử dụng Laravel Pint để định dạng mã nguồn PHP:
  ```bash
  cd apps/api && ./vendor/bin/pint
  ```

### 4.3. Quy chuẩn đặt tên biến, hàm, file (Coding Conventions)

Tất cả thành viên bắt buộc phải tuân theo hướng dẫn chi tiết về cách đặt tên biến, hàm, class, cấu trúc Component và API Response tại:
👉 **[docs/coding-conventions.md](docs/coding-conventions.md)**

### 4.4. Quy chuẩn viết comment

Chỉ comment những nội dung cần thiết và quan trọng đối với mã nguồn. Nội dung comment nhằm cho các thành viên khi đọc mã nguồn có thể hiểu được nội dung mã nguồn. Giúp cho việc Review, Bảo quản và Bảo trì mã nguồn trở nên dễ dàng hơn.

---

## 5. Quy trình đóng góp (Development & PR Workflow)

### Bước 1: Đồng bộ mã nguồn mới nhất

```bash
git checkout main
git pull origin main
```

### Bước 2: Tạo nhánh làm việc mới

```bash
git checkout -b feat/web-provider-service-list
```

### Bước 3: Phát triển tính năng & kiểm thử cục bộ

Trước khi commit, hãy đảm bảo các ứng dụng liên quan build thành công:

```bash
# Nếu sửa Web:
pnpm --filter @stb/web build

# Nếu sửa Mobile:
pnpm --filter @stb/mobile start

# Nếu sửa API Laravel:
php apps/api/artisan route:list
```

### Bước 4: Commit mã nguồn

Ghi commit message đúng chuẩn Conventional Commits:

```bash
git add .
git commit -m "feat(web/provider): create service listing table with filters"
```

### Bước 5: Đẩy nhánh lên Remote & Tạo Pull Request (PR)

```bash
git push -u origin feat/web-provider-service-list
```

- Mở Pull Request trên GitHub/GitLab vào nhánh `main`.
- **Tiêu đề PR**: Đặt theo định dạng commit message (Ví dụ: `feat(web/provider): add service listing page`).
- **Mô tả PR**:
  - Tóm tắt các thay đổi chính.
  - Các vai trò bị ảnh hưởng (**Admin**, **Provider**, hay **Tourist**).
  - Ảnh chụp màn hình hoặc GIF demo (đối với thay đổi giao diện UI).
  - Hướng dẫn cách kiểm tra lại tính năng.
- Chờ ít nhất **1 thành viên phê duyệt (Approved)** trước khi tiến hành Merge (Squash and Merge).

---

## 6. Quy định về bảo mật & Biến môi trường

> [!CAUTION]
> Tuyệt đối **KHÔNG BAO GIỜ** commit các thông tin nhạy cảm vào Git repository:
>
> - File thông tin xác thực tài khoản dịch vụ Firebase (`firebase-service-account.json`).
> - Các file môi trường thực tế (`.env`, `.env.local`, `.env.production`).
> - Private keys, JWT secrets, mật khẩu Database.

- Mọi biến môi trường mới cần được khai báo mẫu vào file `.env.example` tương ứng kèm chú thích giải thích ý nghĩa.
- Đảm bảo file credentials Firebase được đặt đúng tại:
  `apps/api/storage/app/firebase/firebase-service-account.json` (đường dẫn này đã được cấu hình trong [.gitignore](file:///d:/K23_23-27/Ki7/QuanLyDuAn/ProjectManagement/.gitignore)).
