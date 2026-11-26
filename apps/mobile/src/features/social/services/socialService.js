import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import apiClient from "../../../lib/apiClient";

/**
 * Nén và chuẩn hóa ảnh về JPEG dung lượng nhẹ trước khi tải lên Server,
 * tránh lỗi vượt giới hạn upload_max_filesize (2MB) hoặc định dạng HEIC từ điện thoại.
 */
async function prepareImageForUpload(asset, maxWidth = 1280) {
  const uri = asset?.uri;
  if (!uri) {
    throw new Error("Không tìm thấy tệp hình ảnh để tải lên.");
  }

  try {
    const actions =
      typeof asset?.width === "number" && asset.width > 0 && asset.width <= maxWidth
        ? []
        : [{ resize: { width: maxWidth } }];

    const result = await manipulateAsync(uri, actions, {
      compress: 0.72,
      format: SaveFormat.JPEG,
    });

    return {
      uri: result.uri,
      name: `stb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`,
      type: "image/jpeg",
    };
  } catch {
    const rawName = asset?.fileName || uri.split("/").pop() || `stb_${Date.now()}.jpg`;
    const hasValidExt = /\.(jpe?g|png|webp)$/i.test(rawName);
    const safeName = hasValidExt ? rawName : `${rawName.replace(/\.[^.]+$/, "")}.jpg`;
    const lower = safeName.toLowerCase();
    const safeMime = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    return {
      uri,
      name: safeName,
      type: safeMime,
    };
  }
}

async function uploadSingleMedia(type, asset, maxWidth) {
  const filePart = await prepareImageForUpload(asset, maxWidth);
  const response = await apiClient.uploadFile("/media/upload", {
    uri: filePart.uri,
    fieldName: "file",
    mimeType: filePart.type,
    parameters: { type },
  });
  return response?.data || null;
}

/**
 * Service giao tiếp API cho phân hệ Mạng xã hội Du lịch (/api/v1/social/*).
 */
export const socialService = {
  async getMyProfile() {
    const response = await apiClient.get("/social/profile/me");
    return response?.data || { is_initialized: false, social_active: false, profile: null };
  },

  async uploadAvatar(asset) {
    return uploadSingleMedia("avatar", asset, 600);
  },

  async setupProfile(payload) {
    const response = await apiClient.post("/social/profile", {
      username: String(payload?.username || "").trim(),
      display_name: String(payload?.display_name || "").trim(),
      bio: String(payload?.bio || "").trim() || null,
      avatar_url: String(payload?.avatar_url || "").trim() || null,
      website_url: String(payload?.website_url || "").trim() || null,
    });
    return {
      data: response?.data || null,
      message: response?.message || "Đã lưu hồ sơ mạng xã hội thành công.",
    };
  },

  async getUserProfile(userId) {
    const response = await apiClient.get(`/social/users/${userId}`);
    return response?.data || null;
  },

  async toggleFollow(userId) {
    const response = await apiClient.post(`/social/users/${userId}/follow`, {});
    return response?.data || null;
  },

  async getPosts({ tab = "for_you", userId, q, tag, page = 1, perPage = 15 } = {}) {
    const params = new URLSearchParams();
    params.append("tab", tab);
    params.append("page", String(page));
    params.append("per_page", String(perPage));
    if (userId) params.append("user_id", String(userId));
    if (q && String(q).trim()) params.append("q", String(q).trim());
    if (tag && String(tag).trim()) params.append("tag", String(tag).trim());

    const response = await apiClient.get(`/social/posts?${params.toString()}`);
    return {
      items: Array.isArray(response?.data) ? response.data : [],
      meta: response?.meta || { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
    };
  },

  async uploadPostImages(assets = []) {
    const validAssets = Array.isArray(assets) ? assets.filter((a) => a?.uri) : [];
    if (validAssets.length === 0) return [];

    const uploadedUrls = [];
    for (const asset of validAssets) {
      const uploaded = await uploadSingleMedia("post", asset, 1280);
      if (uploaded?.url) {
        uploadedUrls.push(uploaded.url);
      }
    }
    return uploadedUrls;
  },

  async getLocations() {
    const response = await apiClient.get("/public/locations");
    return Array.isArray(response?.data) ? response.data : [];
  },

  async searchServices(q = "") {
    const params = new URLSearchParams();
    if (String(q || "").trim()) params.append("q", String(q).trim());
    params.append("per_page", "8");
    const response = await apiClient.get(`/public/services?${params.toString()}`);
    return Array.isArray(response?.data) ? response.data : [];
  },

  async createPost({
    content = "",
    location_name,
    service_id,
    visibility = "public",
    tags = [],
    media_urls = [],
  }) {
    const cleanContent = String(content || "").trim();
    const response = await apiClient.post("/social/posts", {
      content: cleanContent || null,
      location_name: String(location_name || "").trim() || null,
      service_id: service_id || null,
      visibility,
      tags,
      media_urls,
    });
    return {
      data: response?.data || null,
      message: response?.message || "Đã đăng bài viết thành công.",
    };
  },

  async updatePost(postId, payload) {
    const response = await apiClient.put(`/social/posts/${postId}`, payload);
    return {
      data: response?.data || null,
      message: response?.message || "Đã cập nhật bài viết.",
    };
  },

  async deletePost(postId) {
    const response = await apiClient.delete(`/social/posts/${postId}`);
    return {
      message: response?.message || "Đã xóa bài viết.",
    };
  },

  async toggleLike(postId) {
    const response = await apiClient.post(`/social/posts/${postId}/like`, {});
    return response?.data || null;
  },

  async toggleSave(postId) {
    const response = await apiClient.post(`/social/posts/${postId}/save`, {});
    return response?.data || null;
  },

  async getComments(postId, { page = 1, perPage = 30 } = {}) {
    const response = await apiClient.get(
      `/social/posts/${postId}/comments?page=${page}&per_page=${perPage}`,
    );
    return {
      items: Array.isArray(response?.data) ? response.data : [],
      meta: response?.meta || { current_page: 1, last_page: 1, total: 0 },
    };
  },

  async addComment(postId, content) {
    const response = await apiClient.post(`/social/posts/${postId}/comments`, {
      content: String(content || "").trim(),
    });
    return response?.data || null;
  },

  async search(q = "") {
    const qs = new URLSearchParams({ q: String(q || "").trim() }).toString();
    const response = await apiClient.get(`/social/search?${qs}`);
    return response?.data || { query: q, profiles: [], posts: [], trending_tags: [] };
  },

  async getActivity({ page = 1, perPage = 30 } = {}) {
    const response = await apiClient.get(`/social/activity?page=${page}&per_page=${perPage}`);
    return {
      items: Array.isArray(response?.data) ? response.data : [],
      unreadCount: Number(response?.unread_count || 0),
      meta: response?.meta || { current_page: 1, last_page: 1, total: 0 },
    };
  },

  async markActivityRead() {
    const response = await apiClient.post("/social/activity/read", {});
    return response?.data || { marked_read: 0 };
  },
};

export default socialService;
