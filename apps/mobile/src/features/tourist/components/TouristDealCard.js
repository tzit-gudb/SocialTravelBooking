import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius, touchTarget } from "../../../theme/tokens";

/**
 * Component thẻ Tour Ưu đãi Hot (kết hợp màu cam hoàng hôn Sunset Coral và xanh trời Sky Blue)
 */
export default function TouristDealCard({
  title = "Du thuyền Hoàng hôn Vịnh Ngắm Cầu Rồng Phun Lửa",
  desc = "Bao gồm tiệc nhẹ canape trên boong tàu, đồ uống nhiệt đới và âm nhạc acoustic sống động.",
  originalPrice = "850.000 đ",
  dealPrice = "650.000 đ",
  rating = "⭐ 4.9 (128)",
  dealBadge = "🔥 DEAL MÙA HÈ · GIẢM 25%",
  onBook,
}) {
  return (
    <View style={styles.dealCard}>
      <View style={styles.dealBadgeRow}>
        <View style={styles.dealTag}>
          <AppText variant="caption" style={styles.dealTagText}>
            {dealBadge}
          </AppText>
        </View>
        <View style={styles.ratingBadge}>
          <AppText variant="caption" style={styles.ratingText}>
            {rating}
          </AppText>
        </View>
      </View>

      <AppText variant="h3" style={styles.dealTitle}>
        {title}
      </AppText>
      <AppText variant="bodySmall" style={styles.dealDesc}>
        {desc}
      </AppText>

      <View style={styles.dealFooter}>
        <View>
          <AppText variant="caption" style={styles.dealOriginalPrice}>
            {originalPrice}
          </AppText>
          <AppText variant="h2" style={styles.dealPrice}>
            {dealPrice} <AppText variant="caption">/khách</AppText>
          </AppText>
        </View>

        <Pressable
          onPress={onBook}
          style={({ pressed }) => [styles.bookDealBtn, pressed && styles.bookDealBtnPressed]}
        >
          <AppText variant="label" style={styles.bookDealBtnText}>
            Đặt giữ chỗ
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dealCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dealBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dealTag: {
    backgroundColor: colors.secondaryWarmLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  dealTagText: {
    color: colors.secondaryWarmDark,
    fontWeight: "700",
  },
  ratingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  ratingText: {
    color: "#B45309",
    fontWeight: "600",
  },
  dealTitle: {
    color: colors.inkPrimary,
  },
  dealDesc: {
    color: colors.inkBody,
    lineHeight: 20,
  },
  dealFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  dealOriginalPrice: {
    color: colors.inkSubtle,
    textDecorationLine: "line-through",
  },
  dealPrice: {
    color: colors.secondaryWarm,
    fontWeight: "700",
  },
  bookDealBtn: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  bookDealBtnPressed: {
    backgroundColor: colors.brandHover,
  },
  bookDealBtnText: {
    color: colors.inkInverse,
    fontWeight: "700",
  },
});
