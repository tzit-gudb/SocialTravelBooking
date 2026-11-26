import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  QrCode,
  X,
  XCircle,
} from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { formatCurrencyVnd } from "../../provider/models/serviceFormModel";

const STATUS_META = {
  pending: { label: "Chờ chi trả", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  paid: { label: "Đã chi trả · Chờ NCC xác nhận", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  completed: {
    label: "Hoàn tất (NCC đã nhận)",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  disputed: { label: "NCC báo chưa nhận tiền", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  rejected: {
    label: "Đã từ chối & Hoàn tiền",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

function formatDateTimeVi(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN");
}

/**
 * Modal Chi trả VietQR & Xác nhận / Từ chối Yêu cầu Rút tiền dành cho Admin.
 */
export default function AdminWithdrawalDetailModal({
  withdrawal,
  isSubmitting = false,
  onClose,
  onConfirmPaid,
  onReject,
}) {
  const [payoutRef, setPayoutRef] = useState(withdrawal?.payout_reference || "");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [localError, setLocalError] = useState("");

  if (!withdrawal) return null;

  const sMeta = STATUS_META[withdrawal.status] || STATUS_META.pending;
  const canProcess = ["pending", "disputed"].includes(withdrawal.status);

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopiedField(key);
      setTimeout(() => setCopiedField(""), 2000);
    } catch {
      // Bỏ qua nếu trình duyệt chặn clipboard
    }
  };

  const handleConfirmPaidSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!payoutRef.trim()) {
      setLocalError("Vui lòng nhập mã tham chiếu giao dịch chuyển khoản.");
      return;
    }
    try {
      await onConfirmPaid?.(withdrawal.id, payoutRef.trim());
    } catch (err) {
      setLocalError(err?.message || "Không thể xác nhận chi trả.");
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!rejectReason.trim()) {
      setLocalError("Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      await onReject?.(withdrawal.id, rejectReason.trim());
    } catch (err) {
      setLocalError(err?.message || "Không thể từ chối yêu cầu.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <Typography variant="h3" className="text-lg font-bold text-ink-primary truncate">
              Chi trả rút tiền: {withdrawal.request_code}
            </Typography>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sMeta.cls}`}
            >
              {sMeta.label}
            </span>
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

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {localError ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localError}</span>
            </div>
          ) : null}

          {withdrawal.status === "disputed" && withdrawal.dispute_note ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-bold">Nhà cung cấp dịch vụ báo chưa nhận được tiền:</div>
                <div>{withdrawal.dispute_note}</div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Cột trái: Mã VietQR động trỏ đúng ngân hàng & STK NCC */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl border border-teal-200 bg-teal-50/40 text-center space-y-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800">
                <QrCode className="w-4 h-4" />
                <span>Quét VietQR để chi trả</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                <img
                  src={withdrawal.vietqr_url}
                  alt={`VietQR ${withdrawal.request_code}`}
                  className="w-52 h-auto object-contain rounded-lg"
                />
              </div>
              <p className="text-[11px] text-ink-subtle leading-relaxed">
                Quét từ app ngân hàng của Sàn để tự động điền đúng Ngân hàng, STK, số tiền và nội
                dung{" "}
                <strong className="font-mono text-ink-primary">
                  {withdrawal.transfer_content}
                </strong>{" "}
                (hỗ trợ Webhook SePay tự đối soát tiền ra).
              </p>
            </div>

            {/* Cột phải: Thông tin đối soát & Xác nhận */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/60 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-subtle">Số tiền cần chi trả</span>
                  <span className="text-xl font-bold text-teal-700">
                    {formatCurrencyVnd(withdrawal.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    Nhà cung cấp dịch vụ
                  </span>
                  <span className="font-semibold text-ink-primary">
                    {withdrawal.provider?.business_name || "--"}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-subtle">Ngân hàng nhận</span>
                    <span className="font-bold text-ink-primary">
                      {withdrawal.bank_name} ({withdrawal.bank_code})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-subtle">Số tài khoản</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(withdrawal.account_number, "acc")}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-ink-primary hover:text-teal-700 cursor-pointer"
                    >
                      <span>{withdrawal.account_number}</span>
                      <Copy className="w-3 h-3" />
                      {copiedField === "acc" ? (
                        <span className="text-[10px] text-emerald-600">Đã chép</span>
                      ) : null}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-subtle">Chủ tài khoản</span>
                    <span className="font-semibold uppercase text-ink-primary">
                      {withdrawal.account_holder}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-subtle">Nội dung chuyển khoản</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(withdrawal.transfer_content, "content")}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-teal-700 hover:underline cursor-pointer"
                    >
                      <span>{withdrawal.transfer_content}</span>
                      <Copy className="w-3 h-3" />
                      {copiedField === "content" ? (
                        <span className="text-[10px] text-emerald-600">Đã chép</span>
                      ) : null}
                    </button>
                  </div>
                </div>

                {withdrawal.note ? (
                  <div className="pt-2 border-t border-slate-200 text-xs text-ink-body">
                    <span className="text-ink-subtle">Ghi chú từ NCC: </span>
                    {withdrawal.note}
                  </div>
                ) : null}
              </div>

              {/* Form Admin Xác nhận chi trả (dự phòng khi Webhook SePay không về) */}
              {canProcess ? (
                <div className="space-y-3">
                  <form
                    onSubmit={handleConfirmPaidSubmit}
                    className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3"
                  >
                    <label
                      htmlFor="admin-payout-ref"
                      className="block text-xs font-bold text-emerald-900"
                    >
                      Xác nhận thủ công (nếu Webhook SePay chưa tự cập nhật)
                    </label>
                    <input
                      id="admin-payout-ref"
                      type="text"
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      placeholder="Nhập mã tham chiếu giao dịch (VD: FT26330...)"
                      className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-white text-sm font-mono text-ink-primary outline-hidden focus:border-emerald-500"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isSubmitting ? "Đang xử lý..." : "Xác nhận đã chi trả"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setRejectOpen((prev) => !prev)}
                        className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer"
                      >
                        Từ chối
                      </button>
                    </div>
                  </form>

                  {rejectOpen ? (
                    <form
                      onSubmit={handleRejectSubmit}
                      className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2.5"
                    >
                      <label
                        htmlFor="admin-reject-reason"
                        className="block text-xs font-bold text-rose-800"
                      >
                        Lý do từ chối (tiền sẽ tự động hoàn lại vào số dư khả dụng của NCC)
                      </label>
                      <input
                        id="admin-reject-reason"
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="VD: Số tài khoản ngân hàng không khớp tên chủ tài khoản"
                        className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-white text-xs text-ink-primary outline-hidden focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Xác nhận từ chối & Hoàn tiền
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border-subtle bg-slate-50 text-xs space-y-1.5">
                  <div className="font-bold text-ink-primary">Thông tin đối soát chi trả</div>
                  {withdrawal.payout_reference ? (
                    <div>
                      Mã tham chiếu GD:{" "}
                      <strong className="font-mono text-teal-700">
                        {withdrawal.payout_reference}
                      </strong>{" "}
                      (
                      {withdrawal.payout_method === "sepay_webhook"
                        ? "SePay Webhook tự động"
                        : "Quản trị viên xác nhận"}
                      )
                    </div>
                  ) : null}
                  {withdrawal.paid_at ? (
                    <div>Thời gian chuyển khoản: {formatDateTimeVi(withdrawal.paid_at)}</div>
                  ) : null}
                  {withdrawal.confirmed_at ? (
                    <div className="text-emerald-700 font-semibold">
                      NCC đã xác nhận nhận tiền lúc: {formatDateTimeVi(withdrawal.confirmed_at)}
                    </div>
                  ) : null}
                  {withdrawal.rejected_reason ? (
                    <div className="text-rose-700 font-semibold">
                      Lý do từ chối: {withdrawal.rejected_reason}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
