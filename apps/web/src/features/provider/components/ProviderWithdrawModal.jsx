import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { formatCurrencyVnd } from "../models/serviceFormModel";

/**
 * Modal tạo yêu cầu rút tiền: chọn từ danh sách tài khoản ngân hàng đã lưu trong Hồ sơ NCC.
 */
export default function ProviderWithdrawModal({
  availableBalance = 0,
  bankAccounts = [],
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const defaultAccount = bankAccounts.find((b) => b.is_default) || bankAccounts[0] || null;
  const [selectedBankId, setSelectedBankId] = useState(
    defaultAccount ? String(defaultAccount.id) : "",
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const numericBalance = Math.max(0, Number(availableBalance || 0));

  const handleQuickFill = (ratio) => {
    const val = Math.floor(numericBalance * ratio);
    setAmount(val > 0 ? String(val) : "");
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedBankId) {
      setFormError("Vui lòng chọn tài khoản ngân hàng nhận tiền.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 50000) {
      setFormError("Số tiền rút tối thiểu là 50.000đ.");
      return;
    }
    if (parsedAmount > numericBalance) {
      setFormError("Số tiền rút vượt quá số dư khả dụng hiện tại.");
      return;
    }

    try {
      await onSubmit?.({
        amount: parsedAmount,
        bank_account_id: Number(selectedBankId),
        note: note.trim() || undefined,
      });
    } catch (err) {
      setFormError(err?.message || "Không thể gửi yêu cầu rút tiền. Vui lòng thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-surface-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <Typography variant="h3" className="text-base sm:text-lg font-bold text-ink-primary">
                Tạo yêu cầu rút tiền
              </Typography>
              <p className="text-xs text-ink-subtle">
                Số dư khả dụng:{" "}
                <strong className="text-teal-700">{formatCurrencyVnd(numericBalance)}</strong>
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          ) : null}

          {/* Chọn tài khoản ngân hàng đã lưu */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ink-primary">
                Tài khoản ngân hàng thụ hưởng
              </span>
              <Link
                to="/provider/profile?tab=bank-accounts"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"
              >
                <Plus className="w-3 h-3" />
                Quản lý tài khoản
              </Link>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 text-xs text-amber-900 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>Bạn chưa liên kết tài khoản ngân hàng nào</span>
                </div>
                <p>
                  Vui lòng thêm tài khoản ngân hàng trong mục Hồ sơ để hệ thống tạo mã VietQR cho
                  Quản trị viên chi trả.
                </p>
                <Link
                  to="/provider/profile?tab=bank-accounts"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm tài khoản ngân hàng ngay
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {bankAccounts.map((acc) => {
                  const selected = String(acc.id) === selectedBankId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedBankId(String(acc.id))}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        selected
                          ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20"
                          : "border-border-subtle bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-teal-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {acc.bank_code}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-ink-primary">
                              {acc.bank_name}
                            </span>
                            {acc.is_default ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px] font-semibold">
                                Mặc định
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs font-mono text-ink-body truncate">
                            {acc.account_number} · {acc.account_holder}
                          </div>
                        </div>
                      </div>
                      {selected ? (
                        <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="withdraw-amount" className="text-xs font-semibold text-ink-primary">
                Số tiền cần rút (VNĐ)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill(0.5)}
                  disabled={numericBalance < 50000}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[11px] font-semibold text-ink-body cursor-pointer"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill(1)}
                  disabled={numericBalance < 50000}
                  className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 disabled:opacity-40 text-[11px] font-semibold text-teal-700 cursor-pointer"
                >
                  Tất cả
                </button>
              </div>
            </div>
            <div className="relative">
              <Wallet className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="withdraw-amount"
                type="number"
                min={50000}
                max={numericBalance || undefined}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Tối thiểu 50.000"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-base text-sm font-semibold text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="withdraw-note"
              className="block text-xs font-semibold text-ink-primary mb-1.5"
            >
              Ghi chú (Tùy chọn)
            </label>
            <input
              id="withdraw-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Rút doanh thu tuần 4"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-base text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-border-subtle bg-white hover:bg-slate-50 text-ink-body text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || bankAccounts.length === 0 || numericBalance < 50000}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu rút tiền"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
