import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { VIETQR_BANKS } from "../models/vietqrBanks";
import providerBankAccountApi from "../services/providerBankAccountApi";

const INITIAL_FORM = {
  bank_code: "TPB",
  bank_name: "TPBank",
  account_number: "",
  account_holder: "",
  is_default: false,
};

/**
 * Quản lý danh sách Tài khoản ngân hàng nhận tiền của Nhà cung cấp dịch vụ.
 */
export default function ProviderBankAccountsManager() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await providerBankAccountApi.list();
      setAccounts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Không thể tải danh sách ngân hàng." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM, is_default: accounts.length === 0 });
    setFormOpen(true);
    setFeedback(null);
  };

  const openEditForm = (acc) => {
    setEditingId(acc.id);
    setForm({
      bank_code: acc.bank_code,
      bank_name: acc.bank_name,
      account_number: acc.account_number,
      account_holder: acc.account_holder,
      is_default: Boolean(acc.is_default),
    });
    setFormOpen(true);
    setFeedback(null);
  };

  const handleBankChange = (code) => {
    const found = VIETQR_BANKS.find((b) => b.code === code);
    setForm((prev) => ({
      ...prev,
      bank_code: code,
      bank_name: found?.name || code,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const cleanAcc = form.account_number.replace(/\s+/g, "").trim();
    const cleanHolder = form.account_holder.trim().toUpperCase();
    if (!cleanAcc || !cleanHolder) {
      setFeedback({
        type: "error",
        message: "Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        bank_code: form.bank_code,
        bank_name: form.bank_name,
        account_number: cleanAcc,
        account_holder: cleanHolder,
        is_default: form.is_default,
      };

      if (editingId) {
        await providerBankAccountApi.update(editingId, payload);
        setFeedback({ type: "success", message: "Cập nhật tài khoản ngân hàng thành công!" });
      } else {
        await providerBankAccountApi.create(payload);
        setFeedback({ type: "success", message: "Thêm tài khoản ngân hàng thành công!" });
      }
      setFormOpen(false);
      setEditingId(null);
      await loadAccounts();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Lưu tài khoản ngân hàng thất bại." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (id) => {
    setFeedback(null);
    try {
      await providerBankAccountApi.setDefault(id);
      await loadAccounts();
      setFeedback({ type: "success", message: "Đã đặt làm tài khoản nhận tiền mặc định." });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Không thể đặt tài khoản mặc định." });
    }
  };

  const handleDelete = async (id) => {
    setFeedback(null);
    try {
      await providerBankAccountApi.remove(id);
      await loadAccounts();
      setFeedback({ type: "success", message: "Đã xóa tài khoản ngân hàng." });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Không thể xóa tài khoản ngân hàng." });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Typography variant="h3" className="text-base font-bold text-ink-primary">
            Tài khoản ngân hàng nhận tiền
          </Typography>
          <p className="text-xs text-ink-subtle mt-0.5">
            Lưu sẵn 1 hoặc nhiều tài khoản ngân hàng để hệ thống tự động tạo mã VietQR khi bạn rút
            tiền.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm tài khoản ngân hàng
        </button>
      </div>

      {feedback ? (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl border border-teal-200 bg-teal-50/30 space-y-4"
        >
          <div className="font-semibold text-sm text-ink-primary">
            {editingId ? "Cập nhật tài khoản ngân hàng" : "Thêm tài khoản ngân hàng mới"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="bank-code-select"
                className="block text-xs font-semibold text-ink-primary mb-1"
              >
                Ngân hàng (Chuẩn VietQR)
              </label>
              <select
                id="bank-code-select"
                value={form.bank_code}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white text-sm text-ink-primary outline-hidden focus:border-brand-primary cursor-pointer"
              >
                {VIETQR_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bank-acc-input"
                className="block text-xs font-semibold text-ink-primary mb-1"
              >
                Số tài khoản
              </label>
              <input
                id="bank-acc-input"
                type="text"
                value={form.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                placeholder="VD: 10001627519"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white text-sm font-mono text-ink-primary outline-hidden focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
            <div>
              <label
                htmlFor="bank-holder-input"
                className="block text-xs font-semibold text-ink-primary mb-1"
              >
                Tên chủ tài khoản (Viết hoa không dấu)
              </label>
              <input
                id="bank-holder-input"
                type="text"
                value={form.account_holder}
                onChange={(e) => setForm((prev) => ({ ...prev, account_holder: e.target.value }))}
                placeholder="VD: NGUYEN VAN A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white text-sm uppercase text-ink-primary outline-hidden focus:border-brand-primary"
              />
            </div>

            <label className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-border-subtle bg-white text-xs font-semibold text-ink-primary cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Đặt làm tài khoản nhận tiền mặc định</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border-subtle bg-white hover:bg-slate-50 text-xs font-semibold text-ink-body cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {isSubmitting ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm tài khoản"}
            </button>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" rounded="rounded-xl" />
          <Skeleton className="h-20 w-full" rounded="rounded-xl" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-2">
          <Building2 className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-ink-primary">Chưa có tài khoản ngân hàng nào</p>
          <p className="text-xs text-ink-subtle max-w-md mx-auto">
            Hãy thêm ít nhất 1 tài khoản ngân hàng để Quản trị viên có thể quét mã VietQR chuyển
            khoản doanh thu cho bạn.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                acc.is_default ? "border-teal-300 bg-teal-50/30" : "border-border-subtle bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {acc.bank_code}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-ink-primary">{acc.bank_name}</span>
                    {acc.is_default ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-semibold">
                        <Star className="w-3 h-3 fill-teal-700" />
                        Mặc định
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs sm:text-sm font-mono font-semibold text-ink-body mt-0.5">
                    {acc.account_number}
                  </div>
                  <div className="text-xs text-ink-subtle uppercase">{acc.account_holder}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!acc.is_default ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(acc.id)}
                    className="px-3 py-1.5 rounded-lg border border-border-subtle bg-white hover:bg-slate-50 text-xs font-semibold text-ink-body cursor-pointer"
                  >
                    Đặt mặc định
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEditForm(acc)}
                  aria-label="Sửa tài khoản"
                  className="p-2 rounded-lg border border-border-subtle bg-white hover:bg-slate-50 text-ink-subtle hover:text-ink-primary cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(acc.id)}
                  aria-label="Xóa tài khoản"
                  className="p-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
