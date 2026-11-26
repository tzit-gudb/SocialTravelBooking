import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { spacing } from "../../../theme/tokens";
import { formatRelativeTime } from "../../explore/models/exploreModel";
import socialService from "../services/socialService";
import SocialAvatar from "./SocialAvatar";

function getBadgeMeta(type) {
  if (type === "like_post") {
    return { bg: "#E11D48", Icon: Heart };
  }
  if (type === "comment_post" || type === "reply_comment") {
    return { bg: "#0284C7", Icon: MessageCircle };
  }
  if (type === "follow_user") {
    return { bg: "#0F172A", Icon: UserPlus };
  }
  return { bg: "#64748B", Icon: Bell };
}

/**
 * Tab Hoạt động (Footer #4): Danh sách thông báo tương tác cộng đồng.
 */
export default function SocialActivityTab({ onUnreadCountChange }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadActivity = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        const res = await socialService.getActivity();
        setItems(res.items);
        if (res.unreadCount > 0) {
          await socialService.markActivityRead();
          onUnreadCountChange?.(0);
        }
      } catch {
        // Giữ state cũ
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [onUnreadCountChange],
  );

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  if (isLoading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.title}>Hoạt động</AppText>
        <AppText style={styles.subtitle}>Lượt thích, bình luận & người theo dõi mới</AppText>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadActivity(true)} />
        }
        renderItem={({ item }) => {
          const { bg, Icon } = getBadgeMeta(item.type);
          return (
            <View style={[styles.row, !item.is_read && styles.rowUnread]}>
              <View style={styles.avatarWrap}>
                <SocialAvatar
                  uri={item.actor?.avatar_url}
                  name={item.actor?.display_name}
                  size={44}
                />
                <View style={[styles.typeBadge, { backgroundColor: bg }]}>
                  <Icon size={11} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.body}>
                <AppText style={styles.mainText}>
                  <AppText style={styles.actorName}>
                    {item.actor?.display_name || "Du khách"}
                  </AppText>{" "}
                  {item.action_text}
                </AppText>
                {item.preview ? (
                  <AppText style={styles.previewText} numberOfLines={2}>
                    “{item.preview}”
                  </AppText>
                ) : null}
                <AppText style={styles.timeText}>
                  @{item.actor?.username || "traveler"} · {formatRelativeTime(item.created_at)}
                </AppText>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Heart size={26} color="#94A3B8" />
            </View>
            <AppText style={styles.emptyTitle}>Chưa có hoạt động nào</AppText>
            <AppText style={styles.emptyDesc}>
              Khi có người thích, bình luận bài viết hoặc theo dõi bạn, thông báo sẽ hiện tại đây.
            </AppText>
          </View>
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
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  rowUnread: {
    backgroundColor: "#F8FAFC",
  },
  avatarWrap: {
    position: "relative",
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  body: {
    flex: 1,
    gap: 3,
  },
  mainText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1E293B",
  },
  actorName: {
    fontWeight: "700",
    color: "#0F172A",
  },
  previewText: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: 56,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
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
