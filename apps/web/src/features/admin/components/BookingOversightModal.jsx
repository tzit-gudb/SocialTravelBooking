import React from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatCurrencyVnd } from "../../provider/models/serviceFormModel";

const BOOKING_STATUS_META = {
  pending_payment: {
    label: "Chờ thanh toán",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  confirmed: {
    label: "Đã xác nhận",
    cls: "bg-sky-50 text-sky-700 border-sky-200",
  },
  checked_in: {
    label: "Đã check-in",
    cls: "bg-teal-50 text-teal-700 border-teal-200",
  },
  completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Đã hủy",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  refunded: {
    label: "Đã hoàn tiền",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

const PAYMENT_STATUS_META = {
  pending: { label: "Chờ thanh toán", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "Đã thanh toán", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Thất bại", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

const TX_TYPE_LABELS = {
  booking_payment: "Giải ngân tiền cọc",
  withdrawal: "Rút tiền về ngân hàng",
  refund: "Hoàn tiền",
  adjustment: "Điều chỉnh số dư",
};

function formatDateVi(iso) {
  if (!iso) return "--";
  const parts = String(iso).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(iso);
}

function formatDateTimeVi(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN");
}

function normalizeWalletNote(note) {
  if (!note) return "";
  return String(note).replace(/\bProvider\b/gi, "Nhà cung cấp dịch vụ");
}

/**
 * Modal Đối soát chi tiết Đơn đặt chỗ, Thanh toán & Biến động Ví Escrow dành cho Admin.
 */
export default function BookingOversightModal({ booking, isLoadingDetail = false, onClose }) {
  if (!booking && !isLoadingDetail) return null;

  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  const transactions = Array.isArray(booking?.wallet_transactions)
    ? booking.wallet_transactions
    : [];

  const statusMeta = BOOKING_STATUS_META[booking?.status] || {
    label: booking?.status || "--",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const totalDiscount =
    Number(booking?.promotion_discount_amount || 0) + Number(booking?.coupon_discount_amount || 0);

  const isEscrowReleased =
    transactions.some((tx) => tx.type === "booking_payment") ||
    ["checked_in", "completed"].includes(booking?.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <Typography variant="h3" className="text-lg font-bold text-ink-primary truncate">
              Đối soát đơn đặt chỗ: {booking?.booking_code || "Đang tải..."}
            </Typography>
            {booking?.status ? (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.cls}`}
              >
                {statusMeta.label}
              </span>
            ) : null}
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
            <Skeleton className="h-28 w-full" rounded="rounded-xl" />
            <Skeleton className="h-36 w-full" rounded="rounded-xl" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Thông tin Dịch vụ, Nhà cung cấp & Khách hàng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/60 space-y-2 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block">
                  Dịch vụ & Nhà cung cấp dịch vụ
                </span>
                <div className="font-bold text-ink-primary text-base">
                  {booking.service?.name || "--"}
                </div>
                {booking.room_type?.name ? (
                  <div className="text-xs font-medium text-brand-primary">
                    Hạng phòng: {booking.room_type.name}
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5 text-xs text-ink-body">
                  <Building2 className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                  <span className="font-medium">
                    {booking.provider?.business_name || "--"}
                    {booking.provider?.phone ? ` · ${booking.provider.phone}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-body pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>
                    Ngày sử dụng: {formatDateVi(booking.start_date)}
                    {booking.end_date && booking.end_date !== booking.start_date
                      ? ` → ${formatDateVi(booking.end_date)}`
                      : ""}
                    {" · "}SL: {booking.quantity || 1} ({booking.duration_units || 1} đơn vị)
                  </span>
                </div>
                {booking.checked_in_at ? (
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Đã check-in lúc: {formatDateTimeVi(booking.checked_in_at)}</span>
                  </div>
                ) : null}
              </div>

              <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/60 space-y-2 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block">
                  Thông tin khách hàng
                </span>
                <div className="flex items-center gap-2 font-bold text-ink-primary text-base">
                  <User className="w-4 h-4 text-ink-subtle shrink-0" />
                  <span>{booking.contact_name || "--"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-body">
                  <Phone className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                  <span className="font-mono">{booking.contact_phone || "--"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-body">
                  <Mail className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                  <span>{booking.contact_email || "--"}</span>
                </div>
                {booking.special_requests || booking.metadata?.special_requests ? (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                    <span className="font-semibold">Ghi chú: </span>
                    {booking.special_requests || booking.metadata?.special_requests}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Tổng quan Tài chính Đơn hàng */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-border-subtle bg-white">
                <span className="text-[11px] font-medium text-ink-subtle block">
                  Tổng giá trị đơn
                </span>
                <span className="text-sm sm:text-base font-bold text-ink-primary mt-0.5 block">
                  {formatCurrencyVnd(booking.total_amount ?? 0)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-border-subtle bg-white">
                <span className="text-[11px] font-medium text-ink-subtle block">Tổng giảm giá</span>
                <span className="text-sm sm:text-base font-bold text-slate-700 mt-0.5 block">
                  {formatCurrencyVnd(totalDiscount)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50">
                <span className="text-[11px] font-medium text-teal-800 block">
                  Tiền cọc ({booking.deposit_rate ?? 0}%)
                </span>
                <span className="text-sm sm:text-base font-bold text-teal-700 mt-0.5 block">
                  {formatCurrencyVnd(booking.deposit_amount ?? 0)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                <span className="text-[11px] font-medium text-amber-800 block">Thu tại quầy</span>
                <span className="text-sm sm:text-base font-bold text-amber-700 mt-0.5 block">
                  {formatCurrencyVnd(booking.remaining_amount ?? 0)}
                </span>
              </div>
            </div>

            {/* Lịch sử giao dịch cổng thanh toán */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-ink-subtle" />
                <Typography variant="body-md" className="font-semibold text-ink-primary">
                  Lịch sử giao dịch cổng thanh toán ({payments.length})
                </Typography>
              </div>
              {payments.length === 0 ? (
                <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/40 text-xs text-ink-subtle">
                  Chưa ghi nhận giao dịch thanh toán nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => {
                    const pMeta = PAYMENT_STATUS_META[p.status] || {
                      label: p.status,
                      cls: "bg-slate-100 text-ink-body border-slate-200",
                    };
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl border border-border-subtle bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink-primary uppercase">
                              {p.payment_method}
                            </span>
                            <span className="font-mono text-ink-subtle">
                              {p.transaction_code || "Chưa có mã GD"}
                            </span>
                          </div>
                          {p.paid_at ? (
                            <div className="text-[11px] text-ink-subtle flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Thanh toán lúc: {formatDateTimeVi(p.paid_at)}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-ink-primary">
                            {formatCurrencyVnd(p.amount)}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full border font-semibold ${pMeta.cls}`}
                          >
                            {pMeta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Biến động Ví & Giải ngân Escrow */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-600" />
                  <Typography variant="body-md" className="font-semibold text-ink-primary">
                    Biến động Ví & Giải ngân Escrow ({transactions.length})
                  </Typography>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isEscrowReleased
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : booking?.status === "confirmed"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {isEscrowReleased
                    ? "Đã giải ngân vào ví khả dụng"
                    : booking?.status === "confirmed"
                      ? "Đang tạm giữ ký quỹ Escrow"
                      : "Chưa phát sinh ký quỹ"}
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/50 flex items-start gap-2.5 text-xs text-ink-subtle">
                  <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    {booking?.status === "confirmed"
                      ? `Tiền cọc ${formatCurrencyVnd(booking.deposit_amount ?? 0)} đang được hệ thống tạm giữ trong ví ký quỹ của Nhà cung cấp dịch vụ và sẽ tự động giải ngân ngay sau khi khách check-in.`
                      : "Chưa có biến động giải ngân ví nào liên quan đến mã đơn đặt chỗ này."}
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                            {TX_TYPE_LABELS[tx.type] || tx.type}
                          </span>
                          <span className="font-semibold text-ink-primary">
                            {normalizeWalletNote(tx.note) ||
                              "Giải ngân tiền cọc cho Nhà cung cấp dịch vụ"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-subtle">
                          <span className="inline-flex items-center gap-1">
                            Số dư ví khả dụng:
                            <strong className="text-ink-body font-medium ml-1">
                              {formatCurrencyVnd(tx.balance_before)}
                            </strong>
                            <ArrowRight className="w-3 h-3 text-emerald-600" />
                            <strong className="text-emerald-700 font-bold">
                              {formatCurrencyVnd(tx.balance_after)}
                            </strong>
                          </span>
                          {tx.created_at ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTimeVi(tx.created_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[11px] text-ink-subtle block">Số tiền biến động</span>
                        <span className="text-base font-bold text-emerald-700">
                          +{formatCurrencyVnd(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border-subtle bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border-subtle bg-surface-elevated hover:bg-slate-100 text-ink-body text-sm font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
