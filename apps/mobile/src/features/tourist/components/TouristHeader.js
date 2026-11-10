import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, radius, touchTarget } from "../../../theme/tokens";

/**
 * Component thanh tiêu đề màn hình Du khách (Tourist Header)
 */
export default function TouristHeader({ user, onLogout }) {
  return (
    <View style={styles.header}>
      <View>
        <AppText variant="caption" style={styles.roleTag}>
          Không gian Du khách (Tourist)
        </AppText>
        <AppText variant="h2">{user?.name || "Du khách"}</AppText>
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  roleTag: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  logoutBtn: {
    minHeight: touchTarget.minHeight - 8,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  logoutBtnPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: colors.statusDanger,
    fontWeight: "600",
  },
});
