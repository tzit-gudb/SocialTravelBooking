import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import jsQR from "jsqr";
import {
  AlertCircle,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  ImageUp,
  Keyboard,
  Mail,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import ProviderLayout from "../layouts/ProviderLayout";
import Typography from "../../../components/ui/Typography";
import { formatCurrencyVnd } from "../models/serviceFormModel";
import providerBookingApi from "../services/providerBookingApi";

const MODES = [
  { id: "camera", label: "Quét Camera", icon: Camera },
  { id: "upload", label: "Tải ảnh QR", icon: ImageUp },
  { id: "manual", label: "Nhập mã thủ công", icon: Keyboard },
];

const SERVICE_TYPE_LABELS = {
  accommodation: "Lưu trú / Khách sạn",
  tour: "Tour du lịch",
  vehicle: "Thuê xe",
  dining: "Ẩm thực / Nhà hàng",
  activity: "Trải nghiệm / Vé tham quan",
};

function formatDateTimeVi(iso) {
  if (!iso) return "Vừa xong";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN");
}

function formatDateVi(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(iso);
}

/**
 * Trang Đối soát vé QR Check-in cho Nhà cung cấp (/provider/qr-checkin).
 * Hỗ trợ Responsive trên điện thoại (PWA / Safari / Chrome) và Webcam trên máy tính.
 */
export default function ProviderQrCheckinPage() {
  const [mode, setMode] = useState("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultData, setResultData] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scanLockRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const submitQrData = useCallback(
    async (rawQrData) => {
      const trimmed = String(rawQrData || "").trim();
      if (!trimmed) {
        setErrorMsg("Vui lòng cung cấp mã QR hợp lệ.");
        return;
      }

      setIsSubmitting(true);
      setErrorMsg("");
      setResultData(null);

      try {
        const res = await providerBookingApi.checkInByQr(trimmed);
        stopCamera();
        setResultData(res?.data || null);
      } catch (err) {
        setErrorMsg(err?.message || "Xác nhận check-in thất bại. Vui lòng kiểm tra lại mã QR.");
        scanLockRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [stopCamera],
  );

  const scanFrame = useCallback(() => {
    const step = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !streamRef.current) {
        return;
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA && !scanLockRef.current) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (decoded?.data) {
              scanLockRef.current = true;
              submitQrData(decoded.data);
              return;
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [submitQrData]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setErrorMsg("");
    setResultData(null);
    scanLockRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Trình duyệt không hỗ trợ truy cập camera hoặc trang chưa chạy qua HTTPS. Vui lòng dùng chế độ Tải ảnh QR hoặc Nhập mã thủ công.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      stopCamera();
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError(
          "Bạn đã từ chối quyền truy cập Camera. Vui lòng cấp quyền trong cài đặt trình duyệt hoặc chuyển sang Tải ảnh QR.",
        );
      } else {
        setCameraError(
          "Không thể khởi động Camera. Hãy kiểm tra thiết bị hoặc chuyển sang Tải ảnh QR / Nhập mã thủ công.",
        );
      }
    }
  }, [scanFrame, stopCamera]);

  const handleModeChange = (nextMode) => {
    if (nextMode !== "camera") {
      stopCamera();
    }
    setMode(nextMode);
    setErrorMsg("");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg("");
    setResultData(null);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setErrorMsg("Không thể xử lý ảnh trên trình duyệt này.");
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (!decoded?.data) {
          setErrorMsg(
            "Không tìm thấy mã QR hợp lệ trong ảnh đã chọn. Vui lòng thử ảnh rõ nét hơn.",
          );
          return;
        }

        submitQrData(decoded.data);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setErrorMsg("Không thể đọc tệp hình ảnh đã chọn.");
    };

    img.src = objectUrl;
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    submitQrData(manualInput);
  };

  const handleReset = () => {
    setResultData(null);
    setErrorMsg("");
    setManualInput("");
    scanLockRef.current = false;
    if (mode === "camera") {
      startCamera();
    }
  };

  const bookingInfo = resultData?.booking || resultData;
  const releasedAmount = Number(resultData?.released_amount ?? bookingInfo?.deposit_amount ?? 0);

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <Typography variant="h2" className="text-xl sm:text-2xl font-bold text-slate-900">
              Đối soát vé QR Check-in
            </Typography>
          </div>
          <Typography variant="body" className="text-sm text-slate-500">
            Quét mã QR vé của du khách để xác nhận check-in và tự động giải ngân tiền cọc Escrow vào
            ví của bạn.
          </Typography>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Success Result Card */}
        {resultData ? (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Check-in thành công!</h3>
                <p className="text-sm text-slate-500">
                  Vé đã được đối soát hợp lệ và tiền cọc Escrow đã được giải ngân vào ví khả dụng.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-emerald-800">Tiền cọc đã giải ngân</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">
                    +{formatCurrencyVnd(releasedAmount)}
                  </p>
                </div>
              </div>
              {resultData.wallet_balance !== undefined ? (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Số dư ví hiện tại</p>
                  <p className="text-sm font-bold text-slate-800">
                    {formatCurrencyVnd(resultData.wallet_balance)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 mb-5">
              {/* Mã đơn & Thời gian check-in */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-xs">Mã đơn đặt chỗ</span>
                  <span className="font-bold text-slate-900">
                    {bookingInfo?.booking_code || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Thời gian check-in</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateTimeVi(bookingInfo?.checked_in_at)}
                  </span>
                </div>
              </div>

              {/* Dịch vụ & Lịch trình + Khách hàng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Dịch vụ & Lịch trình
                  </span>
                  <div className="font-semibold text-slate-900">
                    {bookingInfo?.service?.name || bookingInfo?.service_name || "—"}
                  </div>
                  {bookingInfo?.service?.type ? (
                    <div className="text-xs text-slate-500">
                      {SERVICE_TYPE_LABELS[bookingInfo.service.type] || bookingInfo.service.type}
                      {bookingInfo?.room_type?.name
                        ? ` · Hạng phòng: ${bookingInfo.room_type.name}`
                        : ""}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>
                      {formatDateVi(bookingInfo?.start_date)}
                      {bookingInfo?.end_date && bookingInfo.end_date !== bookingInfo.start_date
                        ? ` → ${formatDateVi(bookingInfo.end_date)}`
                        : ""}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Số lượng:{" "}
                    <span className="font-semibold text-slate-800">
                      {bookingInfo?.quantity || 1}
                    </span>
                    {" · "}Thời lượng:{" "}
                    <span className="font-semibold text-slate-800">
                      {bookingInfo?.duration_units || 1}
                    </span>
                    {bookingInfo?.metadata?.guests_count
                      ? ` · ${bookingInfo.metadata.guests_count} khách`
                      : ""}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Khách hàng liên hệ
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{bookingInfo?.contact_name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{bookingInfo?.contact_phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{bookingInfo?.contact_email || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Chi tiết thanh toán */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Chi tiết thanh toán đơn hàng
                </span>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Tổng giá trị đơn</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrencyVnd(bookingInfo?.total_amount ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Tiền cọc đã thanh toán ({bookingInfo?.deposit_rate ?? 0}%)</span>
                  <span className="font-semibold text-teal-700">
                    {formatCurrencyVnd(bookingInfo?.deposit_amount ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-800">Thu thêm tại quầy (còn lại)</span>
                  <span className="font-bold text-amber-700">
                    {formatCurrencyVnd(bookingInfo?.remaining_amount ?? 0)}
                  </span>
                </div>
              </div>

              {bookingInfo?.metadata?.special_requests ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                  <span className="font-semibold block mb-0.5">Ghi chú đặc biệt từ khách:</span>
                  <span>{bookingInfo.metadata.special_requests}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Quét đơn tiếp theo
              </button>
              <Link
                to="/provider/bookings"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
              >
                Xem danh sách đơn
              </Link>
            </div>
          </div>
        ) : null}

        {/* Error Alert */}
        {errorMsg ? (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">{errorMsg}</p>
              {mode === "camera" && cameraActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    scanLockRef.current = false;
                    rafRef.current = requestAnimationFrame(scanFrame);
                  }}
                  className="mt-2 text-xs font-semibold text-rose-700 underline cursor-pointer"
                >
                  Quét lại ngay
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Main Scanner Card */}
        {!resultData ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            {mode === "camera" ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] sm:aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  />

                  {cameraActive ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-52 h-52 sm:w-64 sm:h-64 border-2 border-teal-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
                    </div>
                  ) : (
                    <div className="text-center px-6 py-8">
                      <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-200 mb-1">Camera đang tắt</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Nhấn nút bên dưới để mở camera điện thoại hoặc webcam laptop và đưa mã QR
                        vào khung hình.
                      </p>
                    </div>
                  )}

                  {isSubmitting ? (
                    <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white gap-2">
                      <RefreshCw className="w-7 h-7 animate-spin text-teal-400" />
                      <span className="text-sm font-semibold">Đang xác thực mã QR...</span>
                    </div>
                  ) : null}
                </div>

                {cameraError ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-800">
                    {cameraError}
                  </div>
                ) : null}

                <div className="flex justify-center">
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <CameraOff className="w-4 h-4" />
                      Tắt Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Bật Camera quét QR
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {mode === "upload" ? (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 sm:p-10 text-center cursor-pointer bg-slate-50/60 hover:bg-teal-50/30 transition-colors">
                  <ImageUp className="w-10 h-10 text-teal-600 mb-3" />
                  <span className="text-sm font-semibold text-slate-800 mb-1">
                    Chọn ảnh chụp mã QR vé của khách
                  </span>
                  <span className="text-xs text-slate-500">
                    Hỗ trợ PNG, JPG, JPEG, WEBP — hệ thống tự động giải mã và check-in ngay
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </label>
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-teal-700 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang xử lý kiểm tra mã QR...
                  </div>
                ) : null}
              </div>
            ) : null}

            {mode === "manual" ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="manual-qr-input"
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Dán chuỗi dữ liệu QR hoặc mã token bảo mật
                  </label>
                  <textarea
                    id="manual-qr-input"
                    rows={3}
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder='Ví dụ: {"booking_code":"STB-2026...","qr_token":"..."} hoặc nhập qr_token'
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !manualInput.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Xác nhận Check-in
                </button>
              </form>
            ) : null}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        ) : null}

        {/* Escrow Note */}
        <div className="mt-5 flex items-start gap-2.5 p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs sm:text-sm text-sky-800">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p>
            Mỗi vé QR chỉ được check-in một lần duy nhất. Ngay sau khi xác nhận thành công, hệ thống
            tự động chuyển tiền cọc từ trạng thái ký quỹ (Escrow) sang số dư khả dụng trong ví Nhà
            cung cấp.
          </p>
        </div>
      </div>
    </ProviderLayout>
  );
}
