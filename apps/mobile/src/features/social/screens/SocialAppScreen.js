import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Compass,
  Heart,
  Home,
  LogIn,
  PlusSquare,
  Search,
  User,
} from "lucide-react-native";
import AppText from "../../../components/common/AppText";
import { useAuth } from "../../../hooks/useAuth";
import { colors, radius, spacing } from "../../../theme/tokens";
import socialService from "../services/socialService";
import SocialAvatar from "../components/SocialAvatar";
import SocialOnboardingView from "../components/SocialOnboardingView";
import SocialPostCard from "../components/SocialPostCard";
import CreatePostBottomSheet from "../components/CreatePostBottomSheet";
import CommentsBottomSheet from "../components/CommentsBottomSheet";
import EditProfileBottomSheet from "../components/EditProfileBottomSheet";
import SocialSearchTab from "../components/SocialSearchTab";
import SocialActivityTab from "../components/SocialActivityTab";
import SocialProfileTab from "../components/SocialProfileTab";

/**
 * Màn hình Mạng xã hội / Cộng đồng Du lịch độc lập (Threads / Instagram Vibe).
 * - Hoàn toàn tách biệt với màn hình Đặt chỗ (Booking): có Header riêng & Footer 5 tab riêng.
 * - Header: Nút Back bên trái để thoát khỏi MXH + Logo "Social Travel Booking" chính giữa.
 * - Nếu người dùng chưa khởi tạo tài khoản MXH (social_profiles) thì hiển thị màn hình khởi tạo nhanh.
 * - Footer 5 tab: Trang chủ, Tìm kiếm, Tạo bài đăng (+), Hoạt động, Cá nhân.
 */
export default function SocialAppScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, updateUser } = useAuth();

  // Trạng thái hồ sơ MXH
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [socialProfile, setSocialProfile] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);

  // Điều hướng 4 màn hình chính + 1 nút Tạo bài đăng trên Footer
  const [activeTab, setActiveTab] = useState("home"); // "home" | "search" | "activity" | "profile"
  const [searchSeed, setSearchSeed] = useState("");
  const [unreadActivity, setUnreadActivity] = useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  // Bảng tin Trang chủ
  const [feedMode, setFeedMode] = useState("for_you"); // "for_you" | "following"
  const [posts, setPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  // BottomSheets
  const [composeVisible, setComposeVisible] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [editProfileVisible, setEditProfileVisible] = useState(false);

  const loadFeed = useCallback(
    async (mode = feedMode, isRefresh = false) => {
      if (isRefresh) setIsRefreshingFeed(true);
      else setIsLoadingFeed(true);
      try {
        const res = await socialService.getPosts({ tab: mode, perPage: 20 });
        setPosts(res.items);
      } catch {
        // Giữ dữ liệu hiện có nếu gặp lỗi mạng
      } finally {
        setIsLoadingFeed(false);
        setIsRefreshingFeed(false);
      }
    },
    [feedMode],
  );

  const loadUnreadActivityCount = useCallback(async () => {
    try {
      const res = await socialService.getActivity({ page: 1, perPage: 1 });
      setUnreadActivity(res.unreadCount);
    } catch {
      // Bỏ qua
    }
  }, []);

  const bootstrapSocial = useCallback(async () => {
    if (!isAuthenticated) {
      setSocialProfile(null);
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const me = await socialService.getMyProfile();
      setSuggestions(me.suggestions || null);
      if (me.is_initialized && me.profile) {
        setSocialProfile(me.profile);
        loadFeed("for_you");
        loadUnreadActivityCount();
      } else {
        setSocialProfile(null);
      }
    } catch {
      setSocialProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [isAuthenticated, loadFeed, loadUnreadActivityCount]);

  useEffect(() => {
    bootstrapSocial();
  }, [bootstrapSocial]);

  const handleOnboardingSubmit = async (payload) => {
    setIsSubmittingOnboarding(true);
    try {
      const res = await socialService.setupProfile(payload);
      const createdProfile = res?.data?.profile || null;
      if (createdProfile) {
        setSocialProfile(createdProfile);
        updateUser({ social_active: true });
        loadFeed("for_you");
        loadUnreadActivityCount();
        return { success: true };
      }
      return { error: "Không thể khởi tạo hồ sơ mạng xã hội." };
    } catch (err) {
      const firstFieldErr = err?.errors ? Object.values(err.errors).flat().find(Boolean) : null;
      return { error: firstFieldErr || err?.message || "Vui lòng kiểm tra lại thông tin." };
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const handleCreatePost = async (payload) => {
    try {
      const res = await socialService.createPost(payload);
      if (res?.data) {
        setPosts((prev) => [res.data, ...prev]);
        setSocialProfile((prev) =>
          prev ? { ...prev, posts_count: (prev.posts_count || 0) + 1 } : prev,
        );
        setProfileRefreshKey((k) => k + 1);
        setActiveTab("home");
        return { success: true };
      }
      return { error: "Không thể đăng bài viết lúc này." };
    } catch (err) {
      return { error: err?.message || "Đăng bài thất bại, vui lòng thử lại." };
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const res = await socialService.toggleLike(postId);
      if (!res) return null;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_liked: res.is_liked, likes_count: res.likes_count } : p,
        ),
      );
      return res;
    } catch {
      return null;
    }
  };

  const handleToggleSave = async (postId) => {
    try {
      const res = await socialService.toggleSave(postId);
      if (!res) return null;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: res.is_saved } : p)));
      setProfileRefreshKey((k) => k + 1);
      return res;
    } catch {
      return null;
    }
  };

  const handleToggleFollow = async (targetUserId) => {
    if (!targetUserId) return;
    try {
      const res = await socialService.toggleFollow(targetUserId);
      if (!res) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.author?.id === targetUserId ? { ...p, is_following_author: res.is_following } : p,
        ),
      );
      setSocialProfile((prev) =>
        prev ? { ...prev, following_count: res.viewer_following_count } : prev,
      );
    } catch {
      // Bỏ qua
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await socialService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSocialProfile((prev) =>
        prev ? { ...prev, posts_count: Math.max(0, (prev.posts_count || 1) - 1) } : prev,
      );
      setProfileRefreshKey((k) => k + 1);
    } catch (err) {
      Alert.alert("Lỗi", err?.message || "Không thể xóa bài viết.");
    }
  };

  const handleCommentAdded = (postId, nextCount) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments_count: nextCount } : p)),
    );
  };

  const handlePressTag = (tagName) => {
    setSearchSeed(tagName);
    setActiveTab("search");
  };

  const handlePressService = (service) => {
    if (!service?.id) return;
    navigation.navigate("Detail", { serviceId: service.id, tour: service });
  };

  const handleBackToBooking = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("TouristMainTabs");
    }
  };

  const renderHomeFeedHeader = () => (
    <View>
      {/* Thanh khởi tạo bài viết nhanh: Ảnh đại diện + Tên + "Có gì mới?" */}
      <Pressable
        onPress={() => setComposeVisible(true)}
        style={({ pressed }) => [styles.whatsNewBar, pressed && styles.whatsNewBarPressed]}
        accessibilityRole="button"
        accessibilityLabel="Tạo bài đăng mới"
      >
        <SocialAvatar
          uri={socialProfile?.avatar_url}
          name={socialProfile?.display_name || "Bạn"}
          size={42}
        />
        <View style={styles.whatsNewTextCol}>
          <AppText style={styles.whatsNewName} numberOfLines={1}>
            {socialProfile?.display_name || "Du khách"}
          </AppText>
          <AppText style={styles.whatsNewPrompt}>Có gì mới?</AppText>
        </View>
        <View style={styles.whatsNewPill}>
          <AppText style={styles.whatsNewPillText}>Đăng</AppText>
        </View>
      </Pressable>

      {/* Chuyển đổi bảng tin: Dành cho bạn / Đang theo dõi */}
      <View style={styles.feedTabs}>
        <Pressable
          onPress={() => {
            setFeedMode("for_you");
            loadFeed("for_you");
          }}
          style={[styles.feedTabBtn, feedMode === "for_you" && styles.feedTabBtnActive]}
        >
          <AppText style={[styles.feedTabText, feedMode === "for_you" && styles.feedTabTextActive]}>
            Dành cho bạn
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => {
            setFeedMode("following");
            loadFeed("following");
          }}
          style={[styles.feedTabBtn, feedMode === "following" && styles.feedTabBtnActive]}
        >
          <AppText
            style={[styles.feedTabText, feedMode === "following" && styles.feedTabTextActive]}
          >
            Đang theo dõi
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  const renderBody = () => {
    // 1. Chưa đăng nhập ứng dụng Booking
    if (!isAuthenticated) {
      return (
        <View style={styles.gateContainer}>
          <View style={styles.gateIconWrap}>
            <Compass size={32} color={colors.brandPrimary} />
          </View>
          <AppText style={styles.gateTitle}>Cộng đồng Social Travel Booking</AppText>
          <AppText style={styles.gateSubtitle}>
            Đăng nhập để khởi tạo tài khoản mạng xã hội, chia sẻ hành trình du lịch và kết nối cùng
            cộng đồng đam mê xê dịch.
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("Auth", { initialMode: "login" })}
            style={styles.gatePrimaryBtn}
          >
            <LogIn size={18} color="#FFFFFF" />
            <AppText style={styles.gatePrimaryBtnText}>Đăng nhập ngay</AppText>
          </Pressable>
        </View>
      );
    }

    // 2. Đang kiểm tra trạng thái social_profiles
    if (isLoadingProfile) {
      return (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#0F172A" />
          <AppText style={styles.loaderLabel}>Đang kết nối cộng đồng...</AppText>
        </View>
      );
    }

    // 3. Chưa khởi tạo tài khoản MXH -> Hiện màn hình khởi tạo
    if (!socialProfile) {
      return (
        <SocialOnboardingView
          suggestions={suggestions}
          onSubmit={handleOnboardingSubmit}
          isSubmitting={isSubmittingOnboarding}
        />
      );
    }

    // 4. Đã khởi tạo -> Hiển thị nội dung theo tab Footer
    if (activeTab === "search") {
      return (
        <SocialSearchTab
          initialQuery={searchSeed}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onOpenComments={(post) => setActiveCommentPost(post)}
          onDeletePost={handleDeletePost}
          onPressService={handlePressService}
          onFollowChanged={(res) => {
            if (typeof res?.viewer_following_count === "number") {
              setSocialProfile((prev) =>
                prev ? { ...prev, following_count: res.viewer_following_count } : prev,
              );
            }
          }}
        />
      );
    }

    if (activeTab === "activity") {
      return <SocialActivityTab onUnreadCountChange={setUnreadActivity} />;
    }

    if (activeTab === "profile") {
      return (
        <SocialProfileTab
          profile={socialProfile}
          onOpenEditProfile={() => setEditProfileVisible(true)}
          onOpenCompose={() => setComposeVisible(true)}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onOpenComments={(post) => setActiveCommentPost(post)}
          onDeletePost={handleDeletePost}
          onPressService={handlePressService}
          refreshTrigger={profileRefreshKey}
        />
      );
    }

    // Mặc định: Tab Trang chủ (Home Feed)
    return (
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHomeFeedHeader}
        contentContainerStyle={styles.feedListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingFeed}
            onRefresh={() => {
              loadFeed(feedMode, true);
              loadUnreadActivityCount();
            }}
          />
        }
        renderItem={({ item }) => (
          <SocialPostCard
            post={item}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenComments={(post) => setActiveCommentPost(post)}
            onToggleFollow={handleToggleFollow}
            onDeletePost={handleDeletePost}
            onPressTag={handlePressTag}
            onPressService={handlePressService}
          />
        )}
        ListEmptyComponent={
          isLoadingFeed ? (
            <View style={styles.feedLoader}>
              <ActivityIndicator color="#0F172A" />
            </View>
          ) : (
            <View style={styles.emptyFeedBox}>
              <AppText style={styles.emptyFeedTitle}>
                {feedMode === "following"
                  ? "Chưa có bài viết từ người bạn theo dõi"
                  : "Bảng tin đang trống"}
              </AppText>
              <AppText style={styles.emptyFeedDesc}>
                {feedMode === "following"
                  ? "Hãy ghé mục Tìm kiếm để theo dõi thêm những du khách thú vị nhé!"
                  : "Hãy là người đầu tiên chia sẻ trải nghiệm du lịch hôm nay!"}
              </AppText>
              <Pressable onPress={() => setComposeVisible(true)} style={styles.emptyCta}>
                <AppText style={styles.emptyCtaText}>Tạo bài viết đầu tiên</AppText>
              </Pressable>
            </View>
          )
        }
      />
    );
  };

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />

        {/* Header riêng của Mạng xã hội: Nút Back bên trái + Logo Social Travel Booking chính giữa */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBackToBooking}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Thoát mạng xã hội"
          >
            <ArrowLeft size={21} color="#0F172A" />
          </Pressable>

          <View style={styles.brandCenter}>
            <AppText style={styles.brandLogo} numberOfLines={1}>
              Social Travel Booking
            </AppText>
          </View>

          {/* Khoảng đệm cân bằng bên phải để Logo luôn chính giữa tuyệt đối */}
          <View style={styles.headerRightSpacer} />
        </View>

        {/* Nội dung chính */}
        <View style={styles.bodyWrap}>{renderBody()}</View>

        {/* Footer 5 tab riêng biệt của Mạng xã hội (chỉ hiển thị sau khi khởi tạo tài khoản MXH) */}
        {isAuthenticated && socialProfile ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable
              onPress={() => setActiveTab("home")}
              style={styles.footerTab}
              accessibilityLabel="Trang chủ"
            >
              <Home
                size={22}
                strokeWidth={activeTab === "home" ? 2.4 : 1.8}
                color={activeTab === "home" ? "#0F172A" : "#94A3B8"}
              />
              <AppText
                style={[styles.footerLabel, activeTab === "home" && styles.footerLabelActive]}
              >
                Trang chủ
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("search")}
              style={styles.footerTab}
              accessibilityLabel="Tìm kiếm"
            >
              <Search
                size={22}
                strokeWidth={activeTab === "search" ? 2.4 : 1.8}
                color={activeTab === "search" ? "#0F172A" : "#94A3B8"}
              />
              <AppText
                style={[styles.footerLabel, activeTab === "search" && styles.footerLabelActive]}
              >
                Tìm kiếm
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setComposeVisible(true)}
              style={styles.footerTab}
              accessibilityLabel="Tạo bài đăng"
            >
              <View style={styles.composeIconPill}>
                <PlusSquare size={22} strokeWidth={2.2} color="#0F172A" />
              </View>
              <AppText style={styles.footerLabel}>Đăng bài</AppText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("activity")}
              style={styles.footerTab}
              accessibilityLabel="Hoạt động"
            >
              <View style={styles.iconBadgeWrap}>
                <Heart
                  size={22}
                  strokeWidth={activeTab === "activity" ? 2.4 : 1.8}
                  color={activeTab === "activity" ? "#0F172A" : "#94A3B8"}
                  fill={activeTab === "activity" ? "#0F172A" : "transparent"}
                />
                {unreadActivity > 0 ? <View style={styles.unreadDot} /> : null}
              </View>
              <AppText
                style={[styles.footerLabel, activeTab === "activity" && styles.footerLabelActive]}
              >
                Hoạt động
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("profile")}
              style={styles.footerTab}
              accessibilityLabel="Cá nhân"
            >
              <User
                size={22}
                strokeWidth={activeTab === "profile" ? 2.4 : 1.8}
                color={activeTab === "profile" ? "#0F172A" : "#94A3B8"}
              />
              <AppText
                style={[styles.footerLabel, activeTab === "profile" && styles.footerLabelActive]}
              >
                Cá nhân
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>

      {/* BottomSheet Tạo bài đăng mới */}
      <CreatePostBottomSheet
        visible={composeVisible}
        profile={socialProfile}
        onClose={() => setComposeVisible(false)}
        onSubmit={handleCreatePost}
      />

      {/* BottomSheet Bình luận */}
      <CommentsBottomSheet
        visible={Boolean(activeCommentPost)}
        post={activeCommentPost}
        myProfile={socialProfile}
        onClose={() => setActiveCommentPost(null)}
        onCommentAdded={handleCommentAdded}
      />

      {/* BottomSheet Chỉnh sửa hồ sơ MXH */}
      <EditProfileBottomSheet
        visible={editProfileVisible}
        profile={socialProfile}
        onClose={() => setEditProfileVisible(false)}
        onSaved={(updated) => setSocialProfile(updated)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  backBtnPressed: {
    backgroundColor: "#E2E8F0",
  },
  brandCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  brandLogo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  headerRightSpacer: {
    width: 38,
  },
  bodyWrap: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  whatsNewBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  whatsNewBarPressed: {
    backgroundColor: "#F8FAFC",
  },
  whatsNewTextCol: {
    flex: 1,
    gap: 2,
  },
  whatsNewName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  whatsNewPrompt: {
    fontSize: 14,
    color: "#94A3B8",
  },
  whatsNewPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "#F1F5F9",
  },
  whatsNewPillText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  feedTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  feedTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  feedTabBtnActive: {
    borderBottomColor: "#0F172A",
  },
  feedTabText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  feedTabTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  feedListContent: {
    paddingBottom: 24,
  },
  feedLoader: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyFeedBox: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: 48,
    gap: 10,
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  emptyFeedDesc: {
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 6,
    backgroundColor: "#0F172A",
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyCtaText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 2,
  },
  composeIconPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  footerLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#94A3B8",
  },
  footerLabelActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  iconBadgeWrap: {
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E11D48",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  centerLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderLabel: {
    fontSize: 13.5,
    color: "#64748B",
  },
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: 14,
  },
  gateIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  gateSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },
  gatePrimaryBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    borderRadius: radius.full,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },
  gatePrimaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
