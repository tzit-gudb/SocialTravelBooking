import React, { useState, useEffect, useCallback } from "react";
import authService from "../services/authService";
import { tokenStorage } from "../../../lib/apiClient";
import { AuthContext, getDashboardRouteByRole } from "./authContextStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenStorage.getUser());
  const [isLoading, setIsLoading] = useState(() => Boolean(tokenStorage.getToken()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verifySession = useCallback(async () => {
    const existingToken = tokenStorage.getToken();
    if (!existingToken) {
      setIsLoading(false);
      return;
    }

    try {
      const freshUser = await authService.fetchCurrentUser();
      setUser(freshUser || null);
    } catch {
      tokenStorage.clearAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const existingToken = tokenStorage.getToken();

    if (existingToken) {
      authService
        .fetchCurrentUser()
        .then((freshUser) => {
          if (isMounted) setUser(freshUser || null);
        })
        .catch(() => {
          tokenStorage.clearAll();
          if (isMounted) setUser(null);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setIsSubmitting(true);
    try {
      const response = await authService.login(email, password);
      setUser(response.data);
      return {
        success: true,
        user: response.data,
        redirectTo: getDashboardRouteByRole(response.data?.role, response.data),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Thông tin đăng nhập không chính xác.",
        errors: error.errors || null,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async (payload) => {
    setIsSubmitting(true);
    try {
      const response = await authService.register(payload);
      setUser(response.data);
      return {
        success: true,
        user: response.data,
        redirectTo: getDashboardRouteByRole(response.data?.role, response.data),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Không thể hoàn tất đăng ký tài khoản.",
        errors: error.errors || null,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginWithGoogle = async (role = "provider") => {
    setIsSubmitting(true);
    try {
      const response = await authService.loginWithGoogle(role);
      setUser(response.data);
      return {
        success: true,
        user: response.data,
        redirectTo: getDashboardRouteByRole(response.data?.role, response.data),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Không thể xác thực qua tài khoản Google lúc này.",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(user),
    isLoading,
    isSubmitting,
    login,
    register,
    loginWithGoogle,
    logout,
    refreshUser: verifySession,
    getDashboardRouteByRole: (r, u = user) => getDashboardRouteByRole(r, u),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
