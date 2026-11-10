import React from "react";
import { Loader2 } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { BUSINESS_TYPES } from "../models/providerOnboardingModel";
import LicenseFileUploader from "./LicenseFileUploader";

/**
 * Biểu mẫu Khởi tạo hồ sơ Nhà cung cấp dịch vụ (Onboarding)
 * Bao gồm thông tin doanh nghiệp, tên người đại diện, và bộ upload giấy phép kinh doanh (tối đa 5 ảnh hoặc 1 file PDF).
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
        {/* Tên thương mại công ty / Cơ sở (business_name) */}
        <div>
          <label
            htmlFor="onboarding-business-name"
            className="block text-sm font-semibold text-ink-primary mb-1.5"
          >
            Tên thương mại công ty / Cơ sở <span className="text-status-danger">*</span>
          </label>
          <input
            id="onboarding-business-name"
            type="text"
            value={formData.business_name}
            onChange={(e) => handleChange("business_name", e.target.value)}
            placeholder="Ví dụ: Sơn Trà Eco Travel, Khách sạn Biển Vàng..."
            className={`w-full px-3.5 py-2.5 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
              fieldErrors.business_name
                ? "border-status-danger bg-rose-50/30"
                : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
            }`}
          />
          {fieldErrors.business_name && (
            <Typography variant="caption" className="text-status-danger mt-1 block">
              {fieldErrors.business_name}
            </Typography>
          )}
        </div>

        {/* Họ tên người đại diện / Quản lý (representative_name) */}
        <div>
          <label
            htmlFor="onboarding-representative-name"
            className="block text-sm font-semibold text-ink-primary mb-1.5"
          >
            Tên người đại diện / Quản lý <span className="text-status-danger">*</span>
          </label>
          <input
            id="onboarding-representative-name"
            type="text"
            value={formData.representative_name}
            onChange={(e) => handleChange("representative_name", e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn An"
            className={`w-full px-3.5 py-2.5 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
              fieldErrors.representative_name
                ? "border-status-danger bg-rose-50/30"
                : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
            }`}
          />
          {fieldErrors.representative_name && (
            <Typography variant="caption" className="text-status-danger mt-1 block">
              {fieldErrors.representative_name}
            </Typography>
          )}
        </div>

        {/* Loại hình kinh doanh chính (business_type_id) */}
        <div>
          <label
            htmlFor="onboarding-business-type"
            className="block text-sm font-semibold text-ink-primary mb-1.5"
          >
            Loại hình kinh doanh chính <span className="text-status-danger">*</span>
          </label>
          <select
            id="onboarding-business-type"
            value={formData.business_type_id}
            onChange={(e) => handleChange("business_type_id", e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-lg border bg-surface-elevated text-base text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors cursor-pointer ${
              fieldErrors.business_type_id ? "border-status-danger" : "border-border-subtle"
            }`}
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.group})
              </option>
            ))}
          </select>
          {fieldErrors.business_type_id && (
            <Typography variant="caption" className="text-status-danger mt-1 block">
              {fieldErrors.business_type_id}
            </Typography>
          )}
        </div>

        {/* Số điện thoại / Hotline CSKH (phone) */}
        <div>
          <label
            htmlFor="onboarding-phone"
            className="block text-sm font-semibold text-ink-primary mb-1.5"
          >
            Số điện thoại / Hotline hỗ trợ <span className="text-status-danger">*</span>
          </label>
          <input
            id="onboarding-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="Ví dụ: 0912345678 hoặc 02363892892"
            className={`w-full px-3.5 py-2.5 rounded-lg border text-base transition-colors outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
              fieldErrors.phone
                ? "border-status-danger bg-rose-50/30"
                : "border-border-subtle bg-surface-elevated focus:border-brand-primary"
            }`}
          />
          {fieldErrors.phone && (
            <Typography variant="caption" className="text-status-danger mt-1 block">
              {fieldErrors.phone}
            </Typography>
          )}
        </div>

        {/* Địa chỉ văn phòng / Cơ sở kinh doanh (address) */}
        <div className="md:col-span-2">
          <label
            htmlFor="onboarding-address"
            className="block text-sm font-semibold text-ink-primary mb-1.5"
          >
            Địa chỉ văn phòng / Cơ sở kinh doanh
          </label>
          <input
            id="onboarding-address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
            className="w-full px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-elevated text-base outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
          />
        </div>

        {/* Giới thiệu / Mô tả doanh nghiệp (description) */}
        <div className="md:col-span-2">
          <label
            htmlFor="onboarding-description"
            className="block text-sm font-semibold text-ink-primary mb-1.5"
          >
            Giới thiệu doanh nghiệp
          </label>
          <textarea
            id="onboarding-description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Mô tả tóm tắt về năng lực phục vụ, trải nghiệm nổi bật, chính sách đón tiếp..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-elevated text-base outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors resize-y"
          />
        </div>

        {/* Bộ tải lên & xem trước Giấy phép kinh doanh (Tối đa 5 ảnh HOẶC 1 file PDF) */}
        <div className="md:col-span-2">
          <LicenseFileUploader
            value={formData.business_license_url}
            onChange={(urls, rawFiles) => {
              setFormData((prev) => ({
                ...prev,
                business_license_url: urls,
                license_files: rawFiles || [],
              }));
              onResetFeedback?.();
            }}
            errorMessage={fieldErrors.business_license_url}
          />
        </div>
      </div>

      {/* Nút Hoàn thành gửi hồ sơ */}
      <div className="pt-2">
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
            <span>Hoàn thành hồ sơ</span>
          )}
        </button>
      </div>
    </form>
  );
}
