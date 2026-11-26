import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { BadgeCheck, Hash, Search, X } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { radius, spacing } from "../../../theme/tokens";
import socialService from "../services/socialService";
import SocialAvatar from "./SocialAvatar";
import SocialPostCard from "./SocialPostCard";

/**
 * Tab Tìm kiếm (Footer #2): Tìm kiếm du khách, địa điểm & bài viết cộng đồng.
 */
export default function SocialSearchTab({
  initialQuery = "",
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onDeletePost,
  onPressService,
  onFollowChanged,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState({ profiles: [], posts: [], trending_tags: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runSearch = useCallback(async (qValue, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = await socialService.search(qValue);
      setResult(data);
    } catch {
      // Giữ nguyên state hiện tại nếu lỗi mạng
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query);
    }, 260);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handleFollowToggle = async (targetUserId) => {
    try {
      const res = await socialService.toggleFollow(targetUserId);
      if (!res) return;
      setResult((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.user_id === targetUserId
            ? { ...p, is_following: res.is_following, followers_count: res.followers_count }
            : p,
        ),
        posts: prev.posts.map((post) =>
          post.author?.id === targetUserId
            ? { ...post, is_following_author: res.is_following }
            : post,
        ),
      }));
      onFollowChanged?.(res);
    } catch {
      // Bỏ qua
    }
  };

  const handleLikeInSearch = async (postId) => {
    const res = await onToggleLike?.(postId);
    if (!res) return;
    setResult((prev) => ({
      ...prev,
      posts: prev.posts.map((p) =>
        p.id === postId ? { ...p, is_liked: res.is_liked, likes_count: res.likes_count } : p,
      ),
    }));
  };

  const handleSaveInSearch = async (postId) => {
    const res = await onToggleSave?.(postId);
    if (!res) return;
    setResult((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === postId ? { ...p, is_saved: res.is_saved } : p)),
    }));
  };

  return (
    <View style={styles.container}>
      {/* Thanh tìm kiếm */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm du khách, địa điểm, #hashtag..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <X size={17} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator color="#0F172A" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => runSearch(query, true)} />
          }
        >
          {/* Xu hướng hashtag */}
          {result.trending_tags.length > 0 ? (
            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Chủ đề nổi bật</AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScroll}
              >
                {result.trending_tags.map((tag) => (
                  <Pressable
                    key={String(tag.id)}
                    onPress={() => setQuery(tag.name)}
                    style={styles.trendChip}
                  >
                    <Hash size={13} color="#0284C7" />
                    <AppText style={styles.trendChipText}>{tag.display_name || tag.name}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Gợi ý / Kết quả Du khách */}
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>
              {query.trim() ? "Tài khoản phù hợp" : "Gợi ý theo dõi"}
            </AppText>

            {result.profiles.length === 0 ? (
              <AppText style={styles.emptySmall}>Không tìm thấy tài khoản nào phù hợp.</AppText>
            ) : (
              result.profiles.map((p) => (
                <View key={String(p.user_id)} style={styles.profileRow}>
                  <SocialAvatar uri={p.avatar_url} name={p.display_name} size={44} />
                  <View style={styles.profileInfo}>
                    <View style={styles.nameRow}>
                      <AppText style={styles.profileName} numberOfLines={1}>
                        {p.display_name}
                      </AppText>
                      {p.is_verified ? <BadgeCheck size={14} color="#0284C7" /> : null}
                    </View>
                    <AppText style={styles.profileHandle} numberOfLines={1}>
                      @{p.username} · {p.followers_count} người theo dõi
                    </AppText>
                    {p.bio ? (
                      <AppText style={styles.profileBio} numberOfLines={1}>
                        {p.bio}
                      </AppText>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => handleFollowToggle(p.user_id)}
                    style={[styles.followBtn, p.is_following && styles.followBtnActive]}
                  >
                    <AppText
                      style={[styles.followBtnText, p.is_following && styles.followBtnTextActive]}
                    >
                      {p.is_following ? "Đang theo dõi" : "Theo dõi"}
                    </AppText>
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Kết quả bài viết */}
          <View style={styles.postsSection}>
            <AppText style={[styles.sectionTitle, styles.postsHeading]}>
              {query.trim() ? "Bài viết liên quan" : "Khám phá bài đăng"}
            </AppText>

            {result.posts.length === 0 ? (
              <View style={styles.emptyBox}>
                <AppText style={styles.emptySmall}>Chưa có bài viết nào khớp với tìm kiếm.</AppText>
              </View>
            ) : (
              result.posts.map((post) => (
                <SocialPostCard
                  key={String(post.id)}
                  post={post}
                  onToggleLike={handleLikeInSearch}
                  onToggleSave={handleSaveInSearch}
                  onOpenComments={onOpenComments}
                  onToggleFollow={handleFollowToggle}
                  onDeletePost={onDeletePost}
                  onPressTag={(tag) => setQuery(tag)}
                  onPressService={onPressService}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: "#0F172A",
    paddingVertical: 8,
  },
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  tagsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trendChipText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0284C7",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  profileName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileHandle: {
    fontSize: 12.5,
    color: "#64748B",
  },
  profileBio: {
    fontSize: 12.5,
    color: "#475569",
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "#0F172A",
  },
  followBtnActive: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  followBtnTextActive: {
    color: "#334155",
  },
  postsSection: {
    paddingTop: 16,
  },
  postsHeading: {
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  emptyBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
  },
  emptySmall: {
    fontSize: 13.5,
    color: "#64748B",
  },
});
