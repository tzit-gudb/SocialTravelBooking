export enum UserRole {
  Admin = "admin",
  Provider = "provider",
  Tourist = "tourist",
}

export enum UserStatus {
  Active = "active",
  Banned = "banned",
  Pending = "pending",
}

export enum ProviderStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Suspended = "suspended",
}

export enum ServiceType {
  Tour = "tour",
  Hotel = "hotel",
  Homestay = "homestay",
  Vehicle = "vehicle",
}

export enum ServiceStatus {
  Draft = "draft",
  PendingReview = "pending_review",
  Active = "active",
  Rejected = "rejected",
}

export enum BookingStatus {
  Pending = "pending",
  Paid = "paid",
  Confirmed = "confirmed",
  Ongoing = "ongoing",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum PaymentMethod {
  Wallet = "wallet",
  MoMo = "momo",
  SePay = "sepay",
  VNPay = "vnpay",
  Banking = "banking",
}

export enum PaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
  Refunded = "refunded",
}

// ── Social Network Enums ─────────────────────────────────────

export enum PostVisibility {
  Public = "public",
  Followers = "followers",
  Private = "private",
}

export enum MediaType {
  Image = "image",
  Video = "video",
}

export enum SocialNotificationType {
  LikePost = "like_post",
  CommentPost = "comment_post",
  ReplyComment = "reply_comment",
  FollowUser = "follow_user",
  AffiliateBooking = "affiliate_booking",
}

// ── User & Profiles Interfaces ──────────────────────────────

export interface User {
  id: string;
  firebase_uid?: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  social_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TouristProfile {
  id: string;
  user_id: string;
  name?: string;
  phone_number?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  id_card_number?: string;
}

export interface BusinessType {
  id: string;
  type: string; // Phân loại lớn: 'giải trí', 'chỗ ở', 'phương tiện'...
  name: string; // Tên chi tiết: 'Khách sạn', 'Resort', 'Chỗ ở nhà dân', 'Tour ẩm thực', 'Tour tham quan'...
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  representative_name?: string;
  business_type_id?: string;
  business_type?: BusinessType;
  phone?: string;
  address?: string;
  business_license_url?: string;
  description?: string;
  status: ProviderStatus;
}

export interface SocialProfile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  website_url?: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at?: string;
  updated_at?: string;
}

// ── Service & Room Types Interfaces ──────────────────────────

export interface HotelRoomType {
  id: string;
  service_id: string;
  name: string;
  rank?: string;
  description?: string;
  base_price: number;
  total_rooms: number;
  inventory: number;
  capacity_adults: number;
  capacity_children: number;
  amenities?: string[];
  images?: string[];
  status: "active" | "inactive";
}

export interface Service {
  id: string;
  provider_id: string;
  provider?: ProviderProfile;
  category_id?: string;
  business_type_id?: string;
  business_type?: BusinessType;
  location_id?: string;
  name: string;
  slug: string;
  description?: string;
  type: ServiceType;
  status: ServiceStatus;
  base_price: number;
  price_unit: string;
  max_guests: number;
  duration_days: number;
  duration_nights: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  includes?: string[];
  excludes?: string[];
  rating_avg: number;
  total_bookings: number;
  room_types?: HotelRoomType[];
  created_at?: string;
  updated_at?: string;
}

// ── Booking & Payments Interfaces ────────────────────────────

export interface Payment {
  id: string;
  booking_id: string;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  transaction_code?: string;
  status: PaymentStatus;
  gateway_response?: Record<string, any>;
  paid_at?: string;
  created_at?: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  qr_checkin_token: string;
  user_id: string;
  user?: User;
  service_id: string;
  service?: Service;
  provider_id: string;
  provider?: ProviderProfile;
  room_type_id?: string;
  room_type?: HotelRoomType;
  coupon_id?: string;
  affiliate_post_id?: string;
  check_in_date: string;
  check_out_date?: string;
  checked_in_at?: string;
  num_adults: number;
  num_children: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  coupon_code?: string;
  total_amount: number;
  status: BookingStatus;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  special_requests?: string;
  cancel_reason?: string;
  cancelled_at?: string;
  payments?: Payment[];
  created_at?: string;
  updated_at?: string;
}

// ── Social Posts & Feed Interfaces ──────────────────────────

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  display_name: string;
  type: string;
  posts_count: number;
}

export interface Post {
  id: string;
  user_id: string;
  user?: User;
  social_profile?: SocialProfile;
  content?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  service_id?: string;
  service_type?: string;
  affiliate_code?: string;
  visibility: PostVisibility;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  affiliate_clicks_count: number;
  is_liked_by_me?: boolean;
  is_saved_by_me?: boolean;
  media?: PostMedia[];
  tags?: Tag[];
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user?: User;
  social_profile?: SocialProfile;
  parent_id?: string;
  content: string;
  likes_count: number;
  replies?: Comment[];
  created_at?: string;
  updated_at?: string;
}

export interface SocialNotification {
  id: string;
  user_id: string;
  actor_id: string;
  actor?: User;
  actor_social_profile?: SocialProfile;
  type: SocialNotificationType;
  post_id?: string;
  comment_id?: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at?: string;
}
