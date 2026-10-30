import React from "react";
import { Loader2, Building2, Phone, MapPin, Briefcase, FileText, User } from "lucide-react";
import Typography from "../../../components/ui/Typography";

const BUSINESS_TYPES = [
  "Tour du lịch & Trải nghiệm biển đảo",
  "Khách sạn, Resort & Nghỉ dưỡng",
  "Homestay & Villa ven biển",
  "Vận chuyển du lịch & Cano cao tốc",
  "Nhà hàng & Ẩm thực bản địa",
];

const MAJOR_CITIES = [
  "Đà Nẵng",
  "Quảng Ninh (Hạ Long)",
  "Kiên Giang (Phú Quốc)",
  "Khánh Hòa (Nha Trang)",
  "Lâm Đồng (Đà Lạt)",
  "Bình Thuận (Mũi Né)",
  "Thành phố Hồ Chí Minh",
  "Hà Nội",
  "Tỉnh thành khác",
];

/**
 * Biểu mẫu Khởi tạo hồ sơ Nhà cung cấp dịch vụ du lịch (Onboarding)
 */
export default function ProviderProfileForm({
  formData,
  setFormData,
  fieldErrors = {},
  isSubmitting,
  onSubmit,
  onResetFeedback,
}) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onResetFeedback?.();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tên thương hiệu / Doanh nghiệp */}
        <div className="md:col-span-2">
          <label
            htmlFor="onboarding-business-name"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Tên thương hiệu / Doanh nghiệp du lịch <span className="text-status-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="onboarding-business-name"
              type="text"
              value={formData.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              placeholder="Ví dụ: Sơn Trà Eco Travel, Du thuyền Paradise Hạ Long..."
              className={`w-full px-4 py-3 pl-11 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
                fieldErrors.businessName
                  ? "border-status-danger bg-rose-50/30"
                  : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
              }`}
            />
            <Building2 className="w-5 h-5 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.businessName && (
            <Typography variant="caption" className="text-status-danger mt-1.5 block">
              {fieldErrors.businessName}
            </Typography>
          )}
        </div>

        {/* Loại hình dịch vụ */}
        <div>
          <label
            htmlFor="onboarding-business-type"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Loại hình dịch vụ chính <span className="text-status-danger">*</span>
          </label>
          <div className="relative">
            <select
              id="onboarding-business-type"
              value={formData.businessType}
              onChange={(e) => handleChange("businessType", e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-lg border border-border-subtle bg-surface-elevated text-base text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors cursor-pointer appearance-none"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Briefcase className="w-5 h-5 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Số điện thoại / Hotline */}
        <div>
          <label
            htmlFor="onboarding-phone"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Số điện thoại / Hotline CSKH <span className="text-status-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="onboarding-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="0912 345 678"
              className={`w-full px-4 py-3 pl-11 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
                fieldErrors.phone
                  ? "border-status-danger bg-rose-50/30"
                  : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
              }`}
            />
            <Phone className="w-5 h-5 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.phone && (
            <Typography variant="caption" className="text-status-danger mt-1.5 block">
              {fieldErrors.phone}
            </Typography>
          )}
        </div>

        {/* Tỉnh / Thành phố hoạt động chính */}
        <div>
          <label
            htmlFor="onboarding-city"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Địa bàn hoạt động chính <span className="text-status-danger">*</span>
          </label>
          <div className="relative">
            <select
              id="onboarding-city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-lg border border-border-subtle bg-surface-elevated text-base text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors cursor-pointer appearance-none"
            >
              {MAJOR_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <MapPin className="w-5 h-5 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Người đại diện / Quản lý */}
        <div>
          <label
            htmlFor="onboarding-representative"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Họ tên người đại diện / Quản lý <span className="text-status-danger">*</span>
          </label>
          <div className="relative">
            <input
              id="onboarding-representative"
              type="text"
              value={formData.representativeName}
              onChange={(e) => handleChange("representativeName", e.target.value)}
              placeholder="Nguyễn Văn An"
              className={`w-full px-4 py-3 pl-11 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
                fieldErrors.representativeName
                  ? "border-status-danger bg-rose-50/30"
                  : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
              }`}
            />
            <User className="w-5 h-5 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.representativeName && (
            <Typography variant="caption" className="text-status-danger mt-1.5 block">
              {fieldErrors.representativeName}
            </Typography>
          )}
        </div>

        {/* Địa chỉ trụ sở */}
        <div className="md:col-span-2">
          <label
            htmlFor="onboarding-address"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Địa chỉ văn phòng / Điểm tập kết đón khách
          </label>
          <input
            id="onboarding-address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Số 120 Võ Nguyên Giáp, Phước Mỹ, Sơn Trà, Đà Nẵng"
            className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-elevated text-base outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
          />
        </div>

        {/* Mã số thuế / GPKD */}
        <div className="md:col-span-2">
          <label
            htmlFor="onboarding-tax"
            className="block text-sm font-semibold text-ink-primary mb-2"
          >
            Mã số thuế / Giấy phép kinh doanh lữ hành (nếu có)
          </label>
          <div className="relative">
            <input
              id="onboarding-tax"
              type="text"
              value={formData.taxNumber}
              onChange={(e) => handleChange("taxNumber", e.target.value)}
              placeholder="0401892831"
              className="w-full px-4 py-3 pl-11 rounded-lg border border-border-subtle bg-surface-elevated text-base outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
            />
            <FileText className="w-5 h-5 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-xs text-ink-subtle mt-1.5 block">
            Cung cấp mã số thuế sẽ giúp hồ sơ đối tác được ưu tiên gắn huy hiệu Xác thực nhanh chóng
            hơn.
          </span>
        </div>
      </div>

      {/* Nút Hoàn thành */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang lưu thông tin hồ sơ...</span>
            </>
          ) : (
            <span>Hoàn thành</span>
          )}
        </button>
      </div>
    </form>
  );
}
