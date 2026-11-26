import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Check,
  Compass,
  Globe,
  Hash,
  ImagePlus,
  Lock,
  MapPin,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { resolveMediaUrl } from "../../../lib/apiClient";
import { colors, radius, spacing } from "../../../theme/tokens";
import socialService from "../services/socialService";
import SnappyBottomSheet from "./SnappyBottomSheet";
import SocialAvatar from "./SocialAvatar";

const MAX_PHOTOS = 6;

const VISIBILITY_OPTIONS = [
  { key: "public", label: "Mọi người có thể xem", Icon: Globe },
  { key: "followers", label: "Chỉ người theo dõi", Icon: Users },
  { key: "private", label: "Chỉ mình tôi", Icon: Lock },
];

/**
 * BottomSheet soạn bài đăng trải nghiệm du lịch (Task #34):
 * - Nội dung + tự động nhận diện #hashtag
 * - Upload tối đa 6 ảnh từ thư viện máy hoặc chụp ảnh Camera (multipart /media/upload?type=post)
 * - Tag địa điểm thông minh (gợi ý từ danh mục Điểm đến + nhập check-in tùy chỉnh)
 * - Gắn dịch vụ du lịch đã trải nghiệm (Tour/Khách sạn/Homestay/Xe)
 * - Tùy chọn quyền riêng tư bài viết
 */
export default function CreatePostBottomSheet({ visible, profile, onClose, onSubmit }) {
  const [content, setContent] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState([]); // [{ uri, fileName, mimeType }]
  const [locationName, setLocationName] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [services, setServices] = useState([]);
  const [isSearchingServices, setIsSearchingServices] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [visibility, setVisibility] = useState("public");

  // Panel mở rộng trong trình soạn thảo ("location" | "service" | "tags" | null)
  const [activePanel, setActivePanel] = useState(null);

  const [submitPhase, setSubmitPhase] = useState(""); // "" | "uploading" | "posting"
  const [errorText, setErrorText] = useState("");

  // Tải danh sách điểm đến gợi ý khi mở panel địa điểm
  useEffect(() => {
    if (!visible || activePanel !== "location" || locations.length > 0) return;
    let active = true;
    socialService
      .getLocations()
      .then((list) => {
        if (active) setLocations(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visible, activePanel, locations.length]);

  // Tìm kiếm dịch vụ để gắn thẻ trải nghiệm
  useEffect(() => {
    if (!visible || activePanel !== "service") return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingServices(true);
      try {
        const list = await socialService.searchServices(serviceQuery);
        if (active) setServices(list);
      } catch {
        if (active) setServices([]);
      } finally {
        if (active) setIsSearchingServices(false);
      }
    }, 240);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [visible, activePanel, serviceQuery]);

  const filteredLocations = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return locations.slice(0, 12);
    return locations
      .filter((loc) =>
        String(loc?.name || "")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 12);
  }, [locations, locationQuery]);

  const resetForm = () => {
    setContent("");
    setSelectedPhotos([]);
    setLocationName("");
    setLocationQuery("");
    setSelectedService(null);
    setServiceQuery("");
    setTagsText("");
    setVisibility("public");
    setActivePanel(null);
    setSubmitPhase("");
    setErrorText("");
  };

  const handleClose = () => {
    if (submitPhase) return;
    resetForm();
    onClose?.();
  };

  const handlePickFromLibrary = async () => {
    const remaining = MAX_PHOTOS - selectedPhotos.length;
    if (remaining <= 0) {
      setErrorText(`Bạn chỉ có thể đính kèm tối đa ${MAX_PHOTOS} hình ảnh.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền thư viện ảnh",
          "Vui lòng cấp quyền truy cập thư viện ảnh để đính kèm ảnh vào bài đăng.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const added = result.assets.slice(0, remaining).map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        width: asset.width,
      }));
      setSelectedPhotos((prev) => [...prev, ...added].slice(0, MAX_PHOTOS));
      setErrorText("");
    } catch {
      setErrorText("Không thể mở thư viện ảnh lúc này.");
    }
  };

  const handleTakePhoto = async () => {
    if (selectedPhotos.length >= MAX_PHOTOS) {
      setErrorText(`Bạn chỉ có thể đính kèm tối đa ${MAX_PHOTOS} hình ảnh.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Cần quyền Camera",
          "Vui lòng cấp quyền sử dụng máy ảnh để chụp ảnh trực tiếp.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setSelectedPhotos((prev) =>
        [
          ...prev,
          {
            uri: asset.uri,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            width: asset.width,
          },
        ].slice(0, MAX_PHOTOS),
      );
      setErrorText("");
    } catch {
      setErrorText("Không thể mở máy ảnh trên thiết bị này.");
    }
  };

  const handleRemovePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCycleVisibility = () => {
    const idx = VISIBILITY_OPTIONS.findIndex((item) => item.key === visibility);
    const next = VISIBILITY_OPTIONS[(idx + 1) % VISIBILITY_OPTIONS.length];
    setVisibility(next.key);
  };

  const handleSelectLocation = (name) => {
    const clean = String(name || "").trim();
    if (!clean) return;
    setLocationName(clean);
    setLocationQuery("");
    setActivePanel(null);
  };

  const handlePublish = async () => {
    const trimmed = content.trim();
    if (!trimmed && selectedPhotos.length === 0) {
      setErrorText("Hãy nhập nội dung chia sẻ hoặc chọn ít nhất 1 hình ảnh nhé!");
      return;
    }

    const parsedTags = tagsText
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#+/, "").trim())
      .filter(Boolean);

    setErrorText("");
    try {
      let uploadedUrls = [];
      if (selectedPhotos.length > 0) {
        setSubmitPhase("uploading");
        uploadedUrls = await socialService.uploadPostImages(selectedPhotos);
        if (uploadedUrls.length === 0) {
          setErrorText("Không thể tải hình ảnh lên máy chủ. Vui lòng thử lại.");
          setSubmitPhase("");
          return;
        }
      }

      setSubmitPhase("posting");
      const res = await onSubmit({
        content: trimmed,
        location_name: locationName.trim() || undefined,
        service_id: selectedService?.id || undefined,
        visibility,
        tags: parsedTags,
        media_urls: uploadedUrls,
      });

      if (res?.error) {
        setErrorText(res.error);
      } else {
        resetForm();
        onClose?.();
      }
    } catch (err) {
      setErrorText(
        err?.message || "Tải ảnh hoặc đăng bài thất bại. Kiểm tra ảnh nhỏ hơn 5MB rồi thử lại.",
      );
    } finally {
      setSubmitPhase("");
    }
  };

  const isBusy = Boolean(submitPhase);
  const canPublish = (content.trim().length > 0 || selectedPhotos.length > 0) && !isBusy;
  const activeVisibility =
    VISIBILITY_OPTIONS.find((item) => item.key === visibility) || VISIBILITY_OPTIONS[0];
  const VisibilityIcon = activeVisibility.Icon;

  return (
    <SnappyBottomSheet visible={visible} onClose={handleClose} heightPercent={0.93}>
      {/* Thanh hành động trên cùng */}
      <View style={styles.topBar}>
        <Pressable onPress={handleClose} hitSlop={10} style={styles.cancelBtn} disabled={isBusy}>
          <AppText style={styles.cancelText}>Hủy</AppText>
        </Pressable>
        <AppText style={styles.sheetTitle}>Bài đăng mới</AppText>
        <Pressable
          onPress={handlePublish}
          disabled={!canPublish}
          style={[styles.postBtn, !canPublish && styles.postBtnDisabled]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppText style={styles.postBtnText}>Đăng</AppText>
          )}
        </Pressable>
      </View>

      {isBusy ? (
        <View style={styles.progressBanner}>
          <ActivityIndicator size="small" color="#0284C7" />
          <AppText style={styles.progressText}>
            {submitPhase === "uploading"
              ? `Đang tải ${selectedPhotos.length} ảnh lên máy chủ...`
              : "Đang xuất bản bài viết..."}
          </AppText>
        </View>
      ) : null}

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
              placeholder="Có gì mới? Chia sẻ hành trình, ảnh đẹp và cảm nhận của bạn..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
              style={styles.contentInput}
            />

            {/* Các chip đã gắn (Địa điểm / Dịch vụ) */}
            {locationName || selectedService ? (
              <View style={styles.selectedChipsRow}>
                {locationName ? (
                  <View style={styles.attachedLocationChip}>
                    <MapPin size={13} color="#0F172A" />
                    <AppText style={styles.attachedLocationText} numberOfLines={1}>
                      {locationName}
                    </AppText>
                    <Pressable onPress={() => setLocationName("")} hitSlop={8}>
                      <X size={13} color="#64748B" />
                    </Pressable>
                  </View>
                ) : null}

                {selectedService ? (
                  <View style={styles.attachedServiceChip}>
                    <Compass size={13} color={colors.brandPrimary} />
                    <AppText style={styles.attachedServiceText} numberOfLines={1}>
                      {selectedService.name}
                    </AppText>
                    <Pressable onPress={() => setSelectedService(null)} hitSlop={8}>
                      <X size={13} color={colors.brandPrimary} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Xem trước danh sách ảnh đã chọn từ máy */}
            {selectedPhotos.length > 0 ? (
              <View style={styles.photoStripWrap}>
                <View style={styles.photoStripHeader}>
                  <AppText style={styles.photoCountLabel}>
                    Ảnh đính kèm ({selectedPhotos.length}/{MAX_PHOTOS})
                  </AppText>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaPreviewList}
                >
                  {selectedPhotos.map((photo, idx) => (
                    <View key={`${photo.uri}-${idx}`} style={styles.mediaThumbWrap}>
                      <Image source={{ uri: photo.uri }} style={styles.mediaThumb} />
                      <Pressable
                        onPress={() => handleRemovePhoto(idx)}
                        style={styles.removeMediaBtn}
                        disabled={isBusy}
                      >
                        <X size={13} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}

                  {selectedPhotos.length < MAX_PHOTOS ? (
                    <Pressable
                      onPress={handlePickFromLibrary}
                      style={styles.addMoreTile}
                      disabled={isBusy}
                    >
                      <Plus size={22} color="#64748B" />
                      <AppText style={styles.addMoreText}>Thêm ảnh</AppText>
                    </Pressable>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}

            {/* Thanh công cụ đính kèm nhanh */}
            <View style={styles.toolsRow}>
              <Pressable
                onPress={handlePickFromLibrary}
                disabled={isBusy}
                style={[styles.toolChip, selectedPhotos.length > 0 && styles.toolChipActive]}
              >
                <ImagePlus
                  size={15}
                  color={selectedPhotos.length > 0 ? colors.brandPrimary : "#475569"}
                />
                <AppText
                  style={[styles.toolText, selectedPhotos.length > 0 && styles.toolTextActive]}
                >
                  Thư viện
                </AppText>
              </Pressable>

              <Pressable onPress={handleTakePhoto} disabled={isBusy} style={styles.toolChip}>
                <Camera size={15} color="#475569" />
                <AppText style={styles.toolText}>Chụp ảnh</AppText>
              </Pressable>

              <Pressable
                onPress={() => setActivePanel((prev) => (prev === "location" ? null : "location"))}
                disabled={isBusy}
                style={[
                  styles.toolChip,
                  (activePanel === "location" || Boolean(locationName)) && styles.toolChipActive,
                ]}
              >
                <MapPin
                  size={15}
                  color={
                    activePanel === "location" || locationName ? colors.brandPrimary : "#475569"
                  }
                />
                <AppText
                  style={[
                    styles.toolText,
                    (activePanel === "location" || Boolean(locationName)) && styles.toolTextActive,
                  ]}
                >
                  Địa điểm
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setActivePanel((prev) => (prev === "service" ? null : "service"))}
                disabled={isBusy}
                style={[
                  styles.toolChip,
                  (activePanel === "service" || Boolean(selectedService)) && styles.toolChipActive,
                ]}
              >
                <Compass
                  size={15}
                  color={
                    activePanel === "service" || selectedService ? colors.brandPrimary : "#475569"
                  }
                />
                <AppText
                  style={[
                    styles.toolText,
                    (activePanel === "service" || Boolean(selectedService)) &&
                      styles.toolTextActive,
                  ]}
                >
                  Dịch vụ
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setActivePanel((prev) => (prev === "tags" ? null : "tags"))}
                disabled={isBusy}
                style={[
                  styles.toolChip,
                  (activePanel === "tags" || Boolean(tagsText.trim())) && styles.toolChipActive,
                ]}
              >
                <Hash
                  size={15}
                  color={
                    activePanel === "tags" || tagsText.trim() ? colors.brandPrimary : "#475569"
                  }
                />
                <AppText
                  style={[
                    styles.toolText,
                    (activePanel === "tags" || Boolean(tagsText.trim())) && styles.toolTextActive,
                  ]}
                >
                  Hashtag
                </AppText>
              </Pressable>
            </View>

            {/* Panel 1: Trình chọn địa điểm thông minh */}
            {activePanel === "location" ? (
              <View style={styles.panelBox}>
                <View style={styles.panelSearchRow}>
                  <Search size={15} color="#64748B" />
                  <TextInput
                    value={locationQuery}
                    onChangeText={setLocationQuery}
                    placeholder="Tìm hoặc nhập địa điểm check-in..."
                    placeholderTextColor="#94A3B8"
                    style={styles.extraInput}
                    returnKeyType="done"
                    onSubmitEditing={() => handleSelectLocation(locationQuery)}
                  />
                  {locationQuery.trim() ? (
                    <Pressable
                      onPress={() => handleSelectLocation(locationQuery)}
                      style={styles.applyBtn}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <AppText style={styles.applyBtnText}>Chọn</AppText>
                    </Pressable>
                  ) : null}
                </View>

                {filteredLocations.length > 0 ? (
                  <View style={styles.suggestionGrid}>
                    {filteredLocations.map((loc) => {
                      const isPicked = locationName === loc.name;
                      return (
                        <Pressable
                          key={String(loc.id)}
                          onPress={() => handleSelectLocation(loc.name)}
                          style={[styles.locPill, isPicked && styles.locPillActive]}
                        >
                          <MapPin size={12} color={isPicked ? "#0284C7" : "#64748B"} />
                          <AppText
                            style={[styles.locPillText, isPicked && styles.locPillTextActive]}
                          >
                            {loc.name}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Panel 2: Gắn dịch vụ du lịch đã trải nghiệm */}
            {activePanel === "service" ? (
              <View style={styles.panelBox}>
                <View style={styles.panelSearchRow}>
                  <Search size={15} color="#64748B" />
                  <TextInput
                    value={serviceQuery}
                    onChangeText={setServiceQuery}
                    placeholder="Tìm Tour, Khách sạn, Homestay..."
                    placeholderTextColor="#94A3B8"
                    style={styles.extraInput}
                  />
                </View>

                {isSearchingServices ? (
                  <ActivityIndicator size="small" color="#0F172A" style={{ paddingVertical: 10 }} />
                ) : services.length === 0 ? (
                  <AppText style={styles.emptyPanelText}>Không tìm thấy dịch vụ phù hợp.</AppText>
                ) : (
                  <View style={styles.serviceList}>
                    {services.map((svc) => {
                      const thumb = svc.cover_image || svc.thumbnail_url || svc.images?.[0]?.url;
                      const isPicked = selectedService?.id === svc.id;
                      return (
                        <Pressable
                          key={String(svc.id)}
                          onPress={() => {
                            setSelectedService(svc);
                            if (!locationName && svc.location?.name) {
                              setLocationName(svc.location.name);
                            }
                            setActivePanel(null);
                          }}
                          style={[styles.serviceRow, isPicked && styles.serviceRowActive]}
                        >
                          {thumb ? (
                            <Image
                              source={{ uri: resolveMediaUrl(thumb) }}
                              style={styles.serviceThumb}
                            />
                          ) : (
                            <View style={styles.serviceThumbFallback}>
                              <Compass size={16} color="#64748B" />
                            </View>
                          )}
                          <View style={styles.serviceMeta}>
                            <AppText style={styles.serviceName} numberOfLines={1}>
                              {svc.name}
                            </AppText>
                            <AppText style={styles.serviceSub} numberOfLines={1}>
                              {svc.location?.name || svc.type || "Dịch vụ du lịch"}
                            </AppText>
                          </View>
                          {isPicked ? <Check size={16} color="#0284C7" /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {/* Panel 3: Hashtag */}
            {activePanel === "tags" ? (
              <View style={styles.panelBox}>
                <View style={styles.panelSearchRow}>
                  <Hash size={15} color="#0284C7" />
                  <TextInput
                    value={tagsText}
                    onChangeText={setTagsText}
                    placeholder="VD: dalat, sanmay, review (cách nhau dấu phẩy)"
                    placeholderTextColor="#94A3B8"
                    style={styles.extraInput}
                  />
                </View>
              </View>
            ) : null}

            {errorText ? <AppText style={styles.errorText}>{errorText}</AppText> : null}
          </View>
        </View>
      </ScrollView>

      {/* Thanh đáy: Chọn quyền riêng tư + đếm ký tự */}
      <View style={styles.footerNote}>
        <Pressable
          onPress={handleCycleVisibility}
          disabled={isBusy}
          style={styles.visibilityBtn}
          hitSlop={6}
        >
          <VisibilityIcon size={14} color="#475569" />
          <AppText style={styles.visibilityText}>{activeVisibility.label}</AppText>
        </Pressable>
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
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: "#F0F9FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BAE6FD",
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0369A1",
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
    paddingBottom: 28,
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
    minHeight: 92,
    textAlignVertical: "top",
    padding: 0,
  },
  selectedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attachedLocationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  attachedLocationText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
    flexShrink: 1,
  },
  attachedServiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  attachedServiceText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.brandPrimary,
    flexShrink: 1,
  },
  photoStripWrap: {
    gap: 6,
  },
  photoStripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoCountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  mediaPreviewList: {
    gap: 8,
    paddingVertical: 2,
  },
  mediaThumbWrap: {
    position: "relative",
  },
  mediaThumb: {
    width: 108,
    height: 108,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreTile: {
    width: 108,
    height: 108,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  toolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
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
  panelBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  panelSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  extraInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    paddingVertical: 7,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0F172A",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  locPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locPillActive: {
    backgroundColor: "#F0F9FF",
    borderColor: "#7DD3FC",
  },
  locPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
  },
  locPillTextActive: {
    color: "#0284C7",
  },
  emptyPanelText: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 8,
  },
  serviceList: {
    gap: 6,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 8,
  },
  serviceRowActive: {
    borderColor: "#7DD3FC",
    backgroundColor: "#F0F9FF",
  },
  serviceThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  serviceThumbFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceMeta: {
    flex: 1,
    gap: 2,
  },
  serviceName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  serviceSub: {
    fontSize: 12,
    color: "#64748B",
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
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  visibilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  charCount: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
