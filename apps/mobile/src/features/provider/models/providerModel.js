import { ProviderStatus } from "@stb/shared-types";

// Re-export trực tiếp từ Shared Types để đảm bảo Single Source of Truth
export { ProviderStatus };

export const PROVIDER_STATUS = ProviderStatus;

/**
 * Chuẩn hóa dữ liệu Nhà cung cấp từ API Backend
 * @param {Object} rawUser - Payload từ API
 * @returns {Object} Provider Model
 */
export function transformProviderData(rawUser = {}) {
  const profile = rawUser?.provider_profile || {};
  const wallet = rawUser?.wallet || {};

  return {
    id: rawUser?.id || null,
    name: rawUser?.name || "Đối tác",
    email: rawUser?.email || "",
    role: rawUser?.role || "provider",
    businessName: profile?.business_name || `${rawUser?.name || "Đối tác"} Travel`,
    businessType: profile?.business_type || "Tour & Lưu trú",
    address: profile?.address || "Đang cập nhật",
    phone: profile?.phone || "",
    status: profile?.status || PROVIDER_STATUS.PENDING,
    isApproved: profile?.status === PROVIDER_STATUS.APPROVED,

    // Doanh thu & ví đối tác
    wallet: {
      balance: Number(wallet?.balance || 0),
      currency: wallet?.currency || "VND",
      formattedBalance: `${Number(wallet?.balance || 0).toLocaleString("vi-VN")} ₫`,
    },
  };
}

/**
 * Kiểm tra xem Nhà cung cấp có đủ thẩm quyền quét mã QR check-in hay không
 */
export function canScanCheckin(providerModel) {
  return Boolean(providerModel?.isApproved);
}
