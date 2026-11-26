import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Star, ThumbsDown, ThumbsUp, X } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing } from "../../../theme/tokens";

const RATING_LABELS = {
  1: "Rất tệ",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời!",
};

const CRITERIA_ITEMS = [
  { key: "cleanliness_rating", label: "Vệ sinh & Chất lượng cơ sở" },
  { key: "service_rating", label: "Thái độ phục vụ & Hỗ trợ" },
  { key: "location_rating", label: "Vị trí / Lịch trình & Tiện ích" },
  { key: "value_rating", label: "Đáng giá tiền" },
];

export default function ReviewModal({
  visible,
  serviceName,
  initialReview = null,
  loading,
  onClose,
  onSubmit,
}) {
  const [criteria, setCriteria] = useState({
    cleanliness_rating: 5,
    service_rating: 5,
    location_rating: 5,
    value_rating: 5,
  });
  const [rating, setRating] = useState(5);
  const [isRecommended, setIsRecommended] = useState(true);
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [content, setContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (visible) {
      setCriteria({
        cleanliness_rating: Number(initialReview?.cleanliness_rating || initialReview?.rating || 5),
        service_rating: Number(initialReview?.service_rating || initialReview?.rating || 5),
        location_rating: Number(initialReview?.location_rating || initialReview?.rating || 5),
        value_rating: Number(initialReview?.value_rating || initialReview?.rating || 5),
      });
      setRating(Number(initialReview?.rating || 5));
      setIsRecommended(
        initialReview?.is_recommended !== undefined ? Boolean(initialReview.is_recommended) : true,
      );
      setPros(initialReview?.pros || "");
      setCons(initialReview?.cons || "");
      setContent(initialReview?.content || "");
      setErrorMsg("");
    }
  }, [visible, initialReview]);

  const handleCriteriaSelect = (key, value) => {
    const next = { ...criteria, [key]: value };
    setCriteria(next);
    const avg = Math.round(
      (next.cleanliness_rating + next.service_rating + next.location_rating + next.value_rating) /
        4,
    );
    setRating(Math.min(5, Math.max(1, avg)));
  };

  const handleConfirm = () => {
    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg("Vui lòng chọn từ 1 đến 5 sao.");
      return;
    }
    setErrorMsg("");
    onSubmit?.({
      rating,
      ...criteria,
      is_recommended: isRecommended,
      pros: pros.trim(),
      cons: cons.trim(),
      content: content.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.title}>
                {initialReview ? "Chỉnh sửa đánh giá" : "Đánh giá chi tiết trải nghiệm"}
              </AppText>
              <AppText style={styles.subtitle} numberOfLines={1}>
                {serviceName || "Dịch vụ du lịch"}
              </AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} disabled={loading}>
              <X size={18} color={colors.inkMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Điểm tổng quan */}
            <View style={styles.starsWrap}>
              <AppText style={styles.overallHint}>Đánh giá tổng quan</AppText>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <Pressable
                      key={star}
                      onPress={() => setRating(star)}
                      disabled={loading}
                      style={styles.starBtn}
                    >
                      <Star
                        size={32}
                        color={active ? "#F59E0B" : "#CBD5E1"}
                        fill={active ? "#F59E0B" : "transparent"}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <AppText style={styles.ratingLabel}>
                {rating}/5 · {RATING_LABELS[rating]}
              </AppText>
            </View>

            {/* 4 Tiêu chí chi tiết */}
            <View style={styles.criteriaCard}>
              <AppText style={styles.sectionMiniTitle}>Đánh giá theo từng khía cạnh</AppText>
              {CRITERIA_ITEMS.map((item) => {
                const val = criteria[item.key];
                return (
                  <View key={item.key} style={styles.criteriaRow}>
                    <AppText style={styles.criteriaLabel}>{item.label}</AppText>
                    <View style={styles.miniStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => handleCriteriaSelect(item.key, s)}
                          disabled={loading}
                          hitSlop={4}
                        >
                          <Star
                            size={18}
                            color={s <= val ? "#F59E0B" : "#CBD5E1"}
                            fill={s <= val ? "#F59E0B" : "transparent"}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Sẵn sàng giới thiệu */}
            <View style={styles.recommendRow}>
              <AppText style={styles.inputLabel}>Bạn có giới thiệu dịch vụ này?</AppText>
              <View style={styles.recommendActions}>
                <Pressable
                  onPress={() => setIsRecommended(true)}
                  style={[styles.recChip, isRecommended && styles.recChipYesActive]}
                >
                  <ThumbsUp size={14} color={isRecommended ? "#047857" : colors.inkMuted} />
                  <AppText style={[styles.recText, isRecommended && { color: "#047857" }]}>
                    Có
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setIsRecommended(false)}
                  style={[styles.recChip, !isRecommended && styles.recChipNoActive]}
                >
                  <ThumbsDown size={14} color={!isRecommended ? "#BE123C" : colors.inkMuted} />
                  <AppText style={[styles.recText, !isRecommended && { color: "#BE123C" }]}>
                    Chưa
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Điểm thích nhất & Cần cải thiện */}
            <View style={styles.inputGroup}>
              <AppText style={styles.inputLabel}>Điểm hài lòng nhất (Tùy chọn)</AppText>
              <TextInput
                value={pros}
                onChangeText={setPros}
                maxLength={1000}
                editable={!loading}
                placeholder="VD: Phòng sạch sẽ, hướng dẫn viên nhiệt tình..."
                placeholderTextColor="#94A3B8"
                style={styles.singleInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText style={styles.inputLabel}>Điểm cần cải thiện (Tùy chọn)</AppText>
              <TextInput
                value={cons}
                onChangeText={setCons}
                maxLength={1000}
                editable={!loading}
                placeholder="VD: Bãi đỗ xe hơi nhỏ..."
                placeholderTextColor="#94A3B8"
                style={styles.singleInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText style={styles.inputLabel}>Nhận xét tổng quan (Tùy chọn)</AppText>
              <TextInput
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={3}
                maxLength={2000}
                editable={!loading}
                placeholder="Chia sẻ trải nghiệm thực tế của bạn..."
                placeholderTextColor="#94A3B8"
                style={styles.textArea}
                textAlignVertical="top"
              />
            </View>

            {errorMsg ? <AppText style={styles.errorText}>{errorMsg}</AppText> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <AppText style={styles.cancelText}>Để sau</AppText>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppText style={styles.submitText}>
                  {initialReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    maxHeight: "90%",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.inkSubtle,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: 12,
    paddingBottom: 6,
  },
  starsWrap: {
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  overallHint: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#92400E",
    textTransform: "uppercase",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starBtn: {
    padding: 3,
  },
  ratingLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#B45309",
  },
  criteriaCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 10,
  },
  sectionMiniTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  criteriaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  criteriaLabel: {
    flex: 1,
    fontSize: 12.5,
    color: colors.inkBody,
  },
  miniStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recommendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recommendActions: {
    flexDirection: "row",
    gap: 8,
  },
  recChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  recChipYesActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  recChipNoActive: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  recText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkBody,
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
  singleInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.inkPrimary,
    backgroundColor: "#F8FAFC",
  },
  textArea: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.inkPrimary,
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    fontSize: 12.5,
    color: "#BE123C",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.inkBody,
  },
  submitBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
