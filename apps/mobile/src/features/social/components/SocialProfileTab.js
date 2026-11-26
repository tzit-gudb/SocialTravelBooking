import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { BadgeCheck, Bookmark, Edit3, Grid3X3, Link2, PenSquare } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { spacing } from "../../../theme/tokens";
import socialService from "../services/socialService";
import SocialAvatar from "./SocialAvatar";
import SocialPostCard from "./SocialPostCard";

/**
 * Tab Cá nhân (Footer #5): Hồ sơ mạng xã hội của người dùng, bài viết đã đăng & đã lưu.
 */
export default function SocialProfileTab({
  profile,
  onOpenEditProfile,
  onOpenCompose,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onDeletePost,
  onPressService,
  refreshTrigger,
}) {
  const [subTab, setSubTab] = useState("mine"); // "mine" | "saved"
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPosts = useCallback(
    async (tabName = subTab, isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const res = await socialService.getPosts({ tab: tabName, perPage: 30 });
        setPosts(res.items);
      } catch {
        setPosts([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [subTab],
  );

  useEffect(() => {
    loadPosts(subTab);
  }, [subTab, refreshTrigger, loadPosts]);

  const handleLikeLocal = async (postId) => {
    const res = await onToggleLike?.(postId);
    if (!res) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_liked: res.is_liked, likes_count: res.likes_count } : p,
      ),
    );
  };

  const handleSaveLocal = async (postId) => {
    const res = await onToggleSave?.(postId);
    if (!res) return;
    setPosts((prev) => {
      if (subTab === "saved" && !res.is_saved) {
        return prev.filter((p) => p.id !== postId);
      }
      return prev.map((p) => (p.id === postId ? { ...p, is_saved: res.is_saved } : p));
    });
  };

  const handleDeleteLocal = async (postId) => {
    await onDeletePost?.(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      {/* Tên + Avatar (bố cục Threads) */}
      <View style={styles.topRow}>
        <View style={styles.identityCol}>
          <View style={styles.nameLine}>
            <AppText style={styles.displayName}>{profile?.display_name || "Du khách"}</AppText>
            {profile?.is_verified ? <BadgeCheck size={18} color="#0284C7" /> : null}
          </View>
          <AppText style={styles.username}>@{profile?.username || "traveler"}</AppText>
        </View>
        <SocialAvatar uri={profile?.avatar_url} name={profile?.display_name} size={66} />
      </View>

      {profile?.bio ? <AppText style={styles.bio}>{profile.bio}</AppText> : null}

      {profile?.website_url ? (
        <View style={styles.websiteRow}>
          <Link2 size={14} color="#0284C7" />
          <AppText style={styles.websiteText} numberOfLines={1}>
            {profile.website_url}
          </AppText>
        </View>
      ) : null}

      {/* Chỉ số thống kê */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppText style={styles.statValue}>{profile?.posts_count ?? 0}</AppText>
          <AppText style={styles.statLabel}>Bài viết</AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AppText style={styles.statValue}>{profile?.followers_count ?? 0}</AppText>
          <AppText style={styles.statLabel}>Người theo dõi</AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AppText style={styles.statValue}>{profile?.following_count ?? 0}</AppText>
          <AppText style={styles.statLabel}>Đang theo dõi</AppText>
        </View>
      </View>

      {/* Nút hành động */}
      <View style={styles.actionButtons}>
        <Pressable onPress={() => onOpenEditProfile?.()} style={styles.outlineBtn}>
          <Edit3 size={15} color="#0F172A" />
          <AppText style={styles.outlineBtnText}>Chỉnh sửa hồ sơ</AppText>
        </Pressable>
        <Pressable onPress={onOpenCompose} style={styles.solidBtn}>
          <PenSquare size={15} color="#FFFFFF" />
          <AppText style={styles.solidBtnText}>Đăng bài mới</AppText>
        </Pressable>
      </View>

      {/* Sub-tabs: Bài viết của tôi | Đã lưu */}
      <View style={styles.subTabs}>
        <Pressable
          onPress={() => setSubTab("mine")}
          style={[styles.subTabBtn, subTab === "mine" && styles.subTabBtnActive]}
        >
          <Grid3X3 size={16} color={subTab === "mine" ? "#0F172A" : "#94A3B8"} />
          <AppText style={[styles.subTabText, subTab === "mine" && styles.subTabTextActive]}>
            Bài viết
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setSubTab("saved")}
          style={[styles.subTabBtn, subTab === "saved" && styles.subTabBtnActive]}
        >
          <Bookmark size={16} color={subTab === "saved" ? "#0F172A" : "#94A3B8"} />
          <AppText style={[styles.subTabText, subTab === "saved" && styles.subTabTextActive]}>
            Đã lưu
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadPosts(subTab, true)} />
        }
        renderItem={({ item }) => (
          <SocialPostCard
            post={item}
            onToggleLike={handleLikeLocal}
            onToggleSave={handleSaveLocal}
            onOpenComments={onOpenComments}
            onDeletePost={handleDeleteLocal}
            onPressService={onPressService}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator color="#0F172A" />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <AppText style={styles.emptyTitle}>
                {subTab === "mine" ? "Bạn chưa có bài viết nào" : "Chưa có bài viết đã lưu"}
              </AppText>
              <AppText style={styles.emptyDesc}>
                {subTab === "mine"
                  ? "Hãy chia sẻ chuyến đi đầu tiên của bạn với cộng đồng!"
                  : "Nhấn biểu tượng dấu trang trên các bài viết hay để xem lại tại đây."}
              </AppText>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    paddingTop: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  identityCol: {
    flex: 1,
    gap: 3,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  bio: {
    paddingHorizontal: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: "#1E293B",
  },
  websiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  websiteText: {
    fontSize: 13,
    color: "#0284C7",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 10,
  },
  outlineBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  solidBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingVertical: 10,
  },
  solidBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginTop: 4,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  subTabBtnActive: {
    borderBottomColor: "#0F172A",
  },
  subTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  subTabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: 44,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyDesc: {
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
