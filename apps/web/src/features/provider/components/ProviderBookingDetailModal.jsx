import React from "react";
import { X, Calendar, Phone, Mail, User, CheckCircle2, Clock } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatCurrencyVnd } from "../models/serviceFormModel";

const STATUS_LABELS = {
  pending_payment: { label: "Chờ thanh toán", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Đã xác nhận", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  checked_in: { label: "Đã check-in", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  completed: { label: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Đã hủy", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

function formatDateVi(iso) {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(iso);
}

/**
 * Modal xem chi tiết Đơn đặt chỗ dành cho Nhà cung cấp (Provider).
 */
export default function ProviderBookingDetailModal({ booking, isLoadingDetail = false, onClose }) {
  if (!booking && !isLoadingDetail) return null;

  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  const statusMeta = STATUS_LABELS[booking?.status] || {
    label: booking?.status || "—",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Typography variant="h3" className="text-lg font-bold text-ink-primary truncate">
              Đơn đặt chỗ: {booking?.booking_code || "Đang tải..."}
            </Typography>
            {booking?.status && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.cls}`}
              >
                {statusMeta.label}
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

        {isLoadingDetail ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full" rounded="rounded-xl" />
            <Skeleton className="h-32 w-full" rounded="rounded-xl" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Tổng quan dịch vụ & khách hàng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-border-subtle bg-slate-50/50 text-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block">
                  Dịch vụ & Lịch trình
                </span>
                <div className="font-semibold text-ink-primary">{booking.service?.name || "—"}</div>
                {booking.room_type?.name && (
                  <div className="text-xs font-medium text-brand-primary">
                    Hạng phòng: {booking.room_type.name}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-ink-body pt-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                  <span>
                    {formatDateVi(booking.start_date)}
                    {booking.end_date && booking.end_date !== booking.start_date
                      ? ` → ${formatDateVi(booking.end_date)}`
                      : ""}
                    {" · "}SL: {booking.quantity || 1} ({booking.duration_units || 1} đơn vị)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider block">
                  Thông tin khách liên hệ
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-ink-primary">
                  <User className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>{booking.contact_name || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-body">
                  <Phone className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>{booking.contact_phone || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-body">
                  <Mail className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>{booking.contact_email || "—"}</span>
                </div>
              </div>
            </div>

            {/* Trạng thái Check-in */}
            {["confirmed", "checked_in", "completed"].includes(booking.status) && (
              <div
                className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
                  booking.checked_in_at
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                    : "border-sky-200 bg-sky-50/60 text-sky-800"
                }`}
              >
                {booking.checked_in_at ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-brand-primary shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {booking.checked_in_at ? "Khách đã Check-in" : "Chưa Check-in"}
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    {booking.checked_in_at
                      ? `Đã xác nhận lúc ${new Date(booking.checked_in_at).toLocaleString("vi-VN")}`
                      : "Chờ quét mã QR trên ứng dụng của khách hàng khi đến nhận dịch vụ."}
                  </div>
                </div>
              </div>
            )}

            {/* Chi tiết thanh toán */}
            <div className="p-4 rounded-xl border border-border-subtle bg-surface-elevated space-y-2 text-sm">
              <div className="flex justify-between text-ink-body">
                <span>Tổng giá trị đơn</span>
                <span className="font-semibold text-ink-primary">
                  {formatCurrencyVnd(booking.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-ink-body">
                <span>Thanh toán trước ({booking.deposit_rate}%)</span>
                <span className="font-bold text-brand-primary">
                  {formatCurrencyVnd(booking.deposit_amount)}
                </span>
              </div>
              <div className="flex justify-between text-ink-body">
                <span>Thu thêm khi nhận dịch vụ</span>
                <span className="font-semibold text-ink-primary">
                  {formatCurrencyVnd(booking.remaining_amount)}
                </span>
              </div>
            </div>

            {/* Lịch sử giao dịch */}
            <div className="space-y-2">
              <Typography variant="body-md" className="font-semibold text-ink-primary">
                Giao dịch thanh toán ({payments.length})
              </Typography>
              {payments.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-border-subtle text-xs text-ink-subtle">
                  Chưa ghi nhận giao dịch thanh toán trực tuyến nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-border-subtle bg-surface-elevated flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold uppercase text-ink-primary">
                          {p.payment_method}
                        </span>{" "}
                        <span className="font-mono text-ink-subtle">
                          ({p.transaction_code || "Chờ thanh toán"})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-ink-primary">
                          {formatCurrencyVnd(p.amount)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-ink-body font-medium">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
