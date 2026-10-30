import { auth } from "./firebase.config";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const TOKEN_STORAGE_KEY = "stb_auth_token";
const USER_STORAGE_KEY = "stb_auth_user";

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_STORAGE_KEY),
  setToken: (token) => {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clearToken: () => localStorage.removeItem(TOKEN_STORAGE_KEY),

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },
  clearUser: () => localStorage.removeItem(USER_STORAGE_KEY),

  clearAll: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },
};

/**
 * Lấy Bearer Token hiện hành (ưu tiên Sanctum Token, fallback sang Firebase ID Token)
 */
async function resolveBearerToken(explicitToken) {
  if (explicitToken) return explicitToken;

  const savedToken = tokenStorage.getToken();
  if (savedToken) return savedToken;

  if (auth?.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Trích xuất lý do lỗi thân thiện với người dùng cuối,
 * tuyệt đối không làm rò rỉ endpoint, URL, status code hay stack trace ra giao diện.
 */
function resolveFriendlyErrorMessage(status, payload) {
  // 1. Nếu có lỗi validation chi tiết theo trường (từ FormRequest)
  if (payload?.errors && typeof payload.errors === "object") {
    const firstFieldKey = Object.keys(payload.errors)[0];
    const fieldMessages = payload.errors[firstFieldKey];
    if (Array.isArray(fieldMessages) && fieldMessages.length > 0) {
      return fieldMessages[0];
    }
  }

  // 2. Nếu server trả về message nghiệp vụ
  const rawMessage = payload?.message;
  if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
    const isTechnicalLeak =
      /sqlstate|exception|syntax error|curl|stack trace|at line|\.php|localhost|127\.0\.0\.1|app\\http/i.test(
        rawMessage,
      );
    if (!isTechnicalLeak) {
      return rawMessage;
    }
  }

  // 3. Fallback theo chuẩn mã trạng thái HTTP
  switch (status) {
    case 400:
      return "Yêu cầu không hợp lệ hoặc dữ liệu gửi lên chưa đúng.";
    case 401:
      return "Phiên đăng nhập đã hết hạn hoặc thông tin xác thực chưa chính xác.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 413:
      return "Dung lượng dữ liệu gửi lên vượt quá giới hạn cho phép.";
    case 422:
      return "Thông tin nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.";
    case 429:
      return "Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau giây lát.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Máy chủ đang gặp sự cố gián đoạn. Vui lòng thử lại sau.";
    default:
      return "Đã có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.";
  }
}

/**
 * HTTP Client chuẩn hóa kết nối từ Web Portal tới Laravel Backend API
 */
async function request(endpoint, options = {}) {
  const { method = "GET", body, headers = {}, token } = options;

  const bearerToken = await resolveBearerToken(token);

  const requestHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Platform": "web",
    ...headers,
  };

  if (bearerToken) {
    requestHeaders.Authorization = `Bearer ${bearerToken}`;
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
    // In log kỹ thuật ra console/terminal cho lập trình viên
    console.error(`[API Network Error] ${method} ${url}:`, netErr);

    // Giao diện chỉ nhận lý do thân thiện, không chứa URL hay cổng
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
    // In log chi tiết endpoint, HTTP status và payload đầy đủ cho lập trình viên
    console.error(`[API Error] ${method} ${url} [HTTP ${response.status}]:`, payload);

    // Giao diện người dùng chỉ nhận lý do lỗi thực tế
    const friendlyReason = resolveFriendlyErrorMessage(response.status, payload);
    const apiError = new Error(friendlyReason);
    apiError.status = response.status;
    apiError.endpoint = endpoint;
    apiError.errors = payload?.errors || null;
    apiError.data = payload;
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
