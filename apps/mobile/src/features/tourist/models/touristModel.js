import { UserRole, UserStatus } from "@stb/shared-types";

export { UserRole, UserStatus };

/**
 * Chuẩn hóa dữ liệu người dùng Du khách nhận từ API Backend
 * @param {Object} rawUser - Payload người dùng nhận từ API (/auth/me hoặc /auth/login)
 * @returns {Object} Đối tượng Tourist Model chuẩn hóa cho giao diện
 */
export function transformTouristData(rawUser = {}) {
  const wallet = rawUser?.wallet || {};
  const touristProfile = rawUser?.tourist_profile || {};
  const socialProfile = rawUser?.social_profile || {};

  return {
    id: rawUser?.id || null,
    name: rawUser?.name || "Du khách",
    email: rawUser?.email || "",
    avatarUrl: rawUser?.avatar_url || socialProfile?.avatar_url || null,
    role: rawUser?.role || UserRole.Tourist,
    status: rawUser?.status || UserStatus.Active,
    phoneNumber: touristProfile?.phone_number || "",
    nationality: touristProfile?.nationality || "Việt Nam",

    // Thông tin ví & tài chính
    wallet: {
      balance: Number(wallet?.balance || 0),
      lockedBalance: Number(wallet?.locked_balance || 0),
      currency: wallet?.currency || "VND",
      formattedBalance: formatCurrency(wallet?.balance || 0, wallet?.currency || "VND"),
    },

    // Thông tin mạng xã hội
    social: {
      username: socialProfile?.username || "traveler",
      bio: socialProfile?.bio || "",
      isVerified: Boolean(socialProfile?.is_verified),
      followersCount: Number(socialProfile?.followers_count || 0),
      followingCount: Number(socialProfile?.following_count || 0),
    },
  };
}

/**
 * Định dạng số tiền sang chuẩn hiển thị tiếng Việt (VND)
 */
export function formatCurrency(amount = 0, currency = "VND") {
  return `${Number(amount).toLocaleString("vi-VN")} ${currency}`;
}

/**
 * Kiểm tra xem du khách có đủ số dư ví để thanh toán đơn hàng hay không
 */
export function hasSufficientBalance(touristModel, requiredAmount) {
  if (!touristModel?.wallet?.balance) return false;
  return touristModel.wallet.balance >= Number(requiredAmount);
}
