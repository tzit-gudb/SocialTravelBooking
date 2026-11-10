import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import Typography from "../../../components/ui/Typography";

/**
 * Modal Xem Chi tiết & Thẩm định Hồ sơ KYC Nhà cung cấp (task14.md)
 */
export default function KycDetailModal({ provider, isOpen, onClose, onApprove, onRequestReject }) {
  const [zoomScale, setZoomScale] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!isOpen || !provider) return null;

  // Xử lý an toàn danh sách file giấy phép (hỗ trợ Array, JSON String, URL đơn lẻ hoặc rỗng)
  let licenseList = [];
  const rawLicense = provider.business_license_url;

  if (Array.isArray(rawLicense)) {
    licenseList = rawLicense.filter(Boolean);
  } else if (typeof rawLicense === "string" && rawLicense.trim().length > 0) {
    const trimmed = rawLicense.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        licenseList = Array.isArray(parsed) ? parsed.filter(Boolean) : [trimmed];
      } catch {
        licenseList = [trimmed];
      }
    } else {
      licenseList = [trimmed];
    }
  }

  const currentMediaUrl = licenseList[activeImageIndex] || licenseList[0] || "";
  const isPdf =
    typeof currentMediaUrl === "string" &&
    (currentMediaUrl.toLowerCase().includes(".pdf") ||
      currentMediaUrl.includes("data:application/pdf"));

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  const formattedSubmittedDate = provider.created_at
    ? new Date(provider.created_at).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Chưa ghi nhận";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Typography variant="h3" className="text-lg font-bold text-ink-primary truncate">
              Thẩm định hồ sơ: {provider.business_name}
            </Typography>

            {provider.status === "pending" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                Chờ duyệt
              </span>
            )}
            {provider.status === "approved" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Đã phê duyệt
              </span>
            )}
            {provider.status === "rejected" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                Bị từ chối
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-primary hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung 2 cột: Cột trái Thông tin pháp nhân - Cột phải Thẩm định tài liệu */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle">
          {/* Cột Trái: Chi tiết thông tin đối tác */}
          <div className="lg:col-span-5 p-6 space-y-5 bg-surface-elevated">
            {/* Banner cảnh báo nếu hồ sơ bị từ chối */}
            {provider.status === "rejected" && provider.rejection_reason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-bold block uppercase tracking-wider text-[11px] text-rose-900">
                  Lý do từ chối trước đó:
                </span>
                <p className="leading-relaxed">{provider.rejection_reason}</p>
              </div>
            )}

            <div>
              <span className="text-xs uppercase tracking-wider text-ink-subtle font-semibold block mb-1">
                Tên thương mại công ty / Cơ sở du lịch
              </span>
              <Typography
                variant="body"
                className="font-bold text-ink-primary text-base sm:text-lg"
              >
                {provider.business_name}
              </Typography>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-ink-subtle block mb-1">
                  Người đại diện / Quản lý:
                </span>
                <span className="font-semibold text-ink-primary block">
                  {provider.representative_name || "Chưa cập nhật"}
                </span>
              </div>

              <div>
                <span className="text-xs text-ink-subtle block mb-1">Loại hình kinh doanh:</span>
                <span className="font-semibold text-ink-primary block">
                  {provider.business_type_name || "Dịch vụ du lịch"}
                </span>
              </div>

              <div>
                <span className="text-xs text-ink-subtle block mb-1">Hotline CSKH:</span>
                <span className="font-semibold text-ink-primary block font-mono">
                  {provider.phone || "Chưa cập nhật"}
                </span>
              </div>

              <div>
                <span className="text-xs text-ink-subtle block mb-1">Thời gian nộp:</span>
                <span className="font-medium text-ink-primary block text-xs">
                  {formattedSubmittedDate}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-ink-subtle block mb-1">Địa chỉ trụ sở / Cơ sở:</span>
              <p className="text-sm text-ink-body bg-slate-50 p-2.5 rounded-lg border border-border-subtle">
                {provider.address || "Chưa cập nhật địa chỉ"}
              </p>
            </div>

            <div>
              <span className="text-xs text-ink-subtle block mb-1">Giới thiệu doanh nghiệp:</span>
              <p className="text-sm text-ink-body leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-border-subtle max-h-36 overflow-y-auto">
                {provider.description || "Chưa cung cấp phần giới thiệu tóm tắt."}
              </p>
            </div>
          </div>

          {/* Cột Phải: Thẩm định Giấy phép kinh doanh (Có công cụ Zoom In/Out) */}
          <div className="lg:col-span-7 p-6 flex flex-col bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-ink-primary">
                Tài liệu Giấy phép kinh doanh / Lữ hành
              </span>

              {!isPdf && currentMediaUrl && (
                <div className="flex items-center gap-1 bg-surface-elevated border border-border-subtle rounded-lg px-2 py-1 shadow-xs">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomScale <= 0.5}
                    title="Thu nhỏ (-25%)"
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-body cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Đặt lại 100%"
                    className="text-xs font-semibold text-ink-primary px-1 min-w-[38px] text-center select-none cursor-pointer hover:text-brand-primary"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomScale >= 3}
                    title="Phóng to (+25%)"
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-body cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {zoomScale !== 1 && (
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      title="Đặt lại"
                      className="p-1 rounded hover:bg-slate-100 text-brand-primary cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Vùng hiển thị tài liệu */}
            <div className="flex-1 min-h-[360px] bg-slate-900/5 rounded-xl border border-border-subtle flex items-center justify-center p-3 overflow-hidden relative">
              {!currentMediaUrl ? (
                <div className="text-center text-ink-subtle text-sm">
                  Chưa đính kèm tài liệu giấy phép kinh doanh.
                </div>
              ) : isPdf ? (
                <iframe
                  src={currentMediaUrl}
                  title="Giấy phép kinh doanh PDF"
                  className="w-full h-full min-h-[420px] rounded-lg border border-border-subtle bg-white"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center overflow-auto"
                  style={{ cursor: zoomScale > 1 ? "grab" : "default" }}
                >
                  <img
                    src={currentMediaUrl}
                    alt="Giấy phép kinh doanh"
                    onDoubleClick={() => setZoomScale((prev) => (prev > 1 ? 1 : 2))}
                    style={{
                      transform: `scale(${zoomScale})`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
                    }}
                    className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm select-none"
                  />
                </div>
              )}
            </div>

            {/* Selector nếu có nhiều ảnh đính kèm */}
            {licenseList.length > 1 && !isPdf && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                {licenseList.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setZoomScale(1);
                    }}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? "border-brand-primary ring-2 ring-brand-primary/20 scale-105"
                        : "border-border-subtle opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Trang ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
                <span className="text-xs text-ink-subtle pl-2">
                  Đính kèm {licenseList.length} trang tài liệu
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions: Quyết định Phê duyệt / Từ chối */}
        <div className="px-6 py-4 border-t border-border-subtle bg-surface-elevated flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-ink-subtle hidden sm:inline">
            Hành động phê duyệt sẽ cấp quyền cho Provider đăng tải tour & phòng lên sàn giao dịch.
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-border-subtle hover:bg-slate-50 text-sm font-medium text-ink-primary transition-colors cursor-pointer"
            >
              Đóng lại
            </button>

            {provider.status !== "rejected" && (
              <button
                type="button"
                onClick={() => onRequestReject(provider)}
                className="px-4 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-status-danger border border-rose-200 text-sm font-semibold transition-colors cursor-pointer"
              >
                Từ chối hồ sơ
              </button>
            )}

            {provider.status !== "approved" && (
              <button
                type="button"
                onClick={() => onApprove(provider.id)}
                className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Phê duyệt đối tác
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
