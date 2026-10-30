/**
 * Runtime JavaScript Enums for @stb/shared-types
 * Single Source of Truth shared across Web, Mobile & Backend.
 * Mirrors TypeScript enums in packages/shared-types/src/index.ts.
 */

export const UserRole = Object.freeze({
  Admin: "admin",
  Provider: "provider",
  Tourist: "tourist",
  ADMIN: "admin",
  PROVIDER: "provider",
  TOURIST: "tourist",
});

export const UserStatus = Object.freeze({
  Active: "active",
  Banned: "banned",
  Pending: "pending",
  ACTIVE: "active",
  BANNED: "banned",
  PENDING: "pending",
});

export const ProviderStatus = Object.freeze({
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
  Suspended: "suspended",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
});

export const ServiceType = Object.freeze({
  Tour: "tour",
  Hotel: "hotel",
  Homestay: "homestay",
  Vehicle: "vehicle",
  TOUR: "tour",
  HOTEL: "hotel",
  HOMESTAY: "homestay",
  VEHICLE: "vehicle",
});

export const ServiceStatus = Object.freeze({
  Draft: "draft",
  PendingReview: "pending_review",
  Active: "active",
  Rejected: "rejected",
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  ACTIVE: "active",
  REJECTED: "rejected",
});

export const BookingStatus = Object.freeze({
  Pending: "pending",
  Paid: "paid",
  Confirmed: "confirmed",
  Ongoing: "ongoing",
  Completed: "completed",
  Cancelled: "cancelled",
  PENDING: "pending",
  PAID: "paid",
  CONFIRMED: "confirmed",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const PaymentMethod = Object.freeze({
  Wallet: "wallet",
  MoMo: "momo",
  SePay: "sepay",
  VNPay: "vnpay",
  Banking: "banking",
  WALLET: "wallet",
  MOMO: "momo",
  SEPAY: "sepay",
  VNPAY: "vnpay",
  BANKING: "banking",
});

export const PaymentStatus = Object.freeze({
  Pending: "pending",
  Paid: "paid",
  Failed: "failed",
  Refunded: "refunded",
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

export const PostVisibility = Object.freeze({
  Public: "public",
  Followers: "followers",
  Private: "private",
  PUBLIC: "public",
  FOLLOWERS: "followers",
  PRIVATE: "private",
});

export const MediaType = Object.freeze({
  Image: "image",
  Video: "video",
  IMAGE: "image",
  VIDEO: "video",
});

export const SocialNotificationType = Object.freeze({
  LikePost: "like_post",
  CommentPost: "comment_post",
  ReplyComment: "reply_comment",
  FollowUser: "follow_user",
  AffiliateBooking: "affiliate_booking",
  LIKE_POST: "like_post",
  COMMENT_POST: "comment_post",
  REPLY_COMMENT: "reply_comment",
  FOLLOW_USER: "follow_user",
  AFFILIATE_BOOKING: "affiliate_booking",
});
