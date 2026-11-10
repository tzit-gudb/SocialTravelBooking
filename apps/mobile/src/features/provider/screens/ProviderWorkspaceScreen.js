import React, { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../../theme/tokens";
import { useAuth } from "../../../hooks/useAuth";

// Import các sub-components theo kiến trúc Component-Based Architecture
import ProviderHeader from "../components/ProviderHeader";
import ProviderMetricsRow from "../components/ProviderMetricsRow";
import ProviderQrScannerBox from "../components/ProviderQrScannerBox";
import ProviderBottomBar from "../components/ProviderBottomBar";

const PROVIDER_TABS = [
  { id: "dashboard", label: "Điều hành" },
  { id: "scanner", label: "Quét vé QR" },
  { id: "services", label: "Tour & Phòng" },
  { id: "wallet", label: "Doanh thu" },
];

export default function ProviderWorkspaceScreen() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState("");

  const businessName = user?.provider_profile?.business_name || `${user?.name} Travel`;

  const handleVerifyQr = () => {
    if (!qrInput.trim()) return;
    setScanResult(`Đã xác thực mã QR "${qrInput.trim()}". Cập nhật checked_in_at thành công!`);
    setQrInput("");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* 1. Header màn hình Nhà cung cấp */}
      <ProviderHeader businessName={businessName} onLogout={logout} />

      {/* 2. Nội dung cuộn chính */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Thống kê nhanh: Khách chờ check-in & Số dư ví khả dụng */}
        <ProviderMetricsRow pendingCheckins={12} balance={user?.wallet?.balance || 45800000} />

        {/* Trạm quét & kiểm tra mã QR Check-in */}
        <ProviderQrScannerBox
          qrInput={qrInput}
          setQrInput={setQrInput}
          scanResult={scanResult}
          onVerifyQr={handleVerifyQr}
        />
      </ScrollView>

      {/* 3. Thanh điều hướng đáy */}
      <ProviderBottomBar
        tabs={PROVIDER_TABS}
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
