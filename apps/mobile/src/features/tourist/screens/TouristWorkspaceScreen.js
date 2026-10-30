import React, { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../../theme/tokens";
import { useAuth } from "../../../hooks/useAuth";

// Import các sub-components theo kiến trúc Component-Based Architecture
import TouristHeader from "../components/TouristHeader";
import TouristSummaryCards from "../components/TouristSummaryCards";
import TouristDealCard from "../components/TouristDealCard";
import TouristQrTicketCard from "../components/TouristQrTicketCard";
import TouristBottomBar from "../components/TouristBottomBar";

const TOURIST_TABS = [
  { id: "explore", label: "Khám phá" },
  { id: "feed", label: "Cộng đồng" },
  { id: "tickets", label: "Vé QR" },
  { id: "profile", label: "Cá nhân" },
];

export default function TouristWorkspaceScreen() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("explore");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* 1. Header màn hình */}
      <TouristHeader user={user} onLogout={logout} />

      {/* 2. Nội dung cuộn chính */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Thẻ số dư ví & thông tin mạng xã hội */}
        <TouristSummaryCards wallet={user?.wallet} socialProfile={user?.social_profile} />

        {/* Thẻ Tour Ưu đãi Hot (Sunset Coral & Sky Blue) */}
        <TouristDealCard
          title="Du thuyền Hoàng hôn Vịnh Ngắm Cầu Rồng Phun Lửa"
          desc="Bao gồm tiệc nhẹ canape trên boong tàu, đồ uống nhiệt đới và âm nhạc acoustic sống động."
          originalPrice="850.000 đ"
          dealPrice="650.000 đ"
          rating="⭐ 4.9 (128)"
          dealBadge="🔥 DEAL MÙA HÈ · GIẢM 25%"
        />

        {/* Thẻ vé QR Check-in bảo mật mẫu */}
        <TouristQrTicketCard
          bookingCode="STB-20261019-8492"
          tourTitle="Tour Lặn Ngắm San Hô Bán Đảo Sơn Trà"
          scheduleTime="20/10/2026 · 08:00 SA · Bến du thuyền Sơn Trà"
          qrToken="QR-TOKEN-8492-SONTRA-VERIFIED"
          paymentStatus="Đã thanh toán"
        />
      </ScrollView>

      {/* 3. Thanh điều hướng đáy */}
      <TouristBottomBar
        tabs={TOURIST_TABS}
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.base,
  },
});
