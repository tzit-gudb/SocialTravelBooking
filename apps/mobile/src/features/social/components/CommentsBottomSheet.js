import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Send, X } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { spacing } from "../../../theme/tokens";
import { formatRelativeTime } from "../../explore/models/exploreModel";
import socialService from "../services/socialService";
import SnappyBottomSheet from "./SnappyBottomSheet";
import SocialAvatar from "./SocialAvatar";

/**
 * BottomSheet hiển thị và gửi bình luận bài viết.
 */
export default function CommentsBottomSheet({ visible, post, myProfile, onClose, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const loadComments = useCallback(async () => {
    if (!post?.id) return;
    setIsLoading(true);
    try {
      const res = await socialService.getComments(post.id);
      setComments(res.items);
    } catch {
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [post?.id]);

  useEffect(() => {
    if (visible && post?.id) {
      loadComments();
    } else {
      setText("");
    }
  }, [visible, post?.id, loadComments]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !post?.id || isSending) return;

    setIsSending(true);
    try {
      const res = await socialService.addComment(post.id, trimmed);
      if (res?.comment) {
        setComments((prev) => [...prev, res.comment]);
        setText("");
        onCommentAdded?.(post.id, res.comments_count);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SnappyBottomSheet visible={visible} onClose={onClose} heightPercent={0.9}>
      <View style={styles.header}>
        <AppText style={styles.title}>Bình luận ({comments.length})</AppText>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <X size={20} color="#475569" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <SocialAvatar
                uri={item.author?.avatar_url}
                name={item.author?.display_name}
                size={34}
              />
              <View style={styles.commentBody}>
                <View style={styles.commentMeta}>
                  <AppText style={styles.commentAuthor}>
                    {item.author?.display_name || "Du khách"}
                  </AppText>
                  <AppText style={styles.commentHandle}>
                    @{item.author?.username || "traveler"}
                  </AppText>
                  <AppText style={styles.commentTime}>
                    · {formatRelativeTime(item.created_at)}
                  </AppText>
                </View>
                <AppText style={styles.commentText}>{item.content}</AppText>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <AppText style={styles.emptyText}>
                Chưa có bình luận nào. Hãy mở lời đầu tiên nhé!
              </AppText>
            </View>
          }
        />
      )}

      <View style={styles.composerBar}>
        <SocialAvatar
          uri={myProfile?.avatar_url}
          name={myProfile?.display_name || "Bạn"}
          size={34}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Viết bình luận..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          maxLength={1000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || isSending}
          style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={16} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </SnappyBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: spacing.md,
    gap: 14,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  commentAuthor: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  commentHandle: {
    fontSize: 12,
    color: "#64748B",
  },
  commentTime: {
    fontSize: 12,
    color: "#94A3B8",
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1E293B",
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13.5,
    color: "#64748B",
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0F172A",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
});
