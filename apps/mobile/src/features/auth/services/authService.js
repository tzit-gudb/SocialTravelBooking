import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../../../lib/firebase.config";
import apiClient, { mobileSessionStore } from "../../../lib/apiClient";

/**
 * Dịch vụ Xác thực cho Mobile App (@stb/mobile):
 * - Đăng nhập & Đăng ký bằng Email/Password qua Firebase Authentication.
 * - Lấy firebase_uid và đồng bộ trực tiếp vào bảng users trong database qua API /auth/sync.
 * - Fallback gọi trực tiếp backend API (/auth/login, /auth/register) nếu cần.
 */
export const authService = {
  /**
   * Đăng nhập bằng Email & Password trên Mobile
   */
  async login(email, password) {
    const trimmedEmail = email.trim();
    let firebaseUser = null;
    let idToken = null;

    try {
      if (auth) {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        firebaseUser = userCredential.user;
        idToken = await firebaseUser.getIdToken();
      }
    } catch (fbError) {
      console.warn("[Mobile Auth] Firebase sign-in notice:", fbError.code || fbError.message);
    }

    let response;
    if (firebaseUser && idToken) {
      // Đồng bộ thông tin đã xác thực vào Postgres users table
      response = await apiClient.post(
        "/auth/sync",
        {
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email || trimmedEmail,
          password,
          role: "tourist",
        },
        { token: idToken },
      );
    } else {
      // Fallback gọi trực tiếp backend
      response = await apiClient.post("/auth/login", {
        email: trimmedEmail,
        password,
      });
    }

    if (response?.token) {
      mobileSessionStore.setToken(response.token);
    }
    if (response?.data) {
      mobileSessionStore.setUser(response.data);
    }

    return response;
  },

  /**
   * Đăng ký tài khoản Tourist mới bằng Email & Password trên Mobile
   */
  async register(payload) {
    const trimmedEmail = payload.email.trim();
    let firebaseUser = null;
    let idToken = null;

    try {
      if (auth) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          payload.password,
        );
        firebaseUser = userCredential.user;
        idToken = await firebaseUser.getIdToken();
      }
    } catch (fbError) {
      console.warn("[Mobile Auth] Firebase register notice:", fbError.code || fbError.message);
    }

    let response;
    if (firebaseUser && idToken) {
      response = await apiClient.post(
        "/auth/sync",
        {
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email || trimmedEmail,
          password: payload.password,
          role: "tourist",
        },
        { token: idToken },
      );
    } else {
      response = await apiClient.post("/auth/register", {
        ...payload,
        email: trimmedEmail,
        role: "tourist",
      });
    }

    if (response?.token) {
      mobileSessionStore.setToken(response.token);
    }
    if (response?.data) {
      mobileSessionStore.setUser(response.data);
    }

    return response;
  },

  /**
   * Lấy thông tin người dùng hiện tại từ Server (/auth/me)
   */
  async fetchCurrentUser() {
    const response = await apiClient.get("/auth/me");
    if (response?.data) {
      mobileSessionStore.setUser(response.data);
    }
    return response?.data;
  },

  /**
   * Đăng xuất khỏi thiết bị
   */
  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Bỏ qua lỗi mạng khi đăng xuất
    }

    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch {
      // Bỏ qua nếu không đăng nhập Firebase
    }

    mobileSessionStore.clearAll();
  },
};

export default authService;
