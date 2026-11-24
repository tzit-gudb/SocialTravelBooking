import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHoldRemainingSeconds } from "../features/booking/models/bookingModel";

const STORAGE_KEY = "@stb_pending_booking_v1";

const PendingBookingContext = createContext(null);

/**
 * Lưu trữ đơn đặt chỗ đang chờ thanh toán (pending_payment) vào AsyncStorage
 * để cả Khách vãng lai lẫn Thành viên đều thấy thanh nhắc nổi + đếm ngược
 * trên Trang chủ và quay lại màn hình thanh toán chỉ với 1 chạm.
 */
export function PendingBookingProvider({ children }) {
  const [pendingBooking, setPendingBookingState] = useState(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.paymentExpiresAt && getHoldRemainingSeconds(parsed.paymentExpiresAt) > 0) {
          setPendingBookingState(parsed);
        } else {
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const setPendingBooking = useCallback(async (bookingPayload) => {
    if (!bookingPayload) {
      setPendingBookingState(null);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      return;
    }

    const normalized = {
      bookingId: bookingPayload.bookingId || bookingPayload.id || null,
      bookingCode: bookingPayload.bookingCode || bookingPayload.booking_code || "",
      contactPhone: bookingPayload.contactPhone || bookingPayload.contact_phone || "",
      serviceName:
        bookingPayload.serviceName || bookingPayload.service?.name || "Đơn đặt chỗ của bạn",
      depositAmount: Number(bookingPayload.depositAmount ?? bookingPayload.deposit_amount ?? 0),
      paymentExpiresAt:
        bookingPayload.paymentExpiresAt || bookingPayload.payment_expires_at || null,
    };

    if (!normalized.bookingCode || getHoldRemainingSeconds(normalized.paymentExpiresAt) <= 0) {
      setPendingBookingState(null);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      return;
    }

    setPendingBookingState(normalized);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)).catch(() => {});
  }, []);

  const clearPendingBooking = useCallback(async () => {
    setPendingBookingState(null);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      pendingBooking,
      setPendingBooking,
      clearPendingBooking,
    }),
    [pendingBooking, setPendingBooking, clearPendingBooking],
  );

  return <PendingBookingContext.Provider value={value}>{children}</PendingBookingContext.Provider>;
}

export function usePendingBooking() {
  const ctx = useContext(PendingBookingContext);
  if (!ctx) {
    return {
      pendingBooking: null,
      setPendingBooking: () => {},
      clearPendingBooking: () => {},
    };
  }
  return ctx;
}
