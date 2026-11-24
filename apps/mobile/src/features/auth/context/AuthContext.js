import React, { createContext, useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import authService from "../services/authService";
import apiClient, { mobileSessionStore } from "../../../lib/apiClient";
import { auth } from "../../../lib/firebase.config";

const AUTH_SESSION_STORAGE_KEY = "@stb_auth_session_v1";

export const AuthContext = createContext(null);

async function persistSession(token, user) {
  if (!token || !user) return;
  try {
    await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token, user }));
  } catch (err) {
    console.warn("[AuthContext] Failed to persist session to AsyncStorage:", err?.message || err);
  }
}

async function clearPersistedSession() {
  try {
    await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn("[AuthContext] Failed to clear session from AsyncStorage:", err?.message || err);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribeFirebase = null;

    const trySyncFirebaseUser = async (fbUser) => {
      if (!fbUser) return false;
      try {
        const idToken = await fbUser.getIdToken();
        const syncRes = await apiClient.post(
          "/auth/sync",
          {
            firebase_uid: fbUser.uid,
            email: fbUser.email || "",
            role: "tourist",
          },
          { token: idToken },
        );
        if (mounted && syncRes?.token && syncRes?.data) {
          mobileSessionStore.setToken(syncRes.token);
          mobileSessionStore.setUser(syncRes.data);
          setUser(syncRes.data);
          await persistSession(syncRes.token, syncRes.data);
          return true;
        }
      } catch {
        // Bỏ qua nếu không thể đồng bộ lại từ Firebase
      }
      return false;
    };

    const restoreSession = async () => {
      let hasLocalSession = false;
      try {
        const raw = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const savedToken = parsed?.token || null;
          const savedUser = parsed?.user || null;

          if (savedToken && savedUser) {
            hasLocalSession = true;
            mobileSessionStore.setToken(savedToken);
            mobileSessionStore.setUser(savedUser);
            if (mounted) {
              setUser(savedUser);
              setIsLoading(false);
            }

            // Xác thực ngầm token với máy chủ
            try {
              const meRes = await apiClient.get("/auth/me", { token: savedToken });
              if (mounted && meRes?.data) {
                mobileSessionStore.setUser(meRes.data);
                setUser(meRes.data);
                await persistSession(savedToken, meRes.data);
              }
            } catch (err) {
              if (err?.status === 401) {
                const recovered = await trySyncFirebaseUser(auth?.currentUser);
                if (!recovered) {
                  mobileSessionStore.clearAll();
                  await clearPersistedSession();
                  if (mounted) setUser(null);
                }
              }
            }
          } else {
            await clearPersistedSession();
          }
        }
      } catch {
        await clearPersistedSession();
      }

      if (!hasLocalSession && auth) {
        await new Promise((resolve) => {
          let settled = false;
          const finish = () => {
            if (!settled) {
              settled = true;
              resolve();
            }
          };

          const timeout = setTimeout(finish, 1500);
          unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
            clearTimeout(timeout);
            if (fbUser && !mobileSessionStore.getToken()) {
              await trySyncFirebaseUser(fbUser);
            }
            finish();
          });
        });
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
      if (typeof unsubscribeFirebase === "function") {
        unsubscribeFirebase();
      }
    };
  }, []);

  const login = async (email, password) => {
    setIsSubmitting(true);
    try {
      const response = await authService.login(email, password);
      const token = response?.token || mobileSessionStore.getToken();
      const nextUser = response?.data || null;
      setUser(nextUser);
      await persistSession(token, nextUser);
      return {
        success: true,
        user: nextUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Email hoặc mật khẩu chưa chính xác.",
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
      const token = response?.token || mobileSessionStore.getToken();
      const nextUser = response?.data || null;
      setUser(nextUser);
      await persistSession(token, nextUser);
      return {
        success: true,
        user: nextUser,
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

  const logout = async () => {
    await authService.logout();
    await clearPersistedSession();
    setUser(null);
  };

  const updateUser = useCallback((updatedData) => {
    setUser((prevUser) => {
      const nextUser =
        typeof updatedData === "function" ? updatedData(prevUser) : { ...prevUser, ...updatedData };
      mobileSessionStore.setUser(nextUser);
      const currentToken = mobileSessionStore.getToken();
      if (currentToken && nextUser) {
        persistSession(currentToken, nextUser);
      }
      return nextUser;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        isSubmitting,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
