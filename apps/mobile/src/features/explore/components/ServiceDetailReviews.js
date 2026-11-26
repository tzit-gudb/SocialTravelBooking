import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { MessageSquareQuote, Star } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing } from "../../../theme/tokens";
import { formatRelativeTime, getRatingVerdict } from "../models/exploreModel";

function getInitials(name = "Du khách") {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

/**
 * Khối Đánh giá & Nhận xét từ khách hàng trên màn hình Chi tiết Dịch vụ.
 */
export default function ServiceDetailReviews({ ratingAvg = 0, reviewsCount = 0, reviews = [] }) {
  const score = Number(ratingAvg || 0);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.headerRow}>
        <AppText style={styles.sectionTitle}>Đánh giá từ khách hàng</AppText>
        <View style={styles.summaryPill}>
          <Star size={13} color="#FFFFFF" fill="#FFFFFF" />
          <AppText style={styles.summaryScore}>{score > 0 ? score.toFixed(1) : "Mới"}</AppText>
          <AppText style={styles.summaryVerdict}>{getRatingVerdict(score)}</AppText>
        </View>
      </View>

      <AppText style={styles.countNote}>
        {reviewsCount > 0
          ? `Dựa trên ${reviewsCount} đánh giá đã xác thực sau chuyến đi`
          : "Chưa có đánh giá nào — Hãy là người đầu tiên trải nghiệm dịch vụ này!"}
      </AppText>

      {reviews.length > 0 ? (
        <View style={styles.reviewsList}>
          {reviews.map((rev) => {
            const authorName = rev.user?.name || "Du khách";
            return (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={styles.reviewTop}>
                  {rev.user?.avatar_url ? (
                    <Image source={{ uri: rev.user.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <AppText style={styles.avatarText}>{getInitials(authorName)}</AppText>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <AppText style={styles.authorName}>{authorName}</AppText>
                    <AppText style={styles.reviewTime}>
                      {formatRelativeTime(rev.created_at)}
                    </AppText>
                  </View>

                  <View style={styles.starChip}>
                    <Star size={11} color="#F59E0B" fill="#F59E0B" />
                    <AppText style={styles.starChipText}>{rev.rating}/5</AppText>
                  </View>
                </View>

                {rev.cleanliness_rating ||
                rev.service_rating ||
                rev.location_rating ||
                rev.value_rating ? (
                  <View style={styles.subRatingsRow}>
                    {rev.cleanliness_rating ? (
                      <AppText style={styles.subRatingChip}>
                        Vệ sinh {rev.cleanliness_rating}/5
                      </AppText>
                    ) : null}
                    {rev.service_rating ? (
                      <AppText style={styles.subRatingChip}>Phục vụ {rev.service_rating}/5</AppText>
                    ) : null}
                    {rev.location_rating ? (
                      <AppText style={styles.subRatingChip}>Vị trí {rev.location_rating}/5</AppText>
                    ) : null}
                    {rev.value_rating ? (
                      <AppText style={styles.subRatingChip}>Giá trị {rev.value_rating}/5</AppText>
                    ) : null}
                  </View>
                ) : null}

                {rev.pros ? (
                  <AppText style={styles.reviewContent}>Ưu điểm: {rev.pros}</AppText>
                ) : null}
                {rev.cons ? (
                  <AppText style={styles.reviewContent}>Cần cải thiện: {rev.cons}</AppText>
                ) : null}
                {rev.content ? <AppText style={styles.reviewContent}>{rev.content}</AppText> : null}

                {rev.provider_reply ? (
                  <View style={styles.replyBox}>
                    <View style={styles.replyHeader}>
                      <MessageSquareQuote size={13} color={colors.brandPrimary} />
                      <AppText style={styles.replyLabel}>Phản hồi từ đối tác</AppText>
                    </View>
                    <AppText style={styles.replyContent}>{rev.provider_reply}</AppText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: colors.inkPrimary,
    flex: 1,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  summaryScore: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryVerdict: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E0F2FE",
  },
  countNote: {
    fontSize: 12.5,
    color: colors.inkSubtle,
  },
  reviewsList: {
    gap: 12,
    marginTop: 4,
  },
  reviewItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.inkPrimary,
  },
  reviewTime: {
    fontSize: 11.5,
    color: colors.inkSubtle,
  },
  starChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  starChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#B45309",
  },
  reviewContent: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkBody,
  },
  subRatingsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  subRatingChip: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkBody,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  replyBox: {
    backgroundColor: "#F0F9FF",
    borderLeftWidth: 3,
    borderLeftColor: colors.brandPrimary,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  replyContent: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkBody,
  },
});
