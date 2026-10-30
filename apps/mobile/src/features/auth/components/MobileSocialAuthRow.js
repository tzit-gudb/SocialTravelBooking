import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius, touchTarget } from "../../../theme/tokens";

/**
 * Biểu tượng Google chuẩn nhận diện 4 màu (Đỏ, Vàng, Xanh lá, Xanh dương)
 */
function GoogleBrandIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

/**
 * Biểu tượng Apple nguyên bản
 */
function AppleBrandIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.67-.9 2.71 1 .08 2.02-.51 2.58-1.2z" />
    </Svg>
  );
}

/**
 * Biểu tượng Facebook chuẩn xanh thương hiệu
 */
function FacebookBrandIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </Svg>
  );
}

/**
 * Component hàng dọc các nút đăng nhập MXH:
 * - "Tiếp tục bằng tài khoản Google" (Logo G đa màu Đỏ, Xanh, Vàng)
 * - "Tiếp tục bằng tài khoản Apple"
 * - "Tiếp tục bằng tài khoản Facebook"
 */
export default function MobileSocialAuthRow({
  onGooglePress,
  onApplePress,
  onFacebookPress,
  disabled = false,
}) {
  return (
    <View style={styles.container}>
      {/* Đường phân cách */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText style={styles.dividerText}>Hoặc tiếp tục với</AppText>
        <View style={styles.dividerLine} />
      </View>

      {/* Cụm 3 nút Social Login xếp theo hàng dọc */}
      <View style={styles.buttonsColumn}>
        {/* Nút Google */}
        <Pressable
          style={({ pressed }) => [
            styles.socialBtn,
            pressed && styles.socialBtnPressed,
            disabled && styles.btnDisabled,
          ]}
          onPress={onGooglePress}
          disabled={disabled}
          accessibilityLabel="Tiếp tục bằng tài khoản Google"
        >
          <View style={styles.iconSlot}>
            <GoogleBrandIcon size={20} />
          </View>
          <AppText style={styles.btnLabel}>Tiếp tục bằng tài khoản Google</AppText>
        </Pressable>

        {/* Nút Apple */}
        <Pressable
          style={({ pressed }) => [
            styles.socialBtn,
            pressed && styles.socialBtnPressed,
            disabled && styles.btnDisabled,
          ]}
          onPress={onApplePress}
          disabled={disabled}
          accessibilityLabel="Tiếp tục bằng tài khoản Apple"
        >
          <View style={styles.iconSlot}>
            <AppleBrandIcon size={20} />
          </View>
          <AppText style={styles.btnLabel}>Tiếp tục bằng tài khoản Apple</AppText>
        </Pressable>

        {/* Nút Facebook */}
        <Pressable
          style={({ pressed }) => [
            styles.socialBtn,
            pressed && styles.socialBtnPressed,
            disabled && styles.btnDisabled,
          ]}
          onPress={onFacebookPress}
          disabled={disabled}
          accessibilityLabel="Tiếp tục bằng tài khoản Facebook"
        >
          <View style={styles.iconSlot}>
            <FacebookBrandIcon size={20} />
          </View>
          <AppText style={styles.btnLabel}>Tiếp tục bằng tài khoản Facebook</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: spacing.lg,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  dividerText: {
    fontSize: 12,
    color: colors.inkSubtle,
    marginHorizontal: spacing.md,
    fontWeight: "500",
  },
  buttonsColumn: {
    flexDirection: "column",
    gap: spacing.sm + 2,
  },
  socialBtn: {
    width: "100%",
    minHeight: touchTarget.minHeight + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.base,
  },
  socialBtnPressed: {
    opacity: 0.85,
    backgroundColor: colors.surfaceBase,
    transform: [{ scale: 0.99 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
  iconSlot: {
    marginRight: spacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkPrimary,
  },
});
