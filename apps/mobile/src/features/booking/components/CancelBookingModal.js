import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AlertTriangle, X } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing } from "../../../theme/tokens";
import { CANCEL_REASON_PRESETS } from "../models/bookingModel";

export default function CancelBookingModal({ visible, bookingCode, loading, onClose, onConfirm }) {
  const [selectedPreset, setSelectedPreset] = useState(CANCEL_REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const finalReason = customReason.trim() || selectedPreset;
    onConfirm?.(finalReason);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.warnIcon}>
                <AlertTriangle size={18} color="#E11D48" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.title}>Hủy đơn đặt chỗ</AppText>
                <AppText style={styles.subtitle}>Mã đơn: {bookingCode || "—"}</AppText>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} disabled={loading}>
              <X size={18} color={colors.inkPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <AppText style={styles.helperText}>
              Số chỗ/phòng đã giữ sẽ được hoàn trả ngay lập tức. Vui lòng chọn hoặc nhập lý do hủy
              đơn:
            </AppText>

            <View style={styles.presetList}>
              {CANCEL_REASON_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset && !customReason.trim();
                return (
                  <Pressable
                    key={preset}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => {
                      setSelectedPreset(preset);
                      setCustomReason("");
                    }}
                  >
                    <AppText style={[styles.presetText, isSelected && styles.presetTextActive]}>
                      {preset}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <AppText style={styles.inputLabel}>Hoặc ghi chú lý do khác (tùy chọn)</AppText>
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="Nhập lý do hủy đơn..."
              multiline
              numberOfLines={3}
              maxLength={500}
              style={styles.input}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <AppText style={styles.cancelBtnText}>Giữ lại đơn</AppText>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppText style={styles.confirmBtnText}>Xác nhận hủy</AppText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  dialog: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: spacing.lg,
    maxHeight: "85%",
    gap: 14,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  warnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.inkMuted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 9999,
    backgroundColor: "#F1F5F9",
  },
  body: {
    maxHeight: 320,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkBody,
    marginBottom: 12,
  },
  presetList: {
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  presetChipActive: {
    borderColor: "#E11D48",
    backgroundColor: "#FFF1F2",
  },
  presetText: {
    fontSize: 13,
    color: colors.inkBody,
    fontWeight: "500",
  },
  presetTextActive: {
    color: "#BE123C",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.lg,
    padding: 12,
    fontSize: 13.5,
    color: colors.inkPrimary,
    minHeight: 80,
    backgroundColor: "#FFFFFF",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
