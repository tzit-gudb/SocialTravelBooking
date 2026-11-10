import React, { useRef, useState } from "react";
import { Upload, X, Eye, FileText, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import Typography from "../../../components/ui/Typography";

/**
 * Component Tải lên & Xem trước Giấy phép kinh doanh (LicenseFileUploader):
 * - Hỗ trợ tối đa 5 ảnh (PNG, JPG, WEBP) HOẶC 1 file PDF
 * - Xem trước nội dung PDF trực tiếp qua iframe
 * - Xem trước ảnh với đầy đủ công cụ: Phóng to (Zoom In), Thu nhỏ (Zoom Out), Đặt lại 100%
 * - Hiển thị số lượng ảnh/file đã tải lên ở dưới
 * - Tuân thủ quy tắc không dùng icon thừa thãi
 */
export default function LicenseFileUploader({ value, onChange, errorMessage }) {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) return [];
    try {
      let rawList = value;
      if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
        rawList = JSON.parse(value);
      } else if (!Array.isArray(value)) {
        rawList = [value];
      }
      return rawList
        .filter((item) => typeof item === "string" && !item.startsWith("blob:"))
        .map((url, idx) => {
          const isPdf = url.includes(".pdf") || url.startsWith("data:application/pdf");
          return {
            id: `init-${idx}`,
            name: isPdf ? "Giay_phep_kinh_doanh.pdf" : `Giấy phép kinh doanh ${idx + 1}`,
            type: isPdf ? "pdf" : "image",
            url,
            file: null,
          };
        });
    } catch {
      return [];
    }
  });

  const [previewItem, setPreviewItem] = useState(null); // File đang được xem trước trong modal
  const [zoomScale, setZoomScale] = useState(1); // Tỷ lệ phóng to ảnh (1 = 100%)
  const [inputMode, setInputMode] = useState("file"); // "file" | "url"
  const [urlInput, setUrlInput] = useState("");

  const openPreview = (item) => {
    setZoomScale(1);
    setPreviewItem(item);
  };

  const closePreview = () => {
    setPreviewItem(null);
    setZoomScale(1);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  // Đồng bộ cả URL tĩnh/từ xa và mảng File nhị phân cục bộ ra component cha
  const syncToParent = (updatedFiles) => {
    setFiles(updatedFiles);

    // Tách riêng File nhị phân cục bộ (để gửi FormData) và URL tĩnh/từ xa hợp lệ
    const rawFiles = updatedFiles.filter((f) => f.file instanceof File).map((f) => f.file);
    const validUrls = updatedFiles
      .filter((f) => !f.file && f.url && !f.url.startsWith("blob:"))
      .map((f) => f.url);

    onChange?.(validUrls, rawFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Reset input file để có thể chọn lại cùng file nếu cần
    e.target.value = "";

    // Phân loại: Có file PDF hay không?
    const pdfFile = selectedFiles.find(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf"),
    );

    if (pdfFile) {
      // Người dùng chọn file PDF: Quy tắc chỉ cho phép tối đa 1 file PDF
      if (pdfFile.size > 15 * 1024 * 1024) {
        alert("File PDF không được vượt quá 15MB.");
        return;
      }

      const pdfUrl = URL.createObjectURL(pdfFile);
      const newPdfItem = {
        id: `pdf-${Date.now()}`,
        name: pdfFile.name,
        size: (pdfFile.size / (1024 * 1024)).toFixed(2) + " MB",
        type: "pdf",
        url: pdfUrl,
        file: pdfFile,
      };

      // Ghi đè toàn bộ vì quy tắc: tối đa 5 ảnh HOẶC 1 file PDF
      syncToParent([newPdfItem]);
      return;
    }

    // Nếu người dùng chọn ảnh
    const imageFiles = selectedFiles.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      alert("Vui lòng chọn định dạng ảnh (PNG, JPG, WEBP) hoặc file PDF.");
      return;
    }

    // Nếu hiện tại đang có file PDF thì xóa PDF để chuyển sang ảnh
    const currentImages = files.filter((f) => f.type === "image");
    const remainingSlots = 5 - currentImages.length;

    if (remainingSlots <= 0) {
      alert("Bạn đã tải lên tối đa 5 ảnh. Vui lòng xóa bớt ảnh cũ trước khi tải thêm.");
      return;
    }

    const filesToAdd = imageFiles.slice(0, remainingSlots);
    if (imageFiles.length > remainingSlots) {
      alert(`Chỉ có thể tải thêm tối đa ${remainingSlots} ảnh (giới hạn 5 ảnh).`);
    }

    // Tạo object URL để xem trước và lưu giữ thực thể File gốc cho quá trình upload
    const newItems = filesToAdd.map((file, idx) => {
      const url = URL.createObjectURL(file);
      return {
        id: `img-${Date.now()}-${idx}`,
        name: file.name,
        size: (file.size / 1024).toFixed(0) + " KB",
        type: "image",
        url,
        file,
      };
    });

    syncToParent([...currentImages, ...newItems]);
  };

  const handleRemoveFile = (id) => {
    const itemToRemove = files.find((f) => f.id === id);
    if (itemToRemove?.url?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(itemToRemove.url);
      } catch {
        // Bỏ qua lỗi revoke URL nếu trình duyệt đã tự giải phóng
      }
    }
    const updated = files.filter((f) => f.id !== id);
    syncToParent(updated);
  };

  const handleAddUrl = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const trimmed = urlInput.trim();
    const isPdf = trimmed.toLowerCase().includes(".pdf");

    if (isPdf) {
      const newPdfItem = {
        id: `pdf-${Date.now()}`,
        name: trimmed.split("/").pop() || "Giay_phep_kinh_doanh.pdf",
        type: "pdf",
        url: trimmed,
        file: null,
      };
      syncToParent([newPdfItem]);
    } else {
      const currentImages = files.filter((f) => f.type === "image");
      if (currentImages.length >= 5) {
        alert("Bạn đã đạt giới hạn tối đa 5 ảnh.");
        return;
      }
      const newImgItem = {
        id: `img-${Date.now()}`,
        name: `Ảnh giấy phép ${currentImages.length + 1}`,
        type: "image",
        url: trimmed,
        file: null,
      };
      syncToParent([...currentImages, newImgItem]);
    }

    setUrlInput("");
  };

  const isPdfActive = files.length === 1 && files[0].type === "pdf";
  const imageCount = files.filter((f) => f.type === "image").length;

  return (
    <div className="space-y-3">
      {/* Header khu vực upload: Tiêu đề và nút đổi chế độ file / url */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-ink-primary">
          Giấy phép kinh doanh / Giấy phép lữ hành <span className="text-status-danger">*</span>
        </label>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setInputMode("file")}
            className={`cursor-pointer px-2.5 py-1 rounded transition-colors ${
              inputMode === "file"
                ? "bg-brand-primary text-white font-medium"
                : "text-ink-subtle hover:text-ink-primary"
            }`}
          >
            Tải file từ máy
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setInputMode("url")}
            className={`cursor-pointer px-2.5 py-1 rounded transition-colors ${
              inputMode === "url"
                ? "bg-brand-primary text-white font-medium"
                : "text-ink-subtle hover:text-ink-primary"
            }`}
          >
            Nhập liên kết (URL)
          </button>
        </div>
      </div>

      {inputMode === "url" ? (
        /* Chế độ nhập liên kết trực tiếp */
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/tai-lieu-gpkd.pdf hoặc link ảnh .jpg/.png"
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-elevated text-base outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="px-4 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
            >
              Thêm liên kết
            </button>
          </div>
          <span className="text-xs text-ink-subtle block">
            Hỗ trợ link file PDF hoặc link ảnh. Tối đa 5 ảnh hoặc 1 file PDF.
          </span>
        </div>
      ) : (
        /* Chế độ tải file từ thiết bị */
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="business-license-file-input"
          />

          {/* Vùng Dropzone bấm để tải thêm file */}
          {!isPdfActive && imageCount < 5 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                errorMessage
                  ? "border-status-danger/70 bg-rose-50/20 hover:border-status-danger"
                  : "border-border-subtle hover:border-brand-primary bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-brand-light/80 text-brand-primary flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium text-brand-primary hover:underline">
                    {files.length === 0 ? "Chọn file tải lên" : "Tải thêm ảnh (tối đa 5 ảnh)"}
                  </span>
                  <span className="text-xs text-ink-subtle block mt-0.5">
                    Hỗ trợ tối đa 5 ảnh (PNG, JPG, WEBP) hoặc 1 file PDF (tối đa 15MB)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danh sách các file / ảnh đã tải lên */}
      {files.length > 0 && (
        <div className="space-y-2 pt-1">
          {isPdfActive ? (
            /* Hiển thị Card tài liệu PDF */
            <div className="border border-border-subtle rounded-xl p-3.5 bg-surface-elevated flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-ink-primary block truncate">
                    {files[0].name}
                  </span>
                  <span className="text-xs text-ink-subtle block">
                    Định dạng tài liệu PDF {files[0].size ? `· ${files[0].size}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openPreview(files[0])}
                  className="px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-slate-50 text-xs font-semibold text-ink-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem nội dung PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(files[0].id)}
                  title="Xóa file PDF"
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-status-danger hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Hiển thị Grid danh sách ảnh */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {files.map((item, index) => (
                <div
                  key={item.id}
                  className="relative group border border-border-subtle rounded-xl overflow-hidden bg-slate-100 aspect-4/3 flex items-center justify-center shadow-xs"
                >
                  <img
                    src={item.url}
                    alt={item.name || `Ảnh giấy phép ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Lớp overlay thao tác khi hover hoặc mobile */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPreview(item)}
                      title="Xem phóng to"
                      className="p-1.5 rounded-full bg-white/90 text-ink-primary hover:bg-white transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      title="Xóa ảnh này"
                      className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Số thứ tự ảnh nhỏ ở góc */}
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-medium pointer-events-none">
                    Ảnh {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hiển thị số lượng ảnh hoặc file đã tải lên ở dưới theo đúng yêu cầu */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/50">
        <span className="text-ink-subtle">Trạng thái đính kèm hồ sơ:</span>

        {files.length === 0 ? (
          <span className="text-ink-subtle font-medium">
            Chưa tải lên file nào (Tối đa 5 ảnh hoặc 1 file PDF)
          </span>
        ) : isPdfActive ? (
          <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Đã tải lên: 1/1 file PDF
          </span>
        ) : (
          <span className="font-semibold text-brand-primary bg-brand-light px-2 py-0.5 rounded border border-brand-primary/20">
            Đã tải lên: {imageCount}/5 ảnh
          </span>
        )}
      </div>

      {/* Thông báo lỗi validation nếu có */}
      {errorMessage && (
        <Typography variant="caption" className="text-status-danger mt-1 block">
          {errorMessage}
        </Typography>
      )}

      {/* Modal Xem trước file (Ảnh phóng to / thu nhỏ hoặc Nội dung PDF) */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-slate-50 gap-3">
              <Typography
                variant="h3"
                className="text-base font-semibold text-ink-primary truncate"
              >
                Xem trước: {previewItem.name}
              </Typography>

              <div className="flex items-center gap-2 shrink-0">
                {/* Thanh công cụ Thu nhỏ / Phóng to (chỉ dành cho xem ảnh) */}
                {previewItem.type === "image" && (
                  <div className="flex items-center gap-1 bg-surface-elevated border border-border-subtle rounded-lg px-2 py-1 shadow-xs">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={zoomScale <= 0.5}
                      title="Thu nhỏ (-25%)"
                      aria-label="Thu nhỏ"
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-body transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetZoom}
                      title="Nhấn để đặt lại 100%"
                      className="text-xs font-semibold text-ink-primary px-1.5 min-w-[44px] text-center select-none cursor-pointer hover:text-brand-primary transition-colors"
                    >
                      {Math.round(zoomScale * 100)}%
                    </button>

                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={zoomScale >= 3}
                      title="Phóng to (+25%)"
                      aria-label="Phóng to"
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-ink-body transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>

                    {zoomScale !== 1 && (
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        title="Đặt lại 100%"
                        className="p-1 rounded hover:bg-slate-100 text-brand-primary ml-0.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Đóng"
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-primary hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Hiển thị ảnh kèm zoom hoặc iframe PDF */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[350px] max-h-[72vh]">
              {previewItem.type === "pdf" ? (
                <iframe
                  src={previewItem.url}
                  title={previewItem.name}
                  className="w-full h-[65vh] rounded-lg border border-border-subtle bg-white"
                />
              ) : (
                <div
                  className="w-full h-full min-h-[320px] flex items-center justify-center overflow-auto p-2"
                  style={{
                    cursor: zoomScale > 1 ? "grab" : "default",
                  }}
                >
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    onDoubleClick={() => setZoomScale((prev) => (prev > 1 ? 1 : 2))}
                    style={{
                      transform: `scale(${zoomScale})`,
                      transformOrigin: "center center",
                      transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
                    }}
                    className="max-w-full max-h-[62vh] object-contain rounded-lg shadow-sm select-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border-subtle bg-surface-elevated flex items-center justify-between">
              {previewItem.type === "image" ? (
                <span className="text-xs text-ink-subtle hidden sm:inline">
                  Mẹo: Dùng nút{" "}
                  <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">+</kbd>{" "}
                  /{" "}
                  <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">-</kbd>{" "}
                  hoặc <strong>nhấp đúp chuột</strong> để phóng to 200%.
                </span>
              ) : (
                <span className="text-xs text-ink-subtle">
                  Tài liệu PDF xem trực tiếp qua trình duyệt.
                </span>
              )}

              <button
                type="button"
                onClick={closePreview}
                className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover transition-colors cursor-pointer ml-auto"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
