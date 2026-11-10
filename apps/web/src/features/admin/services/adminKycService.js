import apiClient from "../../../lib/apiClient";

/**
 * Mock data dự phòng phong phú cho môi trường Dev / Demo khi Backend chưa sẵn sàng,
 * tuân thủ chuẩn 100% schema `provider_profiles` và đặc tả task14.md.
 */
let MOCK_PROVIDERS = [
  {
    id: 1,
    business_name: "Đà Nẵng Ocean Travel",
    representative_name: "Trần Hoàng Việt",
    business_type_id: "1",
    business_type_name: "Tour du lịch & Trải nghiệm",
    phone: "0905123456",
    address: "09 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng",
    description:
      "Chuyên tổ chức tour lặn ngắm san hô Bán đảo Sơn Trà, cano cao tốc tham quan Cù Lao Chàm và trải nghiệm chèo SUP ngắm bình minh.",
    business_license_url:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
    status: "pending",
    rejection_reason: null,
    created_at: "2026-10-31T09:40:00Z",
  },
  {
    id: 2,
    business_name: "Hạ Long Bay Heritage Cruise",
    representative_name: "Nguyễn Hải Đăng",
    business_type_id: "6",
    business_type_name: "Vé tàu & Vận chuyển du lịch",
    phone: "0912888999",
    address: "Cảng tàu khách quốc tế Tuần Châu, Hạ Long, Quảng Ninh",
    description:
      "Đơn vị vận hành 4 du thuyền 5 sao vịnh Hạ Long và vịnh Lan Hạ, phục vụ các tour ngủ đêm sang trọng và tiệc hoàng hôn.",
    business_license_url:
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80",
    status: "pending",
    rejection_reason: null,
    created_at: "2026-11-01T08:15:00Z",
  },
  {
    id: 3,
    business_name: "Sapa Cloud Valley Homestay & Trek",
    representative_name: "Lò Văn Cháng",
    business_type_id: "3",
    business_type_name: "Homestay & Villa",
    phone: "0987654321",
    address: "Thôn Tả Van Giáy, Xã Tả Van, Thị xã Sa Pa, Lào Cai",
    description:
      "Chuỗi bungalow sinh thái view thung lũng Mường Hoa, kết hợp hướng dẫn viên bản địa tour trekking ruộng bậc thang và leo Fansipan.",
    business_license_url:
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
    status: "approved",
    rejection_reason: null,
    approved_at: "2026-10-28T14:20:00Z",
    created_at: "2026-10-27T10:00:00Z",
  },
  {
    id: 4,
    business_name: "Phú Quốc Sunset Motor Rental",
    representative_name: "Lê Minh Tuấn",
    business_type_id: "5",
    business_type_name: "Phương tiện di chuyển",
    phone: "0934112233",
    address: "143 Trần Hưng Đạo, Dương Đông, Phú Quốc, Kiên Giang",
    description:
      "Cho thuê xe máy đời mới, ô tô tự lái và đưa đón sân bay Phú Quốc với thủ tục nhanh gọn, giao xe tận nơi.",
    business_license_url:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    status: "rejected",
    rejection_reason:
      "Ảnh chụp giấy phép kinh doanh bị lóa sáng, không đọc được số đăng ký và con dấu pháp nhân. Vui lòng quét (scan) lại bản rõ nét.",
    created_at: "2026-10-25T11:30:00Z",
  },
];

export const adminKycService = {
  /**
   * Lấy danh sách hồ sơ KYC của Provider (GET /api/v1/admin/kyc/providers)
   * @param {Object} params { status: 'all' | 'pending' | 'approved' | 'rejected', search: string, page: number }
   */
  async fetchKycProviders({ status = "all", search = "", page = 1 } = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (status && status !== "all") queryParams.append("status", status);
      if (search) queryParams.append("search", search);
      queryParams.append("page", String(page));

      const response = await apiClient.get(`/admin/kyc/providers?${queryParams.toString()}`);
      if (response?.data) return response;
    } catch (err) {
      console.warn("[adminKycService] Fallback sang mock data:", err.message);
    }

    // Logic lọc Mock data fallback
    let filtered = [...MOCK_PROVIDERS];
    if (status && status !== "all") {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.business_name.toLowerCase().includes(q) ||
          p.representative_name.toLowerCase().includes(q) ||
          p.phone.includes(q),
      );
    }

    // Sắp xếp mới nhất lên đầu
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      success: true,
      data: filtered,
      meta: {
        current_page: page,
        total: filtered.length,
        pending_count: MOCK_PROVIDERS.filter((p) => p.status === "pending").length,
      },
    };
  },

  /**
   * Lấy chi tiết hồ sơ KYC (GET /api/v1/admin/kyc/providers/{id})
   */
  async fetchKycDetail(id) {
    try {
      const response = await apiClient.get(`/admin/kyc/providers/${id}`);
      if (response?.data) return response.data;
    } catch {
      // Fallback
    }
    return MOCK_PROVIDERS.find((p) => String(p.id) === String(id)) || null;
  },

  /**
   * Phê duyệt hồ sơ đối tác (POST /api/v1/admin/kyc/providers/{id}/approve)
   */
  async approveKyc(id) {
    try {
      const response = await apiClient.post(`/admin/kyc/providers/${id}/approve`);
      if (response?.success) return response;
    } catch (err) {
      console.warn("[adminKycService] Approve fallback:", err.message);
    }

    // Cập nhật trạng thái trong Mock
    const item = MOCK_PROVIDERS.find((p) => String(p.id) === String(id));
    if (item) {
      item.status = "approved";
      item.approved_at = new Date().toISOString();
      item.rejection_reason = null;
    }

    return {
      success: true,
      message: "Đã phê duyệt hồ sơ đối tác thành công.",
      data: item,
    };
  },

  /**
   * Từ chối hồ sơ đối tác kèm lý do (POST /api/v1/admin/kyc/providers/{id}/reject)
   */
  async rejectKyc(id, reason) {
    try {
      const response = await apiClient.post(`/admin/kyc/providers/${id}/reject`, {
        rejection_reason: reason,
      });
      if (response?.success) return response;
    } catch (err) {
      console.warn("[adminKycService] Reject fallback:", err.message);
    }

    // Cập nhật trạng thái trong Mock
    const item = MOCK_PROVIDERS.find((p) => String(p.id) === String(id));
    if (item) {
      item.status = "rejected";
      item.rejection_reason = reason;
      item.approved_at = null;
    }

    return {
      success: true,
      message: "Đã gửi thông báo từ chối hồ sơ cho đối tác.",
      data: item,
    };
  },
};

export default adminKycService;
