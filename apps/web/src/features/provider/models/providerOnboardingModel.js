/**
 * Model & Data Contract cho quy trình Onboarding Nhà cung cấp (Provider)
 * Ánh xạ thông tin hồ sơ đối tác và người đại diện quản lý.
 */

export const BUSINESS_TYPES = [
  { id: "1", name: "Tour du lịch & Trải nghiệm", group: "Giải trí" },
  { id: "2", name: "Khách sạn", group: "Chỗ ở" },
  { id: "3", name: "Homestay & Villa", group: "Chỗ ở" },
  { id: "4", name: "Resort", group: "Chỗ ở" },
  { id: "5", name: "Phương tiện di chuyển", group: "Phương tiện" },
  { id: "6", name: "Vé tàu & Vận chuyển", group: "Phương tiện" },
  { id: "7", name: "Nhà hàng & Ẩm thực", group: "Ăn uống" },
];

export const INITIAL_PROVIDER_ONBOARDING_DATA = {
  business_name: "",
  representative_name: "",
  business_type_id: "1",
  phone: "",
  address: "",
  description: "",
  business_license_url: [],
  license_files: [],
};

/**
 * Tìm tên loại hình theo ID
 */
export function getBusinessTypeName(typeId) {
  const found = BUSINESS_TYPES.find((item) => String(item.id) === String(typeId));
  return found ? found.name : "Dịch vụ du lịch";
}

/**
 * Client-side validation cho hồ sơ Onboarding Provider
 */
export function validateProviderOnboarding(formData) {
  const errors = {};

  if (!formData.business_name?.trim()) {
    errors.business_name = "Vui lòng nhập tên thương mại công ty hoặc cơ sở du lịch.";
  } else if (formData.business_name.trim().length < 3) {
    errors.business_name = "Tên doanh nghiệp tối thiểu 3 ký tự.";
  }

  if (!formData.representative_name?.trim()) {
    errors.representative_name = "Vui lòng nhập họ tên người đại diện / quản lý cơ sở.";
  } else if (formData.representative_name.trim().length < 2) {
    errors.representative_name = "Họ tên người đại diện không hợp lệ.";
  }

  if (!formData.business_type_id) {
    errors.business_type_id = "Vui lòng chọn loại hình kinh doanh chính.";
  }

  if (!formData.phone?.trim()) {
    errors.phone = "Vui lòng nhập số điện thoại hoặc hotline hỗ trợ khách hàng.";
  } else if (!/^[0-9+\-\s()]{8,20}$/.test(formData.phone.trim())) {
    errors.phone = "Số điện thoại không hợp lệ (từ 8 đến 20 số).";
  }

  const hasLocalFiles = Array.isArray(formData.license_files) && formData.license_files.length > 0;
  const hasValidUrls = Array.isArray(formData.business_license_url)
    ? formData.business_license_url.filter((u) => typeof u === "string" && !u.startsWith("blob:"))
        .length > 0
    : Boolean(
        formData.business_license_url &&
        typeof formData.business_license_url === "string" &&
        !formData.business_license_url.startsWith("blob:"),
      );

  if (!hasLocalFiles && !hasValidUrls) {
    errors.business_license_url =
      "Vui lòng tải lên ảnh (tối đa 5 ảnh) hoặc 1 file PDF giấy phép kinh doanh.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
