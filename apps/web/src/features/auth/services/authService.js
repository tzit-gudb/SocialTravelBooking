import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../../../lib/firebase.config";
import apiClient, { tokenStorage } from "../../../lib/apiClient";

/**
 * Dịch vụ Xác thực hợp nhất (Web Portal):
 * - Đăng nhập / Đăng ký qua Firebase Auth và đồng bộ firebase_uid, email, password vào Postgres DB (/auth/sync)
 * - Hỗ trợ Đăng nhập Google OAuth qua Firebase + Đồng bộ Postgres (/auth/sync)
 * - Fallback trực tiếp Backend API (/auth/login, /auth/register)
 */
export const authService = {
  /**
   * Đăng nhập bằng Email & Mật khẩu
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
      console.warn("[Auth] Firebase email sign-in fallback:", fbError.code || fbError.message);
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
        },
        { token: idToken },
      );
    } else {
      // Fallback: Gọi trực tiếp /auth/login của Backend
      response = await apiClient.post("/auth/login", {
        email: trimmedEmail,
        password,
      });
    }

    if (response?.token) {
      tokenStorage.setToken(response.token);
    }
    if (response?.data) {
      tokenStorage.setUser(response.data);
    }

    return response;
  },

  /**
   * Đăng ký tài khoản mới (Provider trên Web)
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
      console.warn("[Auth] Firebase create user fallback:", fbError.code || fbError.message);
    }

    let response;
    if (firebaseUser && idToken) {
      response = await apiClient.post(
        "/auth/sync",
        {
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email || trimmedEmail,
          password: payload.password,
          role: payload.role || "provider",
          name: payload.name,
          business_name: payload.business_name,
        },
        { token: idToken },
      );
    } else {
      response = await apiClient.post("/auth/register", payload);
    }

    if (response?.token) {
      tokenStorage.setToken(response.token);
    }
    if (response?.data) {
      tokenStorage.setUser(response.data);
    }

    return response;
  },

  /**
   * Đăng nhập nhanh bằng tài khoản Google (Firebase OAuth -> Backend Sync)
   * Nền tảng Web độc quyền
   */
  async loginWithGoogle(role = "provider") {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const firebaseUser = credential.user;
    const idToken = await firebaseUser.getIdToken();

    const response = await apiClient.post(
      "/auth/sync",
      {
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        avatarUrl: firebaseUser.photoURL,
        role,
      },
      { token: idToken },
    );

    if (response?.token) {
      tokenStorage.setToken(response.token);
    }
    if (response?.data) {
      tokenStorage.setUser(response.data);
    }

    return response;
  },

  /**
   * Lấy thông tin người dùng hiện tại từ Server (/auth/me)
   */
  async fetchCurrentUser() {
    const response = await apiClient.get("/auth/me");
    if (response?.data) {
      tokenStorage.setUser(response.data);
    }
    return response?.data;
  },

  /**
   * Đăng xuất khỏi hệ thống
   */
  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Bỏ qua nếu token đã hết hạn trên server
    }

    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch {
      // Bỏ qua nếu không đăng nhập qua Firebase
    }

    tokenStorage.clearAll();
  },
};

export default authService;
