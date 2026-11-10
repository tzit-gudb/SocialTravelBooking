import { createContext } from "react";

export const AuthContext = createContext(null);

/**
 * Xác định route điều hướng mặc định theo vai trò và trạng thái hoàn tất hồ sơ
 */
export function getDashboardRouteByRole(role, user = null) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "provider":
      // Nếu Provider chưa hoàn thiện hồ sơ hoặc chưa được Admin phê duyệt (approved) -> Onboarding
      if (!user?.provider_profile || user?.provider_profile?.status !== "approved") {
        return "/provider/onboarding";
      }
      return "/provider/dashboard";
    case "tourist":
    default:
      return "/unsupported";
  }
}
