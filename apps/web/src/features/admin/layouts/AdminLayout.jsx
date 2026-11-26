import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, CheckCircle2, X } from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";
import { echo } from "../../../lib/echo";
import { formatCurrencyVnd } from "../../provider/models/serviceFormModel";

/**
 * Layout dùng chung cho toàn bộ các trang Quản trị viên (Admin).
 * Tích hợp lắng nghe sự kiện Realtime yêu cầu rút tiền để hiển thị thông báo nổi & đồng bộ Sidebar tức thời.
 */
export default function AdminLayout({ children, pendingCount }) {
  const [liveAlert, setLiveAlert] = useState(null);

  useEffect(() => {
    const channel = echo.channel("admin.withdrawals");
    let timerId = null;

    const handleWithdrawalEvent = (payload) => {
      window.dispatchEvent(new CustomEvent("stb:withdrawal-updated", { detail: payload }));

      if (!payload?.request_code) return;

      let nextAlert = null;
      if (payload.action === "created") {
        nextAlert = {
          tone: "info",
          title: "Yêu cầu rút tiền mới!",
          message: `${payload.provider_name || "Nhà cung cấp dịch vụ"} yêu cầu rút ${formatCurrencyVnd(payload.amount || 0)} (${payload.request_code})`,
        };
      } else if (payload.action === "disputed") {
        nextAlert = {
          tone: "danger",
          title: "NCC báo chưa nhận được khoản chi trả!",
          message: `${payload.provider_name || "Nhà cung cấp dịch vụ"} phản hồi lệnh ${payload.request_code}.`,
        };
      } else if (payload.action === "completed") {
        nextAlert = {
          tone: "success",
          title: "Phiên rút tiền đã hoàn tất",
          message: `${payload.provider_name || "Nhà cung cấp dịch vụ"} đã xác nhận nhận ${formatCurrencyVnd(payload.amount || 0)} (${payload.request_code}).`,
        };
      }

      if (nextAlert) {
        setLiveAlert(nextAlert);
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => setLiveAlert(null), 8000);
      }
    };

    channel.listen(".withdrawal.updated", handleWithdrawalEvent);

    return () => {
      if (timerId) clearTimeout(timerId);
      channel.stopListening(".withdrawal.updated", handleWithdrawalEvent);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface-base flex flex-col lg:flex-row">
      <AdminSidebar pendingCount={pendingCount} />

      <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
        {children}
      </main>

      {liveAlert ? (
        <div
          className={`fixed top-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-3 ${
            liveAlert.tone === "danger"
              ? "bg-rose-950 text-white border-rose-700"
              : liveAlert.tone === "success"
                ? "bg-emerald-950 text-white border-emerald-700"
                : "bg-slate-900 text-white border-teal-500/60"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {liveAlert.tone === "danger" ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : liveAlert.tone === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Banknote className="w-5 h-5 text-teal-400" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-sm font-bold leading-snug">{liveAlert.title}</div>
            <div className="text-xs text-slate-200 leading-relaxed">{liveAlert.message}</div>
            <div className="pt-1">
              <Link
                to="/admin/withdrawals"
                onClick={() => setLiveAlert(null)}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
              >
                Xử lý ngay →
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveAlert(null)}
            aria-label="Đóng thông báo"
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
