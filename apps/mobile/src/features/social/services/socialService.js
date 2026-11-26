import apiClient from "../../../lib/apiClient";

/**
 * Service giao tiếp API cho phân hệ Mạng xã hội Du lịch (/api/v1/social/*).
 */
export const socialService = {
  async getMyProfile() {
    const response = await apiClient.get("/social/profile/me");
    return response?.data || { is_initialized: false, social_active: false, profile: null };
  },

  async uploadAvatar(asset) {
    const formData = new FormData();
    formData.append("type", "avatar");
    const uri = asset?.uri;
    const fileName = asset?.fileName || uri?.split("/").pop() || `avatar_${Date.now()}.jpg`;
    const mimeType =
      asset?.mimeType || (fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

    formData.append("file", {
      uri,
      name: fileName,
      type: mimeType,
    });

    const response = await apiClient.post("/media/upload", formData);
    return response?.data || null;
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

  async createPost({ content, location_name, service_id, tags = [], media_urls = [] }) {
    const response = await apiClient.post("/social/posts", {
      content: String(content || "").trim(),
      location_name: String(location_name || "").trim() || null,
      service_id: service_id || null,
      tags,
      media_urls,
    });
    return {
      data: response?.data || null,
      message: response?.message || "Đã đăng bài viết thành công.",
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
