import { createContext } from "react";

export const AuthContext = createContext(null);

export function getDashboardRouteByRole(role) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "provider":
      return "/provider/dashboard";
    case "tourist":
    default:
      return "/unsupported";
  }
}
