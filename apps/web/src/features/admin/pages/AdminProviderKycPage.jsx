import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import Typography from "../../../components/ui/Typography";
import adminKycService from "../services/adminKycService";
import ProviderKycTable from "../components/ProviderKycTable";
import KycDetailModal from "../components/KycDetailModal";
import KycRejectDialog from "../components/KycRejectDialog";

/**
 * Screen Orchestrator: Trang Kiểm duyệt Nhà cung cấp (Route: /admin/providers)
 * Sử dụng AdminLayout và thanh AdminSidebar dùng chung.
 */
export default function AdminProviderKycPage() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectingProvider, setRejectingProvider] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadKycData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminKycService.fetchKycProviders({
        status: statusFilter,
        search: searchQuery,
      });
      setProviders(res.data || []);
      if (res.meta?.pending_count !== undefined) {
        setPendingCount(res.meta.pending_count);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadKycData();
  }, [loadKycData]);

  const handleApprove = async (id) => {
    const res = await adminKycService.approveKyc(id);
    showToast(res.message || "Đã phê duyệt đối tác thành công!");
    setSelectedProvider(null);
    loadKycData();
  };

  const handleRequestReject = (provider) => {
    setRejectingProvider(provider);
  };

  const handleConfirmReject = async (reason) => {
    if (!rejectingProvider) return;
    const res = await adminKycService.rejectKyc(rejectingProvider.id, reason);
    showToast(res.message || "Đã gửi thông báo từ chối hồ sơ đối tác.");
    setRejectingProvider(null);
    setSelectedProvider(null);
    loadKycData();
  };

  return (
    <AdminLayout pendingCount={pendingCount}>
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 text-sm font-medium animate-in slide-in-from-top-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Header trang KYC */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Typography variant="h1" className="text-2xl sm:text-3xl font-bold text-ink-primary">
              Kiểm duyệt Nhà cung cấp
            </Typography>
            <Typography variant="body-sm" className="text-ink-subtle mt-1">
              Thẩm định giấy phép kinh doanh lữ hành và cấp quyền mở bán tour & lưu trú trên sàn.
            </Typography>
          </div>

          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 self-start">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{pendingCount} hồ sơ đang chờ xét duyệt</span>
            </span>
          )}
        </div>

        {/* Bảng danh sách & Bộ lọc */}
        <ProviderKycTable
          providers={providers}
          isLoading={isLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onViewDetail={(item) => setSelectedProvider(item)}
          onApproveQuick={handleApprove}
          onRequestReject={handleRequestReject}
          pendingCount={pendingCount}
        />
      </div>

      {/* Modal Xem chi tiết & Thẩm định tài liệu */}
      <KycDetailModal
        provider={selectedProvider}
        isOpen={Boolean(selectedProvider)}
        onClose={() => setSelectedProvider(null)}
        onApprove={handleApprove}
        onRequestReject={handleRequestReject}
      />

      {/* Hộp thoại Nhập lý do Từ chối hồ sơ */}
      <KycRejectDialog
        isOpen={Boolean(rejectingProvider)}
        providerName={rejectingProvider?.business_name || ""}
        onClose={() => setRejectingProvider(null)}
        onConfirm={handleConfirmReject}
      />
    </AdminLayout>
  );
}
