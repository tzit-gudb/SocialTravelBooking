import React from "react";
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import {
  BadgeCheck,
  Bookmark,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing } from "../../../theme/tokens";
import { formatRelativeTime } from "../../explore/models/exploreModel";
import SocialAvatar from "./SocialAvatar";

/**
 * Thẻ bài viết theo phong cách Threads / Instagram.
 */
export default function SocialPostCard({
  post,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onToggleFollow,
  onDeletePost,
  onPressTag,
  onPressService,
}) {
  const authorName = post?.author?.display_name || "Du khách";
  const authorHandle = post?.author?.username || "traveler";
  const mediaList = Array.isArray(post?.media) ? post.media : [];
  const tagsList = Array.isArray(post?.tags) ? post.tags : [];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${authorName} (@${authorHandle}) trên Social Travel Booking:\n"${post?.content || ""}"`,
      });
    } catch {
      // Người dùng hủy chia sẻ
    }
  };

  const confirmDelete = () => {
    Alert.alert("Xóa bài viết", "Bạn có chắc muốn xóa bài đăng này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => onDeletePost?.(post.id),
      },
    ]);
  };

  return (
    <View style={styles.card}>
      {/* Cột trái: Avatar + đường nối phong cách Threads */}
      <View style={styles.leftRail}>
        <SocialAvatar uri={post?.author?.avatar_url} name={authorName} size={40} />
        <View style={styles.threadLine} />
      </View>

      {/* Cột phải: Nội dung & Tương tác */}
      <View style={styles.body}>
        {/* Header thông tin tác giả */}
        <View style={styles.headerRow}>
          <View style={styles.authorBlock}>
            <View style={styles.nameLine}>
              <AppText style={styles.displayName} numberOfLines={1}>
                {authorName}
              </AppText>
              {post?.author?.is_verified ? <BadgeCheck size={15} color="#0284C7" /> : null}
              <AppText style={styles.timeText}>· {formatRelativeTime(post?.created_at)}</AppText>
            </View>
            <AppText style={styles.handleText} numberOfLines={1}>
              @{authorHandle}
            </AppText>
          </View>

          {post?.is_owner ? (
            <Pressable
              onPress={confirmDelete}
              hitSlop={10}
              style={styles.deleteBtn}
              accessibilityLabel="Xóa bài viết"
            >
              <Trash2 size={16} color="#94A3B8" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onToggleFollow?.(post?.author?.id)}
              style={[styles.followBtn, post?.is_following_author && styles.followBtnActive]}
            >
              <AppText
                style={[
                  styles.followBtnText,
                  post?.is_following_author && styles.followBtnTextActive,
                ]}
              >
                {post?.is_following_author ? "Đang theo dõi" : "Theo dõi"}
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Nội dung bài viết */}
        {post?.content ? <AppText style={styles.content}>{post.content}</AppText> : null}

        {/* Hashtags */}
        {tagsList.length > 0 ? (
          <View style={styles.tagsRow}>
            {tagsList.map((tag) => (
              <Pressable
                key={String(tag.id || tag.name)}
                onPress={() => onPressTag?.(tag.name)}
                style={styles.tagPill}
              >
                <AppText style={styles.tagText}>#{tag.display_name || tag.name}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Hình ảnh đính kèm */}
        {mediaList.length === 1 ? (
          <Image source={{ uri: mediaList[0].url }} style={styles.singleImage} resizeMode="cover" />
        ) : null}

        {mediaList.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {mediaList.map((media, idx) => (
              <Image
                key={String(media.id || idx)}
                source={{ uri: media.url }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Địa điểm check-in & Dịch vụ Booking liên kết */}
        {post?.location_name || post?.service ? (
          <View style={styles.metaChips}>
            {post?.location_name ? (
              <View style={styles.locationChip}>
                <MapPin size={12.5} color="#475569" />
                <AppText style={styles.locationText} numberOfLines={1}>
                  {post.location_name}
                </AppText>
              </View>
            ) : null}

            {post?.service ? (
              <Pressable onPress={() => onPressService?.(post.service)} style={styles.serviceChip}>
                <Compass size={13} color={colors.brandPrimary} />
                <AppText style={styles.serviceText} numberOfLines={1}>
                  {post.service.name}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Thanh hành động Threads / Instagram */}
        <View style={styles.actionsBar}>
          <Pressable
            onPress={() => onToggleLike?.(post.id)}
            hitSlop={8}
            style={styles.actionItem}
            accessibilityLabel="Thả tim"
          >
            <Heart
              size={19}
              color={post?.is_liked ? "#E11D48" : "#0F172A"}
              fill={post?.is_liked ? "#E11D48" : "transparent"}
            />
            {post?.likes_count > 0 ? (
              <AppText style={[styles.actionCount, post?.is_liked && styles.likedCount]}>
                {post.likes_count}
              </AppText>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => onOpenComments?.(post)}
            hitSlop={8}
            style={styles.actionItem}
            accessibilityLabel="Bình luận"
          >
            <MessageCircle size={19} color="#0F172A" />
            {post?.comments_count > 0 ? (
              <AppText style={styles.actionCount}>{post.comments_count}</AppText>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => onToggleSave?.(post.id)}
            hitSlop={8}
            style={styles.actionItem}
            accessibilityLabel="Lưu bài viết"
          >
            <Bookmark size={18} color="#0F172A" fill={post?.is_saved ? "#0F172A" : "transparent"} />
          </Pressable>

          <Pressable
            onPress={handleShare}
            hitSlop={8}
            style={styles.actionItem}
            accessibilityLabel="Chia sẻ"
          >
            <Send size={17} color="#0F172A" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  leftRail: {
    width: 40,
    alignItems: "center",
  },
  threadLine: {
    width: 1.8,
    flex: 1,
    minHeight: 16,
    backgroundColor: "#E2E8F0",
    marginTop: 8,
    borderRadius: 1,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  authorBlock: {
    flex: 1,
    gap: 1,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  displayName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  timeText: {
    fontSize: 12.5,
    color: "#94A3B8",
  },
  handleText: {
    fontSize: 12.5,
    color: "#64748B",
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "#0F172A",
  },
  followBtnActive: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  followBtnTextActive: {
    color: "#334155",
  },
  deleteBtn: {
    padding: 4,
  },
  content: {
    fontSize: 14.8,
    lineHeight: 21.5,
    color: "#0F172A",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    backgroundColor: "#F0F9FF",
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  singleImage: {
    width: "100%",
    height: 230,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  galleryRow: {
    gap: 8,
  },
  galleryImage: {
    width: 230,
    height: 220,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  metaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    flexShrink: 1,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  serviceText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brandPrimary,
    flexShrink: 1,
  },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 2,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  likedCount: {
    color: "#E11D48",
  },
});
