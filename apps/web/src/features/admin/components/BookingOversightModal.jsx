import React from "react";
import { X } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import QrCodeSvg from "../../../components/ui/QrCodeSvg";
import { formatCurrencyVnd } from "../../provider/models/serviceFormModel";

/**
 * Modal Đối soát chi tiết Đơn đặt chỗ, Thanh toán & Biến động Ví Escrow.
 */
export default function BookingOversightModal({ booking, isLoadingDetail = false, onClose }) {
  if (!booking && !isLoadingDetail) return null;

  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  const transactions = Array.isArray(booking?.wallet_transactions)
    ? booking.wallet_transactions
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between gap-4">
          <Typography variant="h3" className="text-lg font-bold text-ink-primary truncate">
            Đối soát đơn đặt chỗ: {booking?.booking_code || "Đang tải..."}
          </Typography>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Thông tin đơn */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-border-subtle bg-slate-50/50 text-sm">
              <div>
                <span className="text-xs text-ink-subtle block">Dịch vụ & Đối tác</span>
                <div className="font-semibold text-ink-primary mt-0.5">{booking.service?.name}</div>
                <div className="text-xs text-ink-subtle">{booking.provider?.business_name}</div>
              </div>

              <div>
                <span className="text-xs text-ink-subtle block">Khách liên hệ</span>
                <div className="font-semibold text-ink-primary mt-0.5">{booking.contact_name}</div>
                <div className="text-xs text-ink-subtle">
                  {booking.contact_phone} / {booking.contact_email}
                </div>
              </div>

              <div>
                <span className="text-xs text-ink-subtle block">Giá trị đơn hàng</span>
                <div className="text-base font-bold text-brand-primary mt-0.5">
                  {formatCurrencyVnd(booking.total_amount)}
                </div>
                <div className="text-xs text-ink-subtle">
                  Giảm giá: {formatCurrencyVnd(booking.discount_amount)}
                </div>
              </div>
            </div>

            {/* Vé điện tử QR Check-in */}
            {["confirmed", "checked_in", "completed"].includes(booking.status) &&
              booking.qr_checkin_token && (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-sky-200 bg-sky-50/60">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                    <QrCodeSvg
                      value={JSON.stringify({
                        code: booking.booking_code,
                        token: booking.qr_checkin_token,
                      })}
                      size={96}
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-sm font-bold text-ink-primary">
                        Vé điện tử QR Check-in
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          booking.checked_in_at
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {booking.checked_in_at ? "Đã check-in" : "Chưa check-in"}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-brand-primary font-semibold">
                      Token: {booking.qr_checkin_token}
                    </div>
                    <div className="text-xs text-ink-subtle">
                      Khách hàng xuất trình mã QR này trên Mobile App khi đến nhận dịch vụ.
                    </div>
                  </div>
                </div>
              )}

            {/* Lịch sử thanh toán */}
            <div className="space-y-2.5">
              <Typography variant="body-md" className="font-semibold text-ink-primary">
                Lịch sử giao dịch cổng thanh toán ({payments.length})
              </Typography>
              {payments.length === 0 ? (
                <div className="p-4 rounded-xl border border-border-subtle text-xs text-ink-subtle">
                  Chưa ghi nhận giao dịch thanh toán nào.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-border-subtle bg-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-ink-primary uppercase">
                          {p.payment_method}
                        </span>{" "}
                        <span className="font-mono text-ink-subtle">
                          ({p.transaction_code || "Chưa có mã GD"})
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

            {/* Biến động ví Escrow */}
            <div className="space-y-2.5">
              <Typography variant="body-md" className="font-semibold text-ink-primary">
                Biến động Ví & Giải ngân Escrow ({transactions.length})
              </Typography>
              {transactions.length === 0 ? (
                <div className="p-4 rounded-xl border border-border-subtle text-xs text-ink-subtle">
                  Chưa có giao dịch giải ngân nào liên quan đến mã đơn này.
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-border-subtle bg-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-ink-primary">{tx.note || tx.type}</div>
                        <div className="text-ink-subtle">
                          Số dư: {formatCurrencyVnd(tx.balance_before)} →{" "}
                          {formatCurrencyVnd(tx.balance_after)}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-700">
                        +{formatCurrencyVnd(tx.amount)}
                      </span>
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
