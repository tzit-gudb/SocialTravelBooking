import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AtSign, Camera, CheckCircle2, ImagePlus, Trash2, User } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { spacing } from "../../../theme/tokens";
import socialService from "../services/socialService";
import SocialAvatar from "./SocialAvatar";

/**
 * Màn hình khởi tạo tài khoản Mạng xã hội lần đầu (social_profiles).
 * Kích hoạt ngay lập tức khi điền đủ thông tin, không cần Admin phê duyệt.
 */
export default function SocialOnboardingView({ suggestions, onSubmit, isSubmitting }) {
  const [displayName, setDisplayName] = useState(suggestions?.display_name || "");
  const [username, setUsername] = useState(suggestions?.username || "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [localAvatarPreview, setLocalAvatarPreview] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Chỉ điền gợi ý đúng 1 lần duy nhất khi nhận dữ liệu, không ghi đè khi người dùng xóa nhập lại
  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (hasSeededRef.current || !suggestions) return;
    hasSeededRef.current = true;
    if (suggestions.display_name) {
      setDisplayName(suggestions.display_name);
    }
    if (suggestions.username) {
      setUsername(suggestions.username);
    }
  }, [suggestions]);

  const handleUsernameChange = (val) => {
    const normalized = val
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9._]/g, "");
    setUsername(normalized);
    if (errorText) setErrorText("");
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập ảnh",
          "Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setLocalAvatarPreview(asset.uri);
      setIsUploadingAvatar(true);
      setErrorText("");

      const uploaded = await socialService.uploadAvatar(asset);
      if (uploaded?.url) {
        setAvatarUrl(uploaded.url);
      } else {
        setLocalAvatarPreview("");
        setErrorText("Không thể tải ảnh đại diện lên máy chủ.");
      }
    } catch (err) {
      setLocalAvatarPreview("");
      setErrorText(err?.message || "Không thể tải ảnh lên. Vui lòng thử ảnh khác nhỏ hơn 2MB.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleClearAvatar = () => {
    setAvatarUrl("");
    setLocalAvatarPreview("");
  };

  const handleSave = async () => {
    const cleanName = displayName.trim();
    const cleanHandle = username.trim();

    if (cleanName.length < 2) {
      setErrorText("Tên hiển thị cần tối thiểu 2 ký tự.");
      return;
    }
    if (cleanHandle.length < 3) {
      setErrorText("Tên người dùng (@username) cần tối thiểu 3 ký tự.");
      return;
    }
    if (isUploadingAvatar) {
      setErrorText("Ảnh đại diện đang được tải lên, vui lòng chờ giây lát.");
      return;
    }

    setErrorText("");
    const result = await onSubmit({
      display_name: cleanName,
      username: cleanHandle,
      bio: bio.trim(),
      avatar_url: avatarUrl.trim(),
    });

    if (result?.error) {
      setErrorText(result.error);
    }
  };

  const previewAvatar = localAvatarPreview || avatarUrl;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBox}>
          <AppText style={styles.title}>Khởi tạo hồ sơ mạng xã hội</AppText>
          <AppText style={styles.subtitle}>
            Tạo danh tính riêng để đăng bài chia sẻ hành trình, kết nối du khách và lưu lại những
            điểm đến yêu thích. Kích hoạt ngay lập tức!
          </AppText>

          <View style={styles.previewCard}>
            <Pressable onPress={handlePickAvatar} style={styles.avatarTapWrap}>
              <SocialAvatar uri={previewAvatar} name={displayName || "Bạn"} size={60} />
              <View style={styles.avatarCameraBadge}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={12} color="#FFFFFF" />
                )}
              </View>
            </Pressable>

            <View style={styles.previewMeta}>
              <AppText style={styles.previewName} numberOfLines={1}>
                {displayName.trim() || "Tên hiển thị của bạn"}
              </AppText>
              <AppText style={styles.previewHandle} numberOfLines={1}>
                @{username.trim() || "username"}
              </AppText>
              {bio.trim() ? (
                <AppText style={styles.previewBio} numberOfLines={2}>
                  {bio.trim()}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>
              Tên hiển thị <AppText style={styles.required}>*</AppText>
            </AppText>
            <View style={styles.inputRow}>
              <User size={17} color="#64748B" />
              <TextInput
                value={displayName}
                onChangeText={(t) => {
                  setDisplayName(t);
                  if (errorText) setErrorText("");
                }}
                placeholder="VD: Minh Anh Du Lịch"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>
              Tên người dùng (@username) <AppText style={styles.required}>*</AppText>
            </AppText>
            <View style={styles.inputRow}>
              <AtSign size={17} color="#64748B" />
              <TextInput
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="minhanh_travel"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                maxLength={50}
              />
            </View>
            <AppText style={styles.hint}>
              Chỉ gồm chữ thường không dấu, số, dấu chấm (.) hoặc gạch dưới (_).
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>Tiểu sử ngắn</AppText>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="VD: Đam mê săn mây Đà Lạt & ẩm thực đường phố..."
              placeholderTextColor="#94A3B8"
              style={[styles.inputBox, styles.bioInput]}
              multiline
              maxLength={300}
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>Ảnh đại diện (tùy chọn)</AppText>
            <View style={styles.avatarPickerRow}>
              <Pressable
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                style={({ pressed }) => [
                  styles.pickPhotoBtn,
                  pressed && styles.pickPhotoBtnPressed,
                ]}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <ImagePlus size={18} color="#0284C7" />
                )}
                <AppText style={styles.pickPhotoText}>
                  {isUploadingAvatar
                    ? "Đang tải ảnh lên..."
                    : previewAvatar
                      ? "Đổi ảnh từ thư viện máy"
                      : "Chọn ảnh từ thư viện máy"}
                </AppText>
              </Pressable>

              {previewAvatar ? (
                <Pressable onPress={handleClearAvatar} style={styles.clearPhotoBtn}>
                  <Trash2 size={17} color="#E11D48" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {errorText ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorText}>{errorText}</AppText>
            </View>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={isSubmitting || isUploadingAvatar}
            style={({ pressed }) => [
              styles.submitBtn,
              (isSubmitting || isUploadingAvatar) && styles.submitBtnDisabled,
              pressed && !isSubmitting && !isUploadingAvatar && styles.submitBtnPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <AppText style={styles.submitBtnText}>Khởi tạo & Tham gia cộng đồng</AppText>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 48,
    gap: 20,
  },
  heroBox: {
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarTapWrap: {
    position: "relative",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0F172A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewMeta: {
    flex: 1,
    gap: 2,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  previewHandle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  previewBio: {
    fontSize: 12.5,
    color: "#334155",
    marginTop: 2,
  },
  formCard: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  required: {
    color: "#E11D48",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 10,
  },
  inputBox: {
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  bioInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    color: "#64748B",
  },
  avatarPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 14,
  },
  pickPhotoBtnPressed: {
    backgroundColor: "#E0F2FE",
  },
  pickPhotoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
  clearPhotoBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: "#BE123C",
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    borderRadius: 999,
    minHeight: 52,
    paddingHorizontal: 20,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnPressed: {
    opacity: 0.88,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
