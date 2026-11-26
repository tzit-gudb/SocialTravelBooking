import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Lock,
  QrCode,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import ProviderLayout from "../layouts/ProviderLayout";
import Typography from "../../../components/ui/Typography";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useDebouncedUrlSearch } from "../../../hooks/useDebouncedUrlSearch";
import { echo } from "../../../lib/echo";
import { formatCurrencyVnd } from "../models/serviceFormModel";
import providerWalletApi from "../services/providerWalletApi";
import providerBankAccountApi from "../services/providerBankAccountApi";
import ProviderWithdrawModal from "../components/ProviderWithdrawModal";

const TX_FILTER_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "booking_payment", label: "Giải ngân tiền cọc" },
  { id: "withdraw", label: "Rút tiền" },
  { id: "refund", label: "Hoàn tiền" },
  { id: "commission", label: "Chiết khấu" },
];

const WITHDRAWAL_STATUS_META = {
  pending: {
    label: "Chờ Quản trị viên chi trả",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
  },
  paid: {
    label: "Đã chuyển khoản · Chờ bạn xác nhận",
    cls: "bg-sky-50 text-sky-800 border-sky-200",
  },
  completed: {
    label: "Hoàn tất (Đã nhận tiền)",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  disputed: {
    label: "Đã báo chưa nhận tiền · Đang kiểm tra",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  rejected: {
    label: "Đã từ chối & Hoàn tiền vào ví",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const TX_TYPE_META = {
  booking_payment: {
    label: "Giải ngân tiền cọc",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  deposit: {
    label: "Nạp tiền ví",
    cls: "bg-sky-50 text-sky-700 border-sky-200",
  },
  affiliate_reward: {
    label: "Thưởng giới thiệu",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
  withdraw: {
    label: "Rút tiền ngân hàng",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
  },
  refund: {
    label: "Hoàn tiền / Từ chối rút",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  commission: {
    label: "Phí nền tảng",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

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
 * Trang Quản lý Ví Doanh thu, Ký quỹ Escrow & Theo dõi Yêu cầu Rút tiền (/provider/wallet).
 */
export default function ProviderWalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") || "all";
  const currentPage = Math.max(1, Number(searchParams.get("page") || 1));
  const [searchInput, setSearchInput, searchQuery] = useDebouncedUrlSearch(
    searchParams,
    setSearchParams,
  );

  const [providerId, setProviderId] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, locked_balance: 0, currency: "VND" });
  const [stats, setStats] = useState({
    total_earned: 0,
    total_withdrawn: 0,
    pending_withdrawal_amount: 0,
    pending_escrow_bookings_count: 0,
    checked_in_bookings_count: 0,
    paid_awaiting_confirmation_count: 0,
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    booking_payment: 0,
    withdraw: 0,
    refund: 0,
    commission: 0,
  });
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(true);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [busyWithdrawalId, setBusyWithdrawalId] = useState(null);
  const [disputeTargetId, setDisputeTargetId] = useState(null);
  const [disputeNote, setDisputeNote] = useState("");

  const fetchSummaryAndBanks = useCallback(async () => {
    try {
      const [summaryRes, bankRes] = await Promise.all([
        providerWalletApi.getWalletSummary(),
        providerBankAccountApi.list(),
      ]);
      const payload = summaryRes?.data;
      if (payload?.provider_id) setProviderId(payload.provider_id);
      if (payload?.wallet) setWallet(payload.wallet);
      if (payload?.stats) setStats(payload.stats);
      setBankAccounts(Array.isArray(bankRes?.data) ? bankRes.data : []);
    } catch (err) {
      setErrorMsg(err?.message || "Không thể tải thông tin ví doanh thu.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const res = await providerWalletApi.listWithdrawals({ per_page: 10 });
      setWithdrawals(Array.isArray(res?.data) ? res.data : []);
    } catch {
      // Bỏ qua lỗi nền
    } finally {
      setIsLoadingWithdrawals(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await providerWalletApi.listTransactions({
        type: typeFilter,
        q: searchQuery,
        page: currentPage,
        per_page: 15,
      });
      setTransactions(Array.isArray(res?.data) ? res.data : []);
      if (res?.counts) setCounts(res.counts);
      if (res?.meta) setMeta(res.meta);
    } catch (err) {
      setErrorMsg(err?.message || "Không thể tải lịch sử giao dịch ví.");
    } finally {
      setIsLoadingTx(false);
    }
  }, [typeFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchSummaryAndBanks();
    fetchWithdrawals();
  }, [fetchSummaryAndBanks, fetchWithdrawals]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Realtime: lắng nghe thay đổi booking (Escrow) VÀ thay đổi trạng thái rút tiền (Admin / SePay out)
  useEffect(() => {
    if (!providerId) return undefined;

    const bookingChannel = echo.channel(`provider.${providerId}.bookings`);
    const walletChannel = echo.channel(`provider.${providerId}.wallet`);

    bookingChannel.listen(".booking.updated", () => {
      fetchSummaryAndBanks();
      fetchTransactions();
    });

    walletChannel.listen(".withdrawal.updated", (payload) => {
      fetchSummaryAndBanks();
      fetchWithdrawals();
      fetchTransactions();

      if (payload?.action === "paid") {
        setSuccessToast(
          `Lệnh rút ${payload.request_code} đã được chi trả! Vui lòng kiểm tra tài khoản ngân hàng và bấm xác nhận.`,
        );
        setTimeout(() => setSuccessToast(""), 6000);
      } else if (payload?.action === "rejected") {
        setSuccessToast(
          `Lệnh rút ${payload.request_code} đã bị từ chối và tiền đã được hoàn lại vào số dư khả dụng.`,
        );
        setTimeout(() => setSuccessToast(""), 6000);
      }
    });

    return () => {
      echo.leaveChannel(`provider.${providerId}.bookings`);
      echo.leaveChannel(`provider.${providerId}.wallet`);
    };
  }, [providerId, fetchSummaryAndBanks, fetchWithdrawals, fetchTransactions]);

  const handleTypeChange = (nextType) => {
    setIsLoadingTx(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("type", nextType);
      next.set("page", "1");
      return next;
    });
  };

  const handlePageChange = (nextPage) => {
    setIsLoadingTx(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  const handleWithdrawSubmit = async (formPayload) => {
    setIsWithdrawing(true);
    setErrorMsg("");
    try {
      const res = await providerWalletApi.withdraw(formPayload);
      setWithdrawModalOpen(false);
      if (res?.data?.wallet) {
        setWallet(res.data.wallet);
      }
      setSuccessToast(res?.message || "Gửi yêu cầu rút tiền thành công!");
      setTimeout(() => setSuccessToast(""), 5000);
      fetchSummaryAndBanks();
      fetchWithdrawals();
      fetchTransactions();
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmReceipt = async (withdrawalId) => {
    setBusyWithdrawalId(withdrawalId);
    setErrorMsg("");
    try {
      const res = await providerWalletApi.confirmReceipt(withdrawalId);
      setSuccessToast(res?.message || "Đã xác nhận nhận khoản chi trả thành công!");
      setTimeout(() => setSuccessToast(""), 5000);
      fetchSummaryAndBanks();
      fetchWithdrawals();
    } catch (err) {
      setErrorMsg(err?.message || "Không thể xác nhận nhận tiền.");
    } finally {
      setBusyWithdrawalId(null);
    }
  };

  const handleSubmitDispute = async (withdrawalId) => {
    setBusyWithdrawalId(withdrawalId);
    setErrorMsg("");
    try {
      const res = await providerWalletApi.reportIssue(withdrawalId, disputeNote);
      setDisputeTargetId(null);
      setDisputeNote("");
      setSuccessToast(res?.message || "Đã gửi phản hồi tới Quản trị viên.");
      setTimeout(() => setSuccessToast(""), 5000);
      fetchWithdrawals();
    } catch (err) {
      setErrorMsg(err?.message || "Không thể gửi phản hồi.");
    } finally {
      setBusyWithdrawalId(null);
    }
  };

  return (
    <ProviderLayout
      title="Ví doanh thu & Quyết toán"
      subtitle="Theo dõi số dư khả dụng, ký quỹ Escrow, yêu cầu rút tiền về ngân hàng và xác nhận khoản chi trả theo thời gian thực."
    >
      <div className="space-y-6">
        {successToast ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        ) : null}

        {errorMsg ? (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* 4 Thẻ KPI Tài chính */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-teal-100 block">
                  Số dư khả dụng (Có thể rút)
                </span>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-36 mt-1.5 bg-white/20" rounded="rounded-lg" />
                ) : (
                  <div className="text-2xl font-bold mt-1 tracking-tight">
                    {formatCurrencyVnd(wallet.balance)}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(true)}
              disabled={isLoadingSummary || Number(wallet.balance) < 50000}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white text-teal-800 hover:bg-teal-50 disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Rút tiền về ngân hàng
            </button>
          </div>

          <div className="bg-surface-elevated border border-sky-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-sky-700 block">
                  Đang tạm giữ ký quỹ (Escrow)
                </span>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-32 mt-1.5" rounded="rounded-lg" />
                ) : (
                  <div className="text-2xl font-bold text-ink-primary mt-1">
                    {formatCurrencyVnd(wallet.locked_balance)}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-subtle pt-1 border-t border-slate-100">
              <span>
                <strong className="text-sky-700">{stats.pending_escrow_bookings_count}</strong> đơn
                chờ check-in
              </span>
              <Link
                to="/provider/qr-checkin"
                className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline"
              >
                <QrCode className="w-3.5 h-3.5" />
                Quét QR
              </Link>
            </div>
          </div>

          <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-ink-subtle block">
                  Tổng tiền cọc đã giải ngân
                </span>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-32 mt-1.5" rounded="rounded-lg" />
                ) : (
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {formatCurrencyVnd(stats.total_earned)}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-xs text-ink-subtle pt-1 border-t border-slate-100">
              Từ <strong className="text-ink-primary">{stats.checked_in_bookings_count}</strong> đơn
              đã check-in / hoàn thành
            </div>
          </div>

          <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-medium text-ink-subtle block">
                  Tổng tiền đã chuyển về ngân hàng
                </span>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-32 mt-1.5" rounded="rounded-lg" />
                ) : (
                  <div className="text-2xl font-bold text-ink-primary mt-1">
                    {formatCurrencyVnd(stats.total_withdrawn)}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-subtle pt-1 border-t border-slate-100">
              <span>{bankAccounts.length} TK ngân hàng</span>
              <Link
                to="/provider/profile?tab=bank-accounts"
                className="text-teal-700 font-semibold hover:underline"
              >
                Quản lý TK
              </Link>
            </div>
          </div>
        </div>

        {/* Khu vực Theo dõi Yêu cầu Rút tiền & Xác nhận Nhận khoản chi trả */}
        <div className="bg-surface-elevated border border-border-subtle rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <Typography variant="h3" className="text-base font-bold text-ink-primary">
                Yêu cầu rút tiền & Xác nhận nhận khoản chi trả
              </Typography>
              <p className="text-xs text-ink-subtle mt-0.5">
                Sau khi SePay hoặc Quản trị viên xác nhận đã chuyển khoản, bạn vui lòng bấm xác nhận
                để hoàn tất phiên rút tiền.
              </p>
            </div>
            {stats.paid_awaiting_confirmation_count > 0 ? (
              <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold shrink-0">
                {stats.paid_awaiting_confirmation_count} lệnh chờ bạn xác nhận
              </span>
            ) : null}
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {isLoadingWithdrawals ? (
              <Skeleton className="h-24 w-full" rounded="rounded-xl" />
            ) : withdrawals.length === 0 ? (
              <div className="py-6 text-center text-xs sm:text-sm text-ink-subtle">
                Chưa có yêu cầu rút tiền nào được tạo.
              </div>
            ) : (
              withdrawals.map((w) => {
                const sMeta = WITHDRAWAL_STATUS_META[w.status] || WITHDRAWAL_STATUS_META.pending;
                const isBusy = busyWithdrawalId === w.id;

                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      w.status === "paid"
                        ? "border-sky-300 bg-sky-50/40"
                        : w.status === "disputed"
                          ? "border-rose-300 bg-rose-50/40"
                          : "border-border-subtle bg-white"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-ink-primary">
                            {w.request_code}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${sMeta.cls}`}
                          >
                            {sMeta.label}
                          </span>
                        </div>
                        <div className="text-xs text-ink-body">
                          Nhận tại: <strong>{w.bank_name}</strong> · STK{" "}
                          <span className="font-mono font-semibold">{w.account_number}</span> (
                          {w.account_holder})
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
                          <span>Tạo lúc: {formatDateTimeVi(w.created_at)}</span>
                          {w.payout_reference ? (
                            <span className="text-teal-700 font-semibold">
                              Mã GD: <span className="font-mono">{w.payout_reference}</span> (
                              {w.payout_method === "sepay_webhook"
                                ? "SePay tự động"
                                : "Quản trị viên chi trả"}
                              )
                            </span>
                          ) : null}
                          {w.confirmed_at ? (
                            <span className="text-emerald-700 font-semibold">
                              Đã xác nhận lúc: {formatDateTimeVi(w.confirmed_at)}
                            </span>
                          ) : null}
                        </div>
                        {w.rejected_reason ? (
                          <div className="text-xs text-rose-700 font-medium">
                            Lý do từ chối: {w.rejected_reason}
                          </div>
                        ) : null}
                        {w.dispute_note ? (
                          <div className="text-xs text-rose-700 font-medium">
                            Phản hồi của bạn: {w.dispute_note}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between gap-2 shrink-0">
                        <div className="text-base sm:text-lg font-bold text-ink-primary">
                          {formatCurrencyVnd(w.amount)}
                        </div>

                        {w.status === "paid" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleConfirmReceipt(w.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Xác nhận đã nhận khoản chi trả
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setDisputeTargetId(disputeTargetId === w.id ? null : w.id);
                                setDisputeNote("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 disabled:opacity-50 text-rose-700 text-xs font-semibold cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Chưa nhận được khoản chi trả
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {disputeTargetId === w.id ? (
                      <div className="mt-3 pt-3 border-t border-sky-200 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={disputeNote}
                          onChange={(e) => setDisputeNote(e.target.value)}
                          placeholder="Nhập mô tả ngắn (VD: Đã kiểm tra sao kê nhưng chưa thấy tiền về)..."
                          className="flex-1 px-3 py-2 rounded-xl border border-border-subtle bg-white text-xs text-ink-primary outline-hidden focus:border-rose-400"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSubmitDispute(w.id)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shrink-0"
                        >
                          Gửi báo cáo cho Quản trị viên
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ghi chú cơ chế Escrow */}
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-3 text-xs sm:text-sm text-sky-900">
          <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <p>
            <strong>Cơ chế ký quỹ Escrow tự động:</strong> Khi khách thanh toán cọc qua SePay, số
            tiền cọc được ghi nhận vào mục <strong>Đang tạm giữ ký quỹ</strong>. Ngay khi bạn quét
            mã QR Check-in (hoặc khách xác nhận đã nhận dịch vụ), tiền cọc sẽ lập tức giải ngân sang{" "}
            <strong>Số dư khả dụng</strong> để bạn rút về ngân hàng.
          </p>
        </div>

        {/* Bảng Lịch sử Biến động Ví */}
        <div className="bg-surface-elevated border border-border-subtle rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <Typography variant="h3" className="text-base font-bold text-ink-primary">
                Lịch sử biến động số dư ví
              </Typography>
              <p className="text-xs text-ink-subtle mt-0.5">
                Ghi nhận chi tiết từng giao dịch giải ngân tiền cọc, rút tiền và hoàn tiền.
              </p>
            </div>

            <div className="relative w-full lg:w-72">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã đơn, mã rút, ghi chú..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border-subtle bg-surface-base text-xs sm:text-sm text-ink-primary outline-hidden focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
              <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 bg-slate-50/60 border-b border-border-subtle flex items-center gap-1.5 overflow-x-auto">
            {TX_FILTER_TABS.map((tab) => {
              const active = typeFilter === tab.id;
              const count = counts?.[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeChange(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-ink-body hover:bg-slate-200/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 ? (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                        active ? "bg-white/25 text-white" : "bg-slate-200/80 text-ink-subtle"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                  <th className="py-3 px-4 sm:px-6">Loại & Mã tham chiếu</th>
                  <th className="py-3 px-4">Nội dung giao dịch</th>
                  <th className="py-3 px-4">Biến động số dư</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {isLoadingTx ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="py-4 px-4 sm:px-6">
                        <Skeleton className="h-5 w-28 mb-1.5" rounded="rounded-full" />
                        <Skeleton className="h-3.5 w-24" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-56" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-40" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-4 w-28" rounded="rounded-md" />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <Skeleton className="h-5 w-24 ml-auto" rounded="rounded-md" />
                      </td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-ink-subtle">
                      <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                      <Typography variant="body" className="font-semibold text-ink-primary">
                        Chưa có giao dịch ví nào
                      </Typography>
                      <Typography variant="caption" className="text-ink-subtle block mt-1">
                        Các khoản giải ngân tiền cọc sau khi check-in và lệnh rút tiền sẽ hiển thị
                        tại đây.
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const metaInfo = TX_TYPE_META[tx.type] || {
                      label: tx.type,
                      cls: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const isPositive = Number(tx.amount) >= 0;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${metaInfo.cls}`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {metaInfo.label}
                          </span>
                          <span className="font-mono text-xs font-semibold text-ink-subtle block mt-1">
                            {tx.reference_id || `#TX-${tx.id}`}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs sm:text-sm text-ink-primary max-w-xs">
                          <span className="line-clamp-2 font-medium">
                            {normalizeWalletNote(tx.note) || metaInfo.label}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs text-ink-subtle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span>{formatCurrencyVnd(tx.balance_before)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <strong className="text-ink-primary font-semibold">
                              {formatCurrencyVnd(tx.balance_after)}
                            </strong>
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs text-ink-subtle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateTimeVi(tx.created_at)}
                          </span>
                        </td>

                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <span
                            className={`font-bold text-sm sm:text-base ${
                              isPositive ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {formatCurrencyVnd(Math.abs(Number(tx.amount)))}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoadingTx && meta.total > 0 ? (
            <div className="px-5 py-3.5 border-t border-border-subtle bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-subtle">
              <span>
                Hiển thị <strong>{transactions.length}</strong> / <strong>{meta.total}</strong> giao
                dịch
              </span>
              {meta.last_page > 1 ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={meta.current_page <= 1}
                    onClick={() => handlePageChange(meta.current_page - 1)}
                    className="px-3 py-1 rounded-lg border border-border-subtle bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-ink-primary cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="px-2 font-semibold text-ink-primary">
                    Trang {meta.current_page} / {meta.last_page}
                  </span>
                  <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => handlePageChange(meta.current_page + 1)}
                    className="px-3 py-1 rounded-lg border border-border-subtle bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-ink-primary cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {withdrawModalOpen ? (
        <ProviderWithdrawModal
          availableBalance={wallet.balance}
          bankAccounts={bankAccounts}
          isSubmitting={isWithdrawing}
          onClose={() => setWithdrawModalOpen(false)}
          onSubmit={handleWithdrawSubmit}
        />
      ) : null}
    </ProviderLayout>
  );
}
