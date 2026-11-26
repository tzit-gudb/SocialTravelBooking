import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Hash, ImagePlus, MapPin, Plus, X } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { colors, radius, spacing } from "../../../theme/tokens";
import SnappyBottomSheet from "./SnappyBottomSheet";
import SocialAvatar from "./SocialAvatar";

/**
 * BottomSheet soạn bài đăng mới phong cách Threads.
 */
export default function CreatePostBottomSheet({ visible, profile, onClose, onSubmit }) {
  const [content, setContent] = useState("");
  const [locationName, setLocationName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [showLocation, setShowLocation] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const resetForm = () => {
    setContent("");
    setLocationName("");
    setTagsText("");
    setMediaUrlInput("");
    setMediaUrls([]);
    setShowLocation(false);
    setShowTags(false);
    setShowMedia(false);
    setErrorText("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose?.();
  };

  const handleAddMediaUrl = () => {
    const trimmed = mediaUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setErrorText("Link hình ảnh cần bắt đầu bằng http:// hoặc https://");
      return;
    }
    if (mediaUrls.length >= 6) {
      setErrorText("Bạn chỉ có thể đính kèm tối đa 6 ảnh.");
      return;
    }
    setMediaUrls((prev) => [...prev, trimmed]);
    setMediaUrlInput("");
    setErrorText("");
  };

  const handleRemoveMedia = (idx) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePublish = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setErrorText("Hãy chia sẻ điều gì đó trước khi đăng nhé!");
      return;
    }

    const parsedTags = tagsText
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter(Boolean);

    const finalMedia = [...mediaUrls];
    if (mediaUrlInput.trim() && /^https?:\/\/.+/i.test(mediaUrlInput.trim())) {
      finalMedia.push(mediaUrlInput.trim());
    }

    setIsSubmitting(true);
    setErrorText("");
    try {
      const res = await onSubmit({
        content: trimmed,
        location_name: locationName.trim() || undefined,
        tags: parsedTags,
        media_urls: finalMedia,
      });
      if (res?.error) {
        setErrorText(res.error);
      } else {
        resetForm();
        onClose?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPublish = content.trim().length > 0 && !isSubmitting;

  return (
    <SnappyBottomSheet visible={visible} onClose={handleClose} heightPercent={0.93}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleClose} hitSlop={10} style={styles.cancelBtn}>
          <AppText style={styles.cancelText}>Hủy</AppText>
        </Pressable>
        <AppText style={styles.sheetTitle}>Bài đăng mới</AppText>
        <Pressable
          onPress={handlePublish}
          disabled={!canPublish}
          style={[styles.postBtn, !canPublish && styles.postBtnDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppText style={styles.postBtnText}>Đăng</AppText>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Threads-style Composer Row */}
        <View style={styles.composerRow}>
          <View style={styles.leftCol}>
            <SocialAvatar
              uri={profile?.avatar_url}
              name={profile?.display_name || "Bạn"}
              size={40}
            />
            <View style={styles.threadLine} />
          </View>

          <View style={styles.rightCol}>
            <View style={styles.authorHeader}>
              <AppText style={styles.authorName}>{profile?.display_name || "Du khách"}</AppText>
              {profile?.username ? (
                <AppText style={styles.authorHandle}>@{profile.username}</AppText>
              ) : null}
            </View>

            <TextInput
              value={content}
              onChangeText={(t) => {
                setContent(t);
                if (errorText) setErrorText("");
              }}
              placeholder="Có gì mới? Chia sẻ trải nghiệm du lịch của bạn..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
              style={styles.contentInput}
            />

            {/* Toolbar Icons */}
            <View style={styles.toolsRow}>
              <Pressable
                onPress={() => setShowLocation((v) => !v)}
                style={[styles.toolChip, showLocation && styles.toolChipActive]}
              >
                <MapPin size={15} color={showLocation ? colors.brandPrimary : "#64748B"} />
                <AppText style={[styles.toolText, showLocation && styles.toolTextActive]}>
                  Địa điểm
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setShowMedia((v) => !v)}
                style={[styles.toolChip, showMedia && styles.toolChipActive]}
              >
                <ImagePlus size={15} color={showMedia ? colors.brandPrimary : "#64748B"} />
                <AppText style={[styles.toolText, showMedia && styles.toolTextActive]}>
                  Ảnh ({mediaUrls.length})
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setShowTags((v) => !v)}
                style={[styles.toolChip, showTags && styles.toolChipActive]}
              >
                <Hash size={15} color={showTags ? colors.brandPrimary : "#64748B"} />
                <AppText style={[styles.toolText, showTags && styles.toolTextActive]}>
                  Hashtag
                </AppText>
              </Pressable>
            </View>

            {showLocation ? (
              <View style={styles.extraField}>
                <MapPin size={15} color="#0284C7" />
                <TextInput
                  value={locationName}
                  onChangeText={setLocationName}
                  placeholder="VD: Đà Lạt, Lâm Đồng"
                  placeholderTextColor="#94A3B8"
                  style={styles.extraInput}
                  maxLength={255}
                />
              </View>
            ) : null}

            {showTags ? (
              <View style={styles.extraField}>
                <Hash size={15} color="#0284C7" />
                <TextInput
                  value={tagsText}
                  onChangeText={setTagsText}
                  placeholder="VD: dalat, sanmay, review (cách nhau dấu phẩy)"
                  placeholderTextColor="#94A3B8"
                  style={styles.extraInput}
                />
              </View>
            ) : null}

            {showMedia ? (
              <View style={styles.mediaAddBox}>
                <View style={styles.extraField}>
                  <TextInput
                    value={mediaUrlInput}
                    onChangeText={setMediaUrlInput}
                    placeholder="Dán đường dẫn ảnh (https://...)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.extraInput}
                  />
                  <Pressable onPress={handleAddMediaUrl} style={styles.addUrlBtn}>
                    <Plus size={16} color="#FFFFFF" />
                  </Pressable>
                </View>

                {mediaUrls.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.mediaPreviewList}
                  >
                    {mediaUrls.map((url, idx) => (
                      <View key={`${url}-${idx}`} style={styles.mediaThumbWrap}>
                        <Image source={{ uri: url }} style={styles.mediaThumb} />
                        <Pressable
                          onPress={() => handleRemoveMedia(idx)}
                          style={styles.removeMediaBtn}
                        >
                          <X size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            ) : null}

            {errorText ? <AppText style={styles.errorText}>{errorText}</AppText> : null}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerNote}>
        <AppText style={styles.footerNoteText}>
          Bài viết sẽ hiển thị công khai với cộng đồng Social Travel Booking
        </AppText>
        <AppText style={styles.charCount}>{content.length}/2000</AppText>
      </View>
    </SnappyBottomSheet>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "600",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  postBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 68,
    alignItems: "center",
  },
  postBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
  },
  composerRow: {
    flexDirection: "row",
    gap: 12,
  },
  leftCol: {
    alignItems: "center",
    width: 40,
  },
  threadLine: {
    width: 2,
    flex: 1,
    minHeight: 48,
    backgroundColor: "#E2E8F0",
    marginTop: 8,
    borderRadius: 1,
  },
  rightCol: {
    flex: 1,
    gap: 10,
  },
  authorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  authorHandle: {
    fontSize: 13,
    color: "#64748B",
  },
  contentInput: {
    fontSize: 15.5,
    lineHeight: 22,
    color: "#0F172A",
    minHeight: 96,
    textAlignVertical: "top",
    padding: 0,
  },
  toolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toolChipActive: {
    backgroundColor: "#F0F9FF",
    borderColor: "#7DD3FC",
  },
  toolText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  toolTextActive: {
    color: colors.brandPrimary,
  },
  extraField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  extraInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    paddingVertical: 8,
  },
  mediaAddBox: {
    gap: 10,
  },
  addUrlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaPreviewList: {
    gap: 8,
  },
  mediaThumbWrap: {
    position: "relative",
  },
  mediaThumb: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(15,23,42,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#BE123C",
    fontWeight: "600",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerNoteText: {
    fontSize: 11.5,
    color: "#94A3B8",
    flex: 1,
  },
  charCount: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
