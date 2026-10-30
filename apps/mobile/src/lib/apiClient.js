import { Platform } from "react-native";

/**
 * Tự động xác định URL kết nối tới Laravel Backend API:
 * - Ưu tiên biến môi trường EXPO_PUBLIC_API_BASE_URL
 * - Máy ảo Android (Android Emulator): 10.0.2.2:8000
 * - iOS Simulator / Web: localhost:8000
 */
function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && !envUrl.includes("YOUR_LAN_IP")) {
    return envUrl;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000/api/v1";
  }
  return "http://localhost:8000/api/v1";
}

export const API_BASE_URL = resolveApiBaseUrl();

// Bộ nhớ phiên trong RAM (tương thích hoàn toàn với Expo Go mà không phụ thuộc module native)
let inMemoryToken = null;
let inMemoryUser = null;

export const mobileSessionStore = {
  getToken: () => inMemoryToken,
  setToken: (token) => {
    inMemoryToken = token || null;
  },
  getUser: () => inMemoryUser,
  setUser: (user) => {
    inMemoryUser = user || null;
  },
  clearAll: () => {
    inMemoryToken = null;
    inMemoryUser = null;
  },
};

/**
 * Trích xuất lý do lỗi thân thiện với người dùng Mobile,
 * giấu kín hoàn toàn URL, địa chỉ IP (như 10.0.2.2), endpoint hoặc status code.
 */
function resolveFriendlyErrorMessage(status, payload) {
  // 1. Ưu tiên lỗi xác thực form chi tiết theo từng trường (Validation errors)
  if (payload?.errors && typeof payload.errors === "object") {
    const firstFieldKey = Object.keys(payload.errors)[0];
    const fieldMessages = payload.errors[firstFieldKey];
    if (Array.isArray(fieldMessages) && fieldMessages.length > 0) {
      return fieldMessages[0];
    }
  }

  // 2. Thông báo nghiệp vụ từ backend nếu có
  const rawMessage = payload?.message;
  if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
    const isTechnical =
      /sqlstate|exception|syntax error|curl|stack trace|at line|\.php|localhost|10\.0\.2\.2|127\.0\.0\.1/i.test(
        rawMessage,
      );
    if (!isTechnical) {
      return rawMessage;
    }
  }

  // 3. Fallback theo mã trạng thái HTTP chuẩn
  switch (status) {
    case 400:
      return "Thông tin gửi lên chưa hợp lệ.";
    case 401:
      return "Phiên đăng nhập đã hết hạn hoặc thông tin đăng nhập chưa đúng.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 413:
      return "Dung lượng dữ liệu vượt quá giới hạn cho phép.";
    case 422:
      return "Thông tin nhập vào chưa đúng định dạng. Vui lòng kiểm tra lại.";
    case 429:
      return "Thao tác quá nhanh. Vui lòng chờ trong giây lát rồi thử lại.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Hệ thống đang bảo trì hoặc gặp sự cố gián đoạn. Vui lòng thử lại sau.";
    default:
      return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  }
}

async function request(endpoint, options = {}) {
  const { method = "GET", body, headers = {}, token } = options;

  const activeToken = token || mobileSessionStore.getToken();

  const requestHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Platform": "mobile",
    ...headers,
  };

  if (activeToken) {
    requestHeaders.Authorization = `Bearer ${activeToken}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    // In chi tiết lỗi kỹ thuật và endpoint ra terminal Metro / log cho lập trình viên
    console.error(`[Mobile API Network Error] ${method} ${url}:`, netErr);

    // Người dùng chỉ nhận thông báo lý do thuần túy, không có URL hay IP
    const netError = new Error(
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.",
    );
    netError.status = 0;
    netError.endpoint = endpoint;
    throw netError;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // In chi tiết lỗi, endpoint và status code ra terminal Metro / console cho lập trình viên
    console.error(`[Mobile API Error] ${method} ${url} [HTTP ${response.status}]:`, payload);

    // Người dùng chỉ thấy lý do lỗi, không có mã lỗi kỹ thuật
    const friendlyReason = resolveFriendlyErrorMessage(response.status, payload);
    const apiError = new Error(friendlyReason);
    apiError.status = response.status;
    apiError.endpoint = endpoint;
    apiError.errors = payload?.errors || null;
    throw apiError;
  }

  return payload;
}

const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PUT", body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: "DELETE" }),
};

export default apiClient;
