import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { CheckCircle2, Maximize2, QrCode, X } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import QrCodeSvg from "../../../components/common/QrCodeSvg";
import { colors, spacing } from "../../../theme/tokens";

/**
 * Component hiển thị thẻ vé điện tử QR Check-in bảo mật của Du khách.
 * Hỗ trợ phóng to toàn màn hình để nhân viên quầy dễ quét mã tại điểm dịch vụ.
 */
export default function TouristQrTicketCard({
  bookingCode,
  serviceName,
  scheduleTime,
  qrToken,
  checkedInAt,
}) {
  const [zoomOpen, setZoomOpen] = useState(false);

  if (!qrToken) return null;

  const isCheckedIn = Boolean(checkedInAt);
  const qrPayload = JSON.stringify({
    code: bookingCode,
    token: qrToken,
  });

  return (
    <>
      <View style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <View style={styles.titleRow}>
            <QrCode size={18} color={colors.brandPrimary} />
            <AppText style={styles.headerTitle}>Vé điện tử QR Check-in</AppText>
          </View>
          <View style={[styles.statusBadge, isCheckedIn ? styles.checkedBadge : styles.readyBadge]}>
            {isCheckedIn ? <CheckCircle2 size={12} color="#047857" /> : null}
            <AppText
              style={[styles.statusText, isCheckedIn ? styles.checkedText : styles.readyText]}
            >
              {isCheckedIn ? "Đã check-in" : "Sẵn sàng check-in"}
            </AppText>
          </View>
        </View>

        <View style={styles.qrContainer}>
          <View style={styles.qrBox}>
            <QrCodeSvg value={qrPayload} size={172} />
          </View>
          <AppText style={styles.qrHint}>
            Xuất trình mã QR này cho nhân viên đối tác khi nhận phòng / khởi hành
          </AppText>
          <Pressable style={styles.zoomBtn} onPress={() => setZoomOpen(true)}>
            <Maximize2 size={14} color={colors.brandPrimary} />
            <AppText style={styles.zoomBtnText}>Phóng to mã QR</AppText>
          </Pressable>
        </View>

        <View style={styles.dividerDashed} />

        <View style={styles.metaRow}>
          <AppText style={styles.metaLabel}>Mã đơn</AppText>
          <AppText style={styles.metaVal} numberOfLines={1}>
            {bookingCode || "—"}
          </AppText>
        </View>
        <View style={styles.metaRow}>
          <AppText style={styles.metaLabel}>Mã vé bảo mật</AppText>
          <AppText style={styles.tokenVal} numberOfLines={1} ellipsizeMode="middle">
            {qrToken}
          </AppText>
        </View>
        {scheduleTime ? (
          <View style={styles.metaRow}>
            <AppText style={styles.metaLabel}>Lịch trình</AppText>
            <AppText style={styles.metaVal} numberOfLines={2}>
              {scheduleTime}
            </AppText>
          </View>
        ) : null}
      </View>

      <Modal
        visible={zoomOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setZoomOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.modalTitle}>Mã QR Check-in</AppText>
                <AppText style={styles.modalSub} numberOfLines={1}>
                  {serviceName || bookingCode}
                </AppText>
              </View>
              <Pressable onPress={() => setZoomOpen(false)} style={styles.closeBtn}>
                <X size={20} color={colors.inkPrimary} />
              </Pressable>
            </View>

            <View style={styles.modalQrWrap}>
              <QrCodeSvg value={qrPayload} size={240} />
            </View>

            <AppText style={styles.modalCode}>{bookingCode}</AppText>
            <AppText style={styles.modalToken}>{qrToken}</AppText>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: spacing.md,
    gap: 10,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  readyBadge: {
    backgroundColor: "#E0F2FE",
  },
  checkedBadge: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  readyText: {
    color: colors.brandPrimary,
  },
  checkedText: {
    color: "#047857",
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  qrBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  qrHint: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  zoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  zoomBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  dividerDashed: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 0.8,
    borderColor: "#CBD5E1",
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaLabel: {
    fontSize: 12.5,
    color: colors.inkMuted,
  },
  metaVal: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  tokenVal: {
    flex: 1,
    textAlign: "right",
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: "center",
    gap: 10,
  },
  modalTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  modalSub: {
    fontSize: 12.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalQrWrap: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginVertical: 6,
  },
  modalCode: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  modalToken: {
    fontSize: 12,
    color: colors.brandPrimary,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
