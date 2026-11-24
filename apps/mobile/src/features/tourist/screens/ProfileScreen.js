import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing, touchTarget } from "../../../theme/tokens";
import { useAuth } from "../../../hooks/useAuth";
import touristProfileService from "../services/touristProfileService";
import {
  GENDER_OPTIONS,
  formatDateDisplay,
  isValidDateBeforeToday,
  normalizeDateOnly,
  transformTouristData,
  validateTouristProfileInput,
} from "../models/touristModel";

const MONTHS = Array.from({ length: 12 }, (_, idx) => idx + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, idx) => CURRENT_YEAR - idx);

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function padTwoDigits(num) {
  return String(num).padStart(2, "0");
}

function parseIsoParts(isoDate) {
  const normalized = normalizeDateOnly(isoDate);
  if (normalized) {
    const [year, month, day] = normalized.split("-").map(Number);
    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  return { year: 2000, month: 1, day: 1 };
}

export default function ProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const initialProfile = transformTouristData(user || {});

  const [formData, setFormData] = useState(() => ({
    name: user?.name || user?.tourist_profile?.name || "",
    phone_number: initialProfile.phoneNumber,
    gender: initialProfile.gender,
    date_of_birth: initialProfile.dateOfBirth,
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // State cho Modal chọn Ngày/Tháng/Năm không phụ thuộc thư viện native
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(2000);
  const [pickerMonth, setPickerMonth] = useState(1);
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerError, setPickerError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const response = await touristProfileService.getProfile();
        if (!isMounted || !response?.data) return;

        const normalized = transformTouristData(response.data);
        setFormData({
          name: response.data.name || normalized.name || "",
          phone_number: normalized.phoneNumber,
          gender: normalized.gender,
          date_of_birth: normalized.dateOfBirth,
        });

        updateUser((prevUser) => ({
          ...(prevUser || {}),
          name: response.data.name || prevUser?.name,
          display_name: response.data.name || prevUser?.display_name,
          avatar_url: response.data.avatar_url ?? prevUser?.avatar_url,
          tourist_profile: {
            ...(prevUser?.tourist_profile || {}),
            phone_number: normalized.phoneNumber,
            gender: normalized.gender,
            date_of_birth: normalized.dateOfBirth,
          },
        }));
      } catch {
        // Giữ nguyên dữ liệu hiện có từ AuthContext nếu tải API thất bại
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [updateUser]);

  const days = useMemo(() => {
    const maxDays = getDaysInMonth(pickerYear, pickerMonth);
    return Array.from({ length: maxDays }, (_, idx) => idx + 1);
  }, [pickerYear, pickerMonth]);

  const displayName = formData.name.trim() || initialProfile.name || "Du khách";
  const avatarUrl = initialProfile.avatarUrl;
  const avatarInitial = displayName.charAt(0).toUpperCase() || "D";
  const displayEmail = user?.email || initialProfile.email || "Chưa cập nhật email";
  const roleLabel =
    (user?.role || initialProfile.role || "tourist").toLowerCase() === "tourist"
      ? "Khách du lịch"
      : String(user?.role || initialProfile.role);

  const clearFieldError = (field) => {
    if (feedback) setFeedback(null);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const openDateModal = () => {
    const { year, month, day } = parseIsoParts(formData.date_of_birth);
    const clampedDay = Math.min(day, getDaysInMonth(year, month));
    setPickerYear(year);
    setPickerMonth(month);
    setPickerDay(clampedDay);
    setPickerError("");
    setDateModalVisible(true);
  };

  const handleSelectYear = (year) => {
    const maxDay = getDaysInMonth(year, pickerMonth);
    setPickerYear(year);
    if (pickerDay > maxDay) setPickerDay(maxDay);
    setPickerError("");
  };

  const handleSelectMonth = (month) => {
    const maxDay = getDaysInMonth(pickerYear, month);
    setPickerMonth(month);
    if (pickerDay > maxDay) setPickerDay(maxDay);
    setPickerError("");
  };

  const handleConfirmDate = () => {
    const safeDay = Math.min(pickerDay, getDaysInMonth(pickerYear, pickerMonth));
    const isoDate = `${pickerYear}-${padTwoDigits(pickerMonth)}-${padTwoDigits(safeDay)}`;

    if (!isValidDateBeforeToday(isoDate)) {
      setPickerError("Ngày sinh phải nhỏ hơn ngày hôm nay.");
      return;
    }

    setFormData((prev) => ({ ...prev, date_of_birth: isoDate }));
    clearFieldError("date_of_birth");
    setPickerError("");
    setDateModalVisible(false);
  };

  const handleSave = async () => {
    setFeedback(null);
    const { isValid, errors } = validateTouristProfileInput(formData);
    setFieldErrors(errors);

    if (!isValid) {
      setFeedback({
        type: "error",
        message: "Vui lòng kiểm tra lại các thông tin bên dưới.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const cleanPayload = {
        name: formData.name.trim(),
        phone_number: formData.phone_number.replace(/\s+/g, ""),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
      };

      const response = await touristProfileService.updateProfile(cleanPayload);
      const updated = response?.data || cleanPayload;
      const normalizedDob = normalizeDateOnly(updated.date_of_birth) || cleanPayload.date_of_birth;

      const syncedProfile = {
        name: updated.name || cleanPayload.name,
        phone_number: updated.phone_number || cleanPayload.phone_number,
        gender: updated.gender || cleanPayload.gender,
        date_of_birth: normalizedDob,
      };

      setFormData(syncedProfile);
      updateUser((prevUser) => ({
        ...(prevUser || {}),
        name: syncedProfile.name,
        display_name: syncedProfile.name,
        tourist_profile: {
          ...(prevUser?.tourist_profile || {}),
          phone_number: syncedProfile.phone_number,
          gender: syncedProfile.gender,
          date_of_birth: syncedProfile.date_of_birth,
        },
      }));

      setFieldErrors({});
      setFeedback({
        type: "success",
        message: response?.message || "Cập nhật hồ sơ cá nhân thành công.",
      });
    } catch (error) {
      if (error?.errors && typeof error.errors === "object") {
        const mappedErrors = {};
        Object.keys(error.errors).forEach((key) => {
          const messages = error.errors[key];
          if (Array.isArray(messages) && messages.length > 0) {
            mappedErrors[key] = messages[0];
          } else if (typeof messages === "string") {
            mappedErrors[key] = messages;
          }
        });
        setFieldErrors(mappedErrors);
      }

      setFeedback({
        type: "error",
        message: error?.message || "Không thể lưu thay đổi hồ sơ. Vui lòng thử lại.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.navHeader}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={styles.navBackBtn}
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={20} color={colors.inkPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText style={styles.navTitle}>Chỉnh sửa thông tin cá nhân</AppText>
          <AppText style={styles.navSub}>Cập nhật hồ sơ du khách của bạn</AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Hero Avatar & Thông tin tài khoản */}
          <View style={styles.heroCard}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImage} />
            ) : (
              <View style={styles.heroAvatarFallback}>
                <AppText style={styles.heroAvatarInitial}>{avatarInitial}</AppText>
              </View>
            )}
            <AppText style={styles.heroName} numberOfLines={1}>
              {displayName}
            </AppText>
            <View style={styles.heroMetaRow}>
              <Mail size={13} color={colors.inkMuted} />
              <AppText style={styles.heroEmail} numberOfLines={1}>
                {displayEmail}
              </AppText>
            </View>
            <View style={styles.roleBadge}>
              <AppText style={styles.roleBadgeText}>{roleLabel}</AppText>
            </View>
          </View>

          {/* 2. Thông báo phản hồi */}
          {feedback ? (
            <View
              style={[
                styles.feedbackBanner,
                feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError,
              ]}
            >
              {feedback.type === "success" ? (
                <CheckCircle size={18} color={colors.statusSuccess} />
              ) : (
                <AlertCircle size={18} color={colors.statusDanger} />
              )}
              <AppText
                variant="bodySmall"
                style={[
                  styles.feedbackText,
                  feedback.type === "success"
                    ? styles.feedbackTextSuccess
                    : styles.feedbackTextError,
                ]}
              >
                {feedback.message}
              </AppText>
            </View>
          ) : null}

          {/* 3. Biểu mẫu cập nhật thông tin cá nhân */}
          <View style={styles.card}>
            <AppText variant="h3" style={styles.sectionTitle}>
              Thông tin cá nhân
            </AppText>

            {/* Họ và tên */}
            <View style={styles.inputGroup}>
              <AppText variant="label" style={styles.label}>
                Họ và tên
              </AppText>
              <TextInput
                style={[styles.input, fieldErrors.name ? styles.inputError : null]}
                value={formData.name}
                onChangeText={(value) => {
                  setFormData((prev) => ({ ...prev, name: value }));
                  clearFieldError("name");
                }}
                placeholder="Nhập họ và tên"
                placeholderTextColor={colors.inkSubtle}
                maxLength={255}
                editable={!isSaving}
              />
              {fieldErrors.name ? (
                <AppText variant="caption" style={styles.errorText}>
                  {fieldErrors.name}
                </AppText>
              ) : null}
            </View>

            {/* Số điện thoại */}
            <View style={styles.inputGroup}>
              <AppText variant="label" style={styles.label}>
                Số điện thoại
              </AppText>
              <TextInput
                style={[styles.input, fieldErrors.phone_number ? styles.inputError : null]}
                value={formData.phone_number}
                onChangeText={(value) => {
                  setFormData((prev) => ({ ...prev, phone_number: value }));
                  clearFieldError("phone_number");
                }}
                placeholder="0901234567"
                placeholderTextColor={colors.inkSubtle}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isSaving}
              />
              {fieldErrors.phone_number ? (
                <AppText variant="caption" style={styles.errorText}>
                  {fieldErrors.phone_number}
                </AppText>
              ) : null}
            </View>

            {/* Giới tính */}
            <View style={styles.inputGroup}>
              <AppText variant="label" style={styles.label}>
                Giới tính
              </AppText>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => {
                  const isSelected = formData.gender === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      disabled={isSaving}
                      onPress={() => {
                        setFormData((prev) => ({ ...prev, gender: option.value }));
                        clearFieldError("gender");
                      }}
                      style={({ pressed }) => [
                        styles.genderPill,
                        isSelected && styles.genderPillActive,
                        pressed && styles.pressedOpacity,
                      ]}
                    >
                      <AppText
                        variant="label"
                        style={[styles.genderPillText, isSelected && styles.genderPillTextActive]}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.gender ? (
                <AppText variant="caption" style={styles.errorText}>
                  {fieldErrors.gender}
                </AppText>
              ) : null}
            </View>

            {/* Ngày sinh */}
            <View style={styles.inputGroup}>
              <AppText variant="label" style={styles.label}>
                Ngày sinh
              </AppText>
              <Pressable
                disabled={isSaving}
                onPress={openDateModal}
                style={({ pressed }) => [
                  styles.dateButton,
                  fieldErrors.date_of_birth ? styles.inputError : null,
                  pressed && styles.pressedOpacity,
                ]}
              >
                <Calendar size={18} color={colors.inkSubtle} />
                <AppText
                  variant="bodySmall"
                  style={[
                    styles.dateButtonText,
                    !formData.date_of_birth && styles.datePlaceholderText,
                  ]}
                >
                  {formData.date_of_birth
                    ? formatDateDisplay(formData.date_of_birth)
                    : "Chọn ngày sinh (DD/MM/YYYY)"}
                </AppText>
              </Pressable>
              {fieldErrors.date_of_birth ? (
                <AppText variant="caption" style={styles.errorText}>
                  {fieldErrors.date_of_birth}
                </AppText>
              ) : null}
            </View>

            {/* Nút Lưu thay đổi */}
            <Pressable
              disabled={isSaving}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressedOpacity,
                isSaving && styles.saveButtonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppText variant="label" style={styles.saveButtonText}>
                  Lưu thay đổi
                </AppText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal chọn Ngày/Tháng/Năm (RN thuần, không cần native dependency) */}
      <Modal
        visible={dateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText variant="h3">Chọn ngày sinh</AppText>
              <Pressable
                hitSlop={10}
                onPress={() => setDateModalVisible(false)}
                style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressedOpacity]}
              >
                <X size={20} color={colors.inkSubtle} />
              </Pressable>
            </View>

            <AppText variant="bodySmall" style={styles.modalPreview}>
              Đang chọn: {padTwoDigits(Math.min(pickerDay, days.length))}/
              {padTwoDigits(pickerMonth)}/{pickerYear}
            </AppText>

            <View style={styles.pickerColumns}>
              {/* Cột Ngày */}
              <View style={styles.pickerCol}>
                <AppText variant="caption" style={styles.pickerColTitle}>
                  Ngày
                </AppText>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((day) => {
                    const active = day === Math.min(pickerDay, days.length);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => {
                          setPickerDay(day);
                          setPickerError("");
                        }}
                        style={[styles.pickerItem, active && styles.pickerItemActive]}
                      >
                        <AppText
                          variant="bodySmall"
                          style={[styles.pickerItemText, active && styles.pickerItemTextActive]}
                        >
                          {padTwoDigits(day)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Cột Tháng */}
              <View style={styles.pickerCol}>
                <AppText variant="caption" style={styles.pickerColTitle}>
                  Tháng
                </AppText>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((month) => {
                    const active = month === pickerMonth;
                    return (
                      <Pressable
                        key={month}
                        onPress={() => handleSelectMonth(month)}
                        style={[styles.pickerItem, active && styles.pickerItemActive]}
                      >
                        <AppText
                          variant="bodySmall"
                          style={[styles.pickerItemText, active && styles.pickerItemTextActive]}
                        >
                          Th {padTwoDigits(month)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Cột Năm */}
              <View style={styles.pickerCol}>
                <AppText variant="caption" style={styles.pickerColTitle}>
                  Năm
                </AppText>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {YEARS.map((year) => {
                    const active = year === pickerYear;
                    return (
                      <Pressable
                        key={year}
                        onPress={() => handleSelectYear(year)}
                        style={[styles.pickerItem, active && styles.pickerItemActive]}
                      >
                        <AppText
                          variant="bodySmall"
                          style={[styles.pickerItemText, active && styles.pickerItemTextActive]}
                        >
                          {year}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {pickerError ? (
              <AppText variant="caption" style={styles.modalErrorText}>
                {pickerError}
              </AppText>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDateModalVisible(false)}
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressedOpacity]}
              >
                <AppText variant="label" style={styles.modalCancelText}>
                  Hủy
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleConfirmDate}
                style={({ pressed }) => [styles.modalConfirmBtn, pressed && styles.pressedOpacity]}
              >
                <AppText variant="label" style={styles.modalConfirmText}>
                  Xác nhận
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  navSub: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 1,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
    gap: spacing.base,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  heroAvatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: "#BAE6FD",
    backgroundColor: "#E0F2FE",
  },
  heroAvatarFallback: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#E0F2FE",
    borderWidth: 2,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkPrimary,
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroEmail: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.base,
    gap: spacing.base,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  headerMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  roleBadge: {
    alignSelf: "center",
    backgroundColor: colors.brandSubtle,
    borderWidth: 1,
    borderColor: colors.brandLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: {
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  readOnlyBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  readOnlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  readOnlyLabel: {
    color: colors.inkSubtle,
  },
  readOnlyValue: {
    flex: 1,
    textAlign: "right",
    color: colors.inkPrimary,
    fontWeight: "600",
  },
  readOnlyDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  feedbackSuccess: {
    backgroundColor: colors.statusSuccessBg,
    borderColor: "#A7F3D0",
  },
  feedbackError: {
    backgroundColor: colors.statusDangerBg,
    borderColor: "#FECDD3",
  },
  feedbackText: {
    flex: 1,
    fontWeight: "600",
  },
  feedbackTextSuccess: {
    color: colors.statusSuccess,
  },
  feedbackTextError: {
    color: colors.statusDanger,
  },
  sectionTitle: {
    color: colors.inkPrimary,
  },
  inputGroup: {
    gap: spacing.xs + 2,
  },
  label: {
    color: colors.inkPrimary,
  },
  input: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    fontSize: 15,
    color: colors.inkPrimary,
    backgroundColor: colors.surfaceElevated,
  },
  inputError: {
    borderColor: colors.statusDanger,
    backgroundColor: colors.statusDangerBg,
  },
  errorText: {
    color: colors.statusDanger,
    marginLeft: 2,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  genderPill: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
  },
  genderPillActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandSubtle,
  },
  genderPillText: {
    color: colors.inkBody,
  },
  genderPillTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  dateButton: {
    minHeight: touchTarget.minHeight,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  dateButtonText: {
    color: colors.inkPrimary,
    fontSize: 15,
  },
  datePlaceholderText: {
    color: colors.inkSubtle,
  },
  saveButton: {
    minHeight: touchTarget.minHeight + 2,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  logoutButton: {
    minHeight: touchTarget.minHeight,
    backgroundColor: colors.statusDangerBg,
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: colors.statusDanger,
    fontSize: 15,
    fontWeight: "700",
  },
  pressedOpacity: {
    opacity: 0.78,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalPreview: {
    color: colors.brandPrimary,
    fontWeight: "600",
  },
  pickerColumns: {
    flexDirection: "row",
    gap: spacing.sm,
    height: 220,
  },
  pickerCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  pickerColTitle: {
    textAlign: "center",
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    color: colors.inkSubtle,
    fontWeight: "600",
  },
  pickerScroll: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  pickerItemActive: {
    backgroundColor: colors.brandSubtle,
  },
  pickerItemText: {
    color: colors.inkBody,
  },
  pickerItemTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  modalErrorText: {
    color: colors.statusDanger,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  modalCancelBtn: {
    minHeight: touchTarget.minHeight - 4,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.inkBody,
  },
  modalConfirmBtn: {
    minHeight: touchTarget.minHeight - 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
