-- ==============================================================================
-- CƠ SỞ DỮ LIỆU: SOCIAL TRAVEL BOOKING (POSTGRESQL DDL)
-- HỆ THỐNG ĐẶT DỊCH VỤ DU LỊCH KẾT HỢP MẠNG XÃ HỘI TRẢI NGHIỆM
-- ==============================================================================

-- Bật extension hỗ trợ tìm kiếm và mã hóa (nếu cần)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. NGƯỜI DÙNG & HỒ SƠ (USERS & PROFILES)
-- ==============================================================================

-- 1.1 Bảng Tài khoản Người dùng (Gốc)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'tourist', -- 'tourist', 'provider', 'admin'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'banned', 'pending'
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 1.2 Bảng Hồ sơ Khách du lịch (Thông tin thật dùng cho booking)
CREATE TABLE IF NOT EXISTS tourist_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NULL,
    phone_number VARCHAR(20) NULL,
    gender VARCHAR(20) NULL,
    date_of_birth DATE NULL,
    nationality VARCHAR(100) NULL,
    id_card_number VARCHAR(30) NULL, -- CCCD / Hộ chiếu
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 Bảng Loại hình Doanh nghiệp Đối tác (Business Types - Phục vụ định danh Provider)
CREATE TABLE IF NOT EXISTS business_types (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- Nhóm ngành lớn: 'Chỗ ở', 'Giải trí', 'Phương tiện', 'Ăn uống'
    name VARCHAR(100) NOT NULL, -- Tên chi tiết: 'Tour du lịch & Trải nghiệm', 'Khách sạn', 'Homestay & Villa', 'Resort', 'Phương tiện di chuyển', 'Vé tàu', 'Nhà hàng & Ẩm thực'
    slug VARCHAR(100) UNIQUE NOT NULL, -- 'tour-du-lich-trai-nghiem', 'khach-san', 'homestay-villa', 'resort'...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_types_type ON business_types(type);
CREATE INDEX IF NOT EXISTS idx_business_types_slug ON business_types(slug);

-- 1.4 Bảng Hồ sơ Nhà cung cấp dịch vụ (Doanh nghiệp / Cơ sở lưu trú / Lữ hành)
CREATE TABLE IF NOT EXISTS provider_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    representative_name VARCHAR(255) NULL, -- Tên người đại diện pháp luật / chủ cơ sở
    business_type_id BIGINT NULL REFERENCES business_types(id) ON DELETE SET NULL,
    phone VARCHAR(20) NULL, -- Hotline hỗ trợ khách hàng
    address TEXT NULL, -- Địa chỉ văn phòng / cơ sở kinh doanh
    business_license_url JSONB NULL, -- Danh sách đường dẫn ảnh/tài liệu Giấy phép kinh doanh (mảng JSON) lưu trữ tại backend
    description TEXT NULL, -- Giới thiệu doanh nghiệp
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    rejection_reason TEXT NULL, -- Lý do từ chối kiểm duyệt
    approved_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL, -- Admin phê duyệt
    approved_at TIMESTAMP NULL, -- Thời điểm phê duyệt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_status ON provider_profiles(status);

-- 1.5 Bảng Hồ sơ Mạng xã hội Cá nhân (Độc lập với hồ sơ booking)
CREATE TABLE IF NOT EXISTS social_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NULL,
    bio TEXT NULL,
    avatar_url TEXT NULL,
    cover_photo_url TEXT NULL,
    website_url VARCHAR(255) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_profiles_username ON social_profiles(username);

-- ==============================================================================
-- 2. ĐỊA ĐIỂM & DANH MỤC DỊCH VỤ (LOCATIONS & CATEGORIES)
-- ==============================================================================

-- 2.1 Bảng Địa phương / Tỉnh thành du lịch
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id BIGINT NULL REFERENCES locations(id) ON DELETE SET NULL,
    image_url TEXT NULL,
    country_code VARCHAR(10) DEFAULT 'VN',
    description TEXT NULL,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_is_popular ON locations(is_popular);

-- 2.2 Bảng Danh mục dịch vụ
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    icon VARCHAR(100) NULL,
    icon_url TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. DỊCH VỤ DU LỊCH & QUẢN LÝ PHÒNG (SERVICES & ROOM TYPES)
-- ==============================================================================

-- 3.1 Bảng Dịch vụ cốt lõi (Tour, Khách sạn, Homestay, Thuê xe)
CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    category_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
    location_id BIGINT NULL REFERENCES locations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'tour', -- 'tour', 'hotel', 'homestay', 'vehicle'
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'active', 'rejected'
    base_price DECIMAL(15,2) NOT NULL,
    price_unit VARCHAR(50) DEFAULT 'người', -- 'người', 'phòng/đêm', 'ngày', 'xe'
    max_guests INTEGER DEFAULT 1,
    duration_days INTEGER DEFAULT 1,
    duration_nights INTEGER DEFAULT 0,
    address TEXT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    amenities JSONB NULL,
    includes JSONB NULL,
    excludes JSONB NULL,
    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    total_bookings INTEGER DEFAULT 0,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_services_type_status ON services(type, status);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_location_id ON services(location_id);

-- 3.2 Bảng Thư viện Media Dịch vụ
CREATE TABLE IF NOT EXISTS service_media (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'image', -- 'image', 'video'
    is_cover BOOLEAN DEFAULT FALSE,
    sort_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_media_cover ON service_media(service_id, is_cover);

-- 3.3 Bảng Lịch trình Tour (Theo từng ngày)
CREATE TABLE IF NOT EXISTS service_schedules (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    activities JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_schedules_day ON service_schedules(service_id, day_number);

-- 3.4 Bảng Phân loại phòng Khách sạn / Homestay
CREATE TABLE IF NOT EXISTS hotel_room_types (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rank VARCHAR(100) DEFAULT 'standard',
    description TEXT NULL,
    base_price DECIMAL(15,2) NOT NULL,
    total_rooms INTEGER DEFAULT 1,
    inventory INTEGER DEFAULT 1,
    capacity_adults INTEGER DEFAULT 2,
    capacity_children INTEGER DEFAULT 0,
    amenities JSONB NULL,
    images JSONB NULL,
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hotel_room_types_service ON hotel_room_types(service_id);

-- 3.5 Bảng Lịch Khả dụng & Giá theo ngày
CREATE TABLE IF NOT EXISTS service_availability (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    total_slots INTEGER DEFAULT 0,
    booked_slots INTEGER DEFAULT 0,
    price_override DECIMAL(15,2) NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_service_available_date UNIQUE (service_id, available_date)
);

-- ==============================================================================
-- 4. MẠNG XÃ HỘI DU LỊCH (SOCIAL NETWORK)
-- ==============================================================================

-- 4.1 Bảng Danh mục Hashtags
CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'general', -- 'location', 'category', 'activity', 'general'
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);

-- 4.2 Bảng Bài viết MXH
CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NULL,
    location_name VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    service_id BIGINT NULL REFERENCES services(id) ON DELETE SET NULL, -- Gắn link Affiliate
    service_type VARCHAR(50) NULL,
    affiliate_code VARCHAR(50) NULL,
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'followers', 'private'
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    affiliate_clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_created ON posts(visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_affiliate_code ON posts(affiliate_code);

-- 4.3 Bảng Media Bài viết (Ảnh / Video)
CREATE TABLE IF NOT EXISTS post_media (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_type VARCHAR(20) DEFAULT 'image', -- 'image', 'video'
    url TEXT NOT NULL,
    thumbnail_url TEXT NULL,
    width INTEGER NULL,
    height INTEGER NULL,
    sort_order SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_media_order ON post_media(post_id, sort_order);

-- 4.4 Bảng Pivot Gắn Hashtags vào Bài viết
CREATE TABLE IF NOT EXISTS post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- 4.5 Bảng Thả tim Bài viết (Likes)
CREATE TABLE IF NOT EXISTS likes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_likes_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_created ON likes(post_id, created_at);

-- 4.6 Bảng Bình luận Bài viết (Comments)
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT NULL REFERENCES comments(id) ON DELETE CASCADE, -- Hỗ trợ Nested Replies
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- 4.7 Bảng Chia sẻ Bài viết (Post Shares)
CREATE TABLE IF NOT EXISTS post_shares (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) DEFAULT 'internal', -- 'internal', 'facebook', 'zalo', 'copy_link'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_shares_platform ON post_shares(post_id, platform);

-- 4.8 Bảng Lưu bài viết yêu thích (Bookmarks)
CREATE TABLE IF NOT EXISTS saved_posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_saved_posts_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_created ON saved_posts(user_id, created_at);

-- 4.9 Bảng Mối quan hệ Theo dõi (Follows)
CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_follows_follower_following UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 4.10 Bảng Thông báo Mạng xã hội Realtime
CREATE TABLE IF NOT EXISTS social_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'like_post', 'comment_post', 'reply_comment', 'follow_user', 'affiliate_booking'
    post_id BIGINT NULL REFERENCES posts(id) ON DELETE CASCADE,
    comment_id BIGINT NULL REFERENCES comments(id) ON DELETE CASCADE,
    data JSONB NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_notifications_user_read ON social_notifications(user_id, is_read, created_at);

-- ==============================================================================
-- 5. COUPONS & VÍ TIỀN (COUPONS & WALLETS)
-- ==============================================================================

-- 5.1 Bảng Mã giảm giá (Coupons)
CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'percent', -- 'percent', 'fixed'
    discount_value DECIMAL(15,2) NOT NULL,
    min_order_amount DECIMAL(15,2) NULL,
    usage_limit INTEGER NULL,
    used_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- 5.2 Bảng Ví tiền điện tử (Wallets)
CREATE TABLE IF NOT EXISTS wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0.00,
    locked_balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(5) DEFAULT 'VND',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.3 Bảng Lịch sử biến động số dư ví
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- 'deposit', 'booking_payment', 'refund', 'commission', 'affiliate_reward', 'withdraw'
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    note VARCHAR(255) NULL,
    reference_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at);

-- ==============================================================================
-- 6. ĐẶT CHỖ, THANH TOÁN & ĐÁNH GIÁ (BOOKINGS, PAYMENTS & REVIEWS)
-- ==============================================================================

-- 6.1 Bảng Đặt chỗ (Bookings) - Đã tối ưu hóa và tinh gọn
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    qr_checkin_token VARCHAR(64) UNIQUE NOT NULL, -- Token bảo mật dùng quét QR check-in
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    provider_id BIGINT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    room_type_id BIGINT NULL REFERENCES hotel_room_types(id) ON DELETE SET NULL,
    coupon_id BIGINT NULL REFERENCES coupons(id) ON DELETE SET NULL,
    affiliate_post_id BIGINT NULL REFERENCES posts(id) ON DELETE SET NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NULL,
    checked_in_at TIMESTAMP NULL, -- Thời điểm Provider quét QR xác thực thành công
    num_adults INTEGER DEFAULT 1,
    num_children INTEGER DEFAULT 0,
    unit_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    coupon_code VARCHAR(50) NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'confirmed', 'ongoing', 'completed', 'cancelled'
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255) NULL,
    special_requests TEXT NULL,
    cancel_reason TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_qr_checkin_token ON bookings(qr_checkin_token);

-- 6.2 Bảng Lịch sử Thanh toán (Payments) - Tách riêng độc lập khỏi bookings
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL, -- 'sepay', 'momo', 'vnpay', 'wallet', 'banking'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'VND',
    transaction_code VARCHAR(100) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    gateway_response JSONB NULL, -- Lưu trữ toàn bộ webhook payload từ cổng thanh toán
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments(booking_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_code ON payments(transaction_code);

-- 6.3 Bảng Đánh giá Dịch vụ (Reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL DEFAULT 5, -- 1 đến 5 sao
    content TEXT NULL,
    images JSONB NULL,
    provider_reply TEXT NULL,
    provider_reply_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_service_rating ON reviews(service_id, rating);
