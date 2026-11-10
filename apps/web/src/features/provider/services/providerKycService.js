import apiClient from "../../../lib/apiClient";

/**
 * Service xử lý giao tiếp API KYC & Onboarding của Provider với Laravel Backend
 */
export const providerKycService = {
  /**
   * Nộp hồ sơ xét duyệt KYC (hỗ trợ FormData hoặc JSON)
   * Tự động đóng gói FormData nhị phân nếu có tệp tin File thực tế từ máy người dùng.
   * POST /api/v1/provider/kyc/submit
   */
  async submitKyc(payload) {
    // Nếu payload đã là instance FormData chuẩn
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      return await apiClient.post("/provider/kyc/submit", payload);
    }

    const hasLocalFiles = Array.isArray(payload?.license_files) && payload.license_files.length > 0;

    if (hasLocalFiles) {
      const data = new FormData();
      data.append("business_name", payload.business_name || "");
      data.append("representative_name", payload.representative_name || "");
      data.append("phone", payload.phone || "");
      if (payload.business_type_id) {
        data.append("business_type_id", String(payload.business_type_id));
      }
      if (payload.address) {
        data.append("address", payload.address);
      }
      if (payload.city) {
        data.append("city", payload.city);
      }
      if (payload.description) {
        data.append("description", payload.description);
      }

      // Đính kèm các tệp tin File nhị phân thực tế để gửi multipart/form-data
      payload.license_files.forEach((file) => {
        if (file instanceof File) {
          data.append("business_licenses[]", file);
        }
      });

      // Nếu có thêm danh sách URL từ xa hoặc đường dẫn tương đối đã lưu trước đó (loại trừ blob:)
      if (payload.business_license_url) {
        const urls = Array.isArray(payload.business_license_url)
          ? payload.business_license_url
          : [payload.business_license_url];

        urls.forEach((url) => {
          if (typeof url === "string" && !url.startsWith("blob:") && url.trim().length > 0) {
            data.append("business_license_url[]", url.trim());
          }
        });
      }

      return await apiClient.post("/provider/kyc/submit", data);
    }

    // Trường hợp không có File cục bộ, lọc bỏ hoàn toàn các chuỗi blob URL nếu có
    const cleanPayload = { ...payload };
    delete cleanPayload.license_files;
    if (cleanPayload.business_license_url) {
      if (Array.isArray(cleanPayload.business_license_url)) {
        cleanPayload.business_license_url = cleanPayload.business_license_url.filter(
          (u) => typeof u === "string" && !u.startsWith("blob:"),
        );
      } else if (
        typeof cleanPayload.business_license_url === "string" &&
        cleanPayload.business_license_url.startsWith("blob:")
      ) {
        cleanPayload.business_license_url = [];
      }
    }

    return await apiClient.post("/provider/kyc/submit", cleanPayload);
  },

  /**
   * Xem trạng thái xét duyệt hồ sơ KYC hiện hành
   * GET /api/v1/provider/kyc/status
   */
  async fetchKycStatus() {
    return await apiClient.get("/provider/kyc/status");
  },
};

export default providerKycService;
