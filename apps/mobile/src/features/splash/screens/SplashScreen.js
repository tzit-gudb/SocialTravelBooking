import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Animated, Easing, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import AppText from "../../../components/common/AppText";
import { colors, spacing } from "../../../theme/tokens";

/**
 * Màn hình Splash khởi động Mobile tối giản nhất:
 * - Nền trắng
 * - Chỉ hiển thị Logo "Social Travel Booking" xuất hiện nhẹ nhàng từ dưới lên
 * - Sau 2s xuất hiện hiệu ứng loading ngay dưới logo (không có text)
 * - Kết thúc thời gian loading thì biến mất nhẹ nhàng
 */
export default function SplashScreen({ onFinish }) {
  const [showLoading, setShowLoading] = useState(false);

  // Animated values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(30)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo xuất hiện nhẹ nhàng từ dưới lên
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Sau 2 giây xuất hiện hiệu ứng loading ngay dưới logo
    const timerLoading = setTimeout(() => {
      setShowLoading(true);
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 2000);

    // 3. Sau khi kết thúc thời gian loading giả lập (thêm 1.8s) -> fade out chuyển trang
    const timerFinish = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }, 3800);

    return () => {
      clearTimeout(timerLoading);
      clearTimeout(timerFinish);
    };
  }, [logoOpacity, logoTranslateY, loadingOpacity, screenOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar style="dark" />

      {/* Logo và Loading căn giữa màn hình */}
      <View style={styles.centerBox}>
        <Animated.View
          style={[
            styles.brandGroup,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }],
            },
          ]}
        >
          {/* Chỉ hiển thị duy nhất Logo Quicksand chuẩn thương hiệu */}
          <AppText isLogo style={styles.logoText}>
            Social Travel Booking
          </AppText>

          {/* Vùng loading ngay dưới logo, giữ vị trí cố định để không đẩy lệch logo */}
          <View style={styles.loadingSlot}>
            {showLoading && (
              <Animated.View style={{ opacity: loadingOpacity }}>
                <ActivityIndicator size="large" color={colors.brandPrimary} />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  centerBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  brandGroup: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 35,
    lineHeight: 48,
    paddingTop: 8,
    color: colors.brandPrimary,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  loadingSlot: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },
});
