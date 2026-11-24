import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import Typography from "../../../components/ui/Typography";
import { useDebouncedUrlSearch } from "../../../hooks/useDebouncedUrlSearch";
import { echo } from "../../../lib/echo";
import AdminBookingsTable from "../components/AdminBookingsTable";
import BookingOversightModal from "../components/BookingOversightModal";
import adminBookingApi from "../services/adminBookingApi";

/**
 * Screen Orchestrator: Trang Giám sát Đơn đặt chỗ & Đối soát Ví (Route: /admin/bookings)
 */
export default function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const paymentFilter = searchParams.get("payment_status") || "all";
  const [searchInput, setSearchInput, searchQuery] = useDebouncedUrlSearch(
    searchParams,
    setSearchParams,
  );

  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending_payment: 0,
    confirmed: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const detailBookingIdRef = useRef(null);

  useEffect(() => {
    detailBookingIdRef.current = detailBooking?.id ?? null;
  }, [detailBooking?.id]);

  useEffect(() => {
    if (!searchParams.has("status") || !searchParams.has("payment_status")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!next.has("status")) next.set("status", "all");
          if (!next.has("payment_status")) next.set("payment_status", "all");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    });
  };

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminBookingApi.listBookings({
        status: statusFilter,
        payment_status: paymentFilter,
        q: searchQuery,
      });
      setBookings(res?.data || []);
      if (res?.counts) setCounts(res.counts);
    } catch (err) {
      setErrorToast(err?.message || "Không thể tải danh sách đơn đặt chỗ.");
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, paymentFilter, searchQuery]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const channel = echo.channel("admin.bookings");

    channel.listen(".booking.updated", async (payload) => {
      if (!payload?.booking_id) return;

      setBookings((prev) =>
        prev.map((item) =>
          item.id === payload.booking_id
            ? {
                ...item,
                status: payload.status || item.status,
                checked_in_at: payload.checked_in_at ?? item.checked_in_at,
                cancelled_at: payload.cancelled_at ?? item.cancelled_at,
                cancel_reason: payload.cancel_reason ?? item.cancel_reason,
              }
            : item,
        ),
      );

      loadBookings();

      if (detailBookingIdRef.current === payload.booking_id) {
        try {
          const res = await adminBookingApi.getBookingDetail(payload.booking_id);
          if (res?.data) setDetailBooking(res.data);
        } catch {
          // Bỏ qua lỗi làm mới modal nền
        }
      }
    });

    return () => {
      echo.leaveChannel("admin.bookings");
    };
  }, [loadBookings]);

  const handleViewDetail = async (bookingSummary) => {
    setDetailBooking(bookingSummary);
    setIsLoadingDetail(true);
    try {
      const res = await adminBookingApi.getBookingDetail(bookingSummary.id);
      if (res?.data) setDetailBooking(res.data);
    } catch (err) {
      setErrorToast(err?.message || "Không thể tải chi tiết đơn đặt chỗ.");
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <AdminLayout>
      {errorToast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border bg-rose-950 text-white border-rose-800 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <Typography variant="h1" className="text-2xl sm:text-3xl font-bold text-ink-primary">
            Đơn đặt chỗ & Đối soát
          </Typography>
          <Typography variant="body-sm" className="text-ink-subtle mt-1">
            Tra cứu đơn đặt tour/lưu trú, lịch sử thanh toán và biến động giải ngân ký quỹ.
          </Typography>
        </div>

        <AdminBookingsTable
          bookings={bookings}
          isLoading={isLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => updateParam("status", val || "all")}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={(val) => updateParam("payment_status", val || "all")}
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          counts={counts}
          onViewDetail={handleViewDetail}
        />
      </div>

      <BookingOversightModal
        key={detailBooking?.id || "closed"}
        booking={detailBooking}
        isLoadingDetail={isLoadingDetail}
        onClose={() => setDetailBooking(null)}
      />
    </AdminLayout>
  );
}
