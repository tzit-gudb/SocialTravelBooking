import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus } from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { spacing } from "../../../theme/tokens";
import socialService from "../services/socialService";
import SnappyBottomSheet from "./SnappyBottomSheet";
import SocialAvatar from "./SocialAvatar";

/**
 * BottomSheet chỉnh sửa hồ sơ Mạng xã hội.
 */
export default function EditProfileBottomSheet({ visible, profile, onClose, onSaved }) {
  const [editName, setEditName] = useState(profile?.display_name || "");
  const [editUsername, setEditUsername] = useState(profile?.username || "");
  const [editBio, setEditBio] = useState(profile?.bio || "");
  const [editAvatar, setEditAvatar] = useState(profile?.avatar_url || "");
  const [editWebsite, setEditWebsite] = useState(profile?.website_url || "");
  const [editError, setEditError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setEditName(profile.display_name || "");
      setEditUsername(profile.username || "");
      setEditBio(profile.bio || "");
      setEditAvatar(profile.avatar_url || "");
      setEditWebsite(profile.website_url || "");
      setEditError("");
    }
  }, [visible, profile]);

  const handlePickAvatarInEdit = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền truy cập ảnh",
          "Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh đại diện.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setIsUploadingAvatar(true);
      setEditError("");
      const uploaded = await socialService.uploadAvatar(result.assets[0]);
      if (uploaded?.url) {
        setEditAvatar(uploaded.url);
      }
    } catch (err) {
      setEditError(err?.message || "Không thể tải ảnh lên. Vui lòng thử ảnh nhỏ hơn 2MB.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (editName.trim().length < 2) {
      setEditError("Tên hiển thị cần tối thiểu 2 ký tự.");
      return;
    }
    if (editUsername.trim().length < 3) {
      setEditError("Tên người dùng cần tối thiểu 3 ký tự.");
      return;
    }

    setIsSavingProfile(true);
    setEditError("");
    try {
      const res = await socialService.setupProfile({
        display_name: editName.trim(),
        username: editUsername.trim().toLowerCase().replace(/^@+/, ""),
        bio: editBio.trim(),
        avatar_url: editAvatar.trim(),
        website_url: editWebsite.trim(),
      });
      if (res?.data?.profile) {
        onSaved?.(res.data.profile);
        onClose?.();
      }
    } catch (err) {
      setEditError(err?.message || "Không thể cập nhật hồ sơ lúc này.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <SnappyBottomSheet visible={visible} onClose={onClose} heightPercent={0.93}>
      <View style={styles.modalTop}>
        <Pressable onPress={onClose} hitSlop={10}>
          <AppText style={styles.cancelText}>Hủy</AppText>
        </Pressable>
        <AppText style={styles.modalTitle}>Chỉnh sửa hồ sơ MXH</AppText>
        <Pressable onPress={handleSaveProfile} disabled={isSavingProfile || isUploadingAvatar}>
          {isSavingProfile ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <AppText style={styles.saveText}>Lưu</AppText>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.modalScroll}
        contentContainerStyle={styles.modalBody}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.editAvatarCenter}>
          <Pressable onPress={handlePickAvatarInEdit} style={styles.editAvatarWrap}>
            <SocialAvatar uri={editAvatar} name={editName || "Bạn"} size={76} />
            <View style={styles.editCameraBadge}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Camera size={14} color="#FFFFFF" />
              )}
            </View>
          </Pressable>
          <Pressable onPress={handlePickAvatarInEdit} style={styles.changePhotoBtn}>
            <ImagePlus size={15} color="#0284C7" />
            <AppText style={styles.changePhotoText}>
              {isUploadingAvatar ? "Đang tải ảnh lên..." : "Chọn ảnh đại diện từ máy"}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>Tên hiển thị</AppText>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            style={styles.fieldInput}
            maxLength={100}
          />
        </View>
        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>Tên người dùng (@username)</AppText>
          <TextInput
            value={editUsername}
            onChangeText={(t) =>
              setEditUsername(
                t
                  .toLowerCase()
                  .replace(/^@+/, "")
                  .replace(/[^a-z0-9._]/g, ""),
              )
            }
            autoCapitalize="none"
            style={styles.fieldInput}
            maxLength={50}
          />
        </View>
        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>Tiểu sử</AppText>
          <TextInput
            value={editBio}
            onChangeText={setEditBio}
            multiline
            style={[styles.fieldInput, { minHeight: 84, textAlignVertical: "top" }]}
            maxLength={300}
          />
        </View>
        <View style={styles.field}>
          <AppText style={styles.fieldLabel}>Liên kết cá nhân</AppText>
          <TextInput
            value={editWebsite}
            onChangeText={setEditWebsite}
            autoCapitalize="none"
            placeholder="https://..."
            placeholderTextColor="#94A3B8"
            style={styles.fieldInput}
          />
        </View>
        {editError ? <AppText style={styles.errorText}>{editError}</AppText> : null}
      </ScrollView>
    </SnappyBottomSheet>
  );
}

const styles = StyleSheet.create({
  modalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cancelText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  saveText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284C7",
  },
  modalScroll: {
    flex: 1,
  },
  modalBody: {
    padding: spacing.md,
    gap: 14,
  },
  editAvatarCenter: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  editAvatarWrap: {
    position: "relative",
  },
  editCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0F172A",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284C7",
  },
  field: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: "#0F172A",
  },
  errorText: {
    fontSize: 13,
    color: "#BE123C",
    fontWeight: "600",
  },
});
