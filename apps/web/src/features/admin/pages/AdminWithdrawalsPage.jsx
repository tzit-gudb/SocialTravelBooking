import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Banknote, CheckCircle2, Search } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useDebouncedUrlSearch } from "../../../hooks/useDebouncedUrlSearch";
import { formatCurrencyVnd } from "../../provider/models/serviceFormModel";
import adminWithdrawalApi from "../services/adminWithdrawalApi";
import AdminWithdrawalDetailModal from "../components/AdminWithdrawalDetailModal";

const STATUS_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ chi trả" },
  { id: "disputed", label: "Chưa nhận tiền" },
  { id: "paid", label: "Đã chi · Chờ NCC" },
  { id: "completed", label: "Hoàn tất" },
  { id: "rejected", label: "Đã từ chối" },
];

const STATUS_BADGE = {
  pending: { label: "Chờ chi trả", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  paid: { label: "Chờ NCC xác nhận", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  completed: { label: "Hoàn tất", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  disputed: { label: "NCC báo chưa nhận", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  rejected: { label: "Đã từ chối", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

function formatDateTimeVi(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("vi-VN");
}

/**
 * Trang Quản lý Chi trả & Đối soát Rút tiền cho Admin (/admin/withdrawals).
 */
export default function AdminWithdrawalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const [searchInput, setSearchInput, searchQuery] = useDebouncedUrlSearch(
    searchParams,
    setSearchParams,
  );

  const [withdrawals, setWithdrawals] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    disputed: 0,
    paid: 0,
    completed: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedIdRef = useRef(null);
  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
  }, [selected?.id]);

  const loadWithdrawals = useCallback(async () => {
    try {
      const res = await adminWithdrawalApi.listWithdrawals({
        status: statusFilter,
        q: searchQuery,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      setWithdrawals(list);
      if (res?.counts) setCounts(res.counts);

      if (selectedIdRef.current) {
        const refreshed = list.find((w) => w.id === selectedIdRef.current);
        if (refreshed) setSelected(refreshed);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Không thể tải danh sách rút tiền." });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  // Đồng bộ Realtime ngay lập tức từ sự kiện của AdminLayout
  useEffect(() => {
    const handleRealtime = () => {
      loadWithdrawals();
    };
    window.addEventListener("stb:withdrawal-updated", handleRealtime);
    return () => {
      window.removeEventListener("stb:withdrawal-updated", handleRealtime);
    };
  }, [loadWithdrawals]);

  const handleStatusChange = (nextStatus) => {
    setIsLoading(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("status", nextStatus);
      return next;
    });
  };

  const handleConfirmPaid = async (id, payoutRef) => {
    setIsSubmitting(true);
    try {
      const res = await adminWithdrawalApi.confirmPaid(id, payoutRef);
      setSelected(res?.data || null);
      setFeedback({
        type: "success",
        message: res?.message || "Đã xác nhận chi trả thành công!",
      });
      setTimeout(() => setFeedback(null), 5000);
      await loadWithdrawals();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (id, reason) => {
    setIsSubmitting(true);
    try {
      const res = await adminWithdrawalApi.reject(id, reason);
      setSelected(null);
      setFeedback({
        type: "success",
        message: res?.message || "Đã từ chối yêu cầu rút tiền.",
      });
      setTimeout(() => setFeedback(null), 5000);
      await loadWithdrawals();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Banknote className="w-6 h-6 text-brand-primary" />
            <Typography variant="h1" className="text-2xl sm:text-3xl font-bold text-ink-primary">
              Chi trả & Yêu cầu Rút tiền
            </Typography>
          </div>
          <Typography variant="body-sm" className="text-ink-subtle mt-1">
            Quét VietQR chi trả cho Nhà cung cấp dịch vụ (SePay tự động đối soát tiền ra) hoặc xác
            nhận thủ công theo mã tham chiếu.
          </Typography>
        </div>

        {feedback ? (
          <div
            className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${
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

        <div className="bg-surface-elevated border border-border-subtle rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.id;
                const count = counts?.[tab.id] ?? 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleStatusChange(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      active
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-ink-body hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 ? (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                          active ? "bg-white/25 text-white" : "bg-slate-100 text-ink-subtle"
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full xl:w-72">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã lệnh, STK, Nhà cung cấp..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-lg border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
              <Search className="w-4 h-4 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                  <th className="py-3 px-4 sm:px-6">Mã lệnh / Thời gian</th>
                  <th className="py-3 px-4">Nhà cung cấp dịch vụ</th>
                  <th className="py-3 px-4">Tài khoản nhận tiền</th>
                  <th className="py-3 px-4">Số tiền</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-4 sm:px-6">
                        <Skeleton className="h-4 w-28 mb-1.5" rounded="rounded-md" />
                        <Skeleton className="h-3 w-24" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-36" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-44" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-24" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-6 w-28" rounded="rounded-full" />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <Skeleton className="h-8 w-24 ml-auto" rounded="rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-subtle">
                      Chưa có yêu cầu rút tiền nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => {
                    const sMeta = STATUS_BADGE[w.status] || STATUS_BADGE.pending;
                    const isActionable = ["pending", "disputed"].includes(w.status);

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <span className="font-mono font-bold text-ink-primary block">
                            {w.request_code}
                          </span>
                          <span className="text-xs text-ink-subtle block mt-0.5">
                            {formatDateTimeVi(w.created_at)}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-semibold text-ink-primary block">
                            {w.provider?.business_name || "--"}
                          </span>
                          <span className="text-xs font-mono text-ink-subtle">
                            {w.provider?.phone || "--"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-semibold text-ink-primary block">
                            {w.bank_name} ({w.bank_code})
                          </span>
                          <span className="text-xs font-mono text-ink-subtle">
                            {w.account_number} · {w.account_holder}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap font-bold text-teal-700">
                          {formatCurrencyVnd(w.amount)}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${sMeta.cls}`}
                          >
                            {sMeta.label}
                          </span>
                          {w.payout_reference ? (
                            <span className="text-[11px] font-mono text-ink-subtle block mt-1">
                              Ref: {w.payout_reference}
                            </span>
                          ) : null}
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelected(w)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isActionable
                                ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                                : "border border-border-subtle bg-white hover:bg-slate-100 text-ink-primary"
                            }`}
                          >
                            {isActionable ? "Chi trả QR" : "Xem chi tiết"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected ? (
        <AdminWithdrawalDetailModal
          withdrawal={selected}
          isSubmitting={isSubmitting}
          onClose={() => setSelected(null)}
          onConfirmPaid={handleConfirmPaid}
          onReject={handleReject}
        />
      ) : null}
    </AdminLayout>
  );
}
