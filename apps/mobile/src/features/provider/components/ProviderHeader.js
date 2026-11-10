import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius } from "../../../theme/tokens";

/**
 * Component thanh tiêu đề màn hình Nhà cung cấp (Provider Header)
 */
export default function ProviderHeader({ businessName, onLogout }) {
  return (
    <View style={styles.header}>
      <View style={styles.flexOne}>
        <AppText variant="caption" style={styles.roleTag}>
          Cổng Đối tác (Provider)
        </AppText>
        <AppText variant="h2" numberOfLines={1}>
          {businessName}
        </AppText>
      </View>

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
      >
        <AppText variant="caption" style={styles.logoutText}>
          Đăng xuất
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  flexOne: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  roleTag: {
    color: colors.secondaryLagoon,
    fontWeight: "700",
  },
  logoutBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceBase,
  },
  logoutBtnPressed: {
    backgroundColor: colors.statusDangerBg,
    borderColor: colors.statusDanger,
  },
  logoutText: {
    color: colors.statusDanger,
    fontWeight: "700",
  },
});
