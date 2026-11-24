export const BOOKING_STATUS_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "pending_payment", label: "Chờ thanh toán" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "checked_in", label: "Đã check-in" },
  { id: "completed", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã hủy" },
  { id: "refunded", label: "Đã hoàn tiền" },
];

export const BOOKING_STATUS_CONFIG = {
  pending_payment: {
    label: "Chờ thanh toán",
    bg: "#FEF3C7",
    text: "#B45309",
    border: "#FDE68A",
  },
  confirmed: {
    label: "Đã xác nhận",
    bg: "#E0F2FE",
    text: "#0369A1",
    border: "#BAE6FD",
  },
  checked_in: {
    label: "Đã check-in",
    bg: "#CCFBF1",
    text: "#0F766E",
    border: "#99F6E4",
  },
  completed: {
    label: "Hoàn thành",
    bg: "#D1FAE5",
    text: "#047857",
    border: "#A7F3D0",
  },
  cancelled: {
    label: "Đã hủy",
    bg: "#FFE4E6",
    text: "#BE123C",
    border: "#FECDD3",
  },
  refunded: {
    label: "Đã hoàn tiền",
    bg: "#EDE9FE",
    text: "#6D28D9",
    border: "#DDD6FE",
  },
};

export const CANCEL_REASON_PRESETS = [
  "Thay đổi lịch trình cá nhân",
  "Đặt nhầm ngày hoặc số lượng",
  "Tìm được dịch vụ phù hợp hơn",
  "Cần điều chỉnh thông tin đoàn",
];

export function getBookingStatusMeta(status) {
  return (
    BOOKING_STATUS_CONFIG[status] || {
      label: status || "Không xác định",
      bg: "#F1F5F9",
      text: "#475569",
      border: "#CBD5E1",
    }
  );
}

export function formatBookingDate(dateStr) {
  if (!dateStr) return "—";
  const raw = String(dateStr).slice(0, 10);
  const parts = raw.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return String(dateStr);
  return parsed.toLocaleDateString("vi-VN");
}

export function formatBookingDateRange(startDate, endDate) {
  const startFormatted = formatBookingDate(startDate);
  if (!endDate || String(endDate).slice(0, 10) === String(startDate).slice(0, 10)) {
    return startFormatted;
  }
  return `${startFormatted} → ${formatBookingDate(endDate)}`;
}

export function getHoldRemainingSeconds(paymentExpiresAt) {
  if (!paymentExpiresAt) return 0;
  const expiresMs = new Date(paymentExpiresAt).getTime();
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function canCancelBooking(booking) {
  return booking?.status === "pending_payment" || booking?.status === "confirmed";
}
