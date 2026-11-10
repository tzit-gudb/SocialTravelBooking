import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import AppText from "../../../components/common/AppText";
import { colors, spacing, touchTarget } from "../../../theme/tokens";

/**
 * Component thanh điều hướng đáy màn hình Du khách (Bottom Navigation 48pt+)
 */
export default function TouristBottomBar({ tabs = [], activeTab, onSelectTab }) {
  return (
    <View style={styles.bottomBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelectTab?.(tab.id)}
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
          >
            <AppText variant="label" style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    flex: 1,
    minHeight: touchTarget.minHeight + 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonPressed: {
    opacity: 0.75,
  },
  tabText: {
    color: colors.inkSubtle,
  },
  tabTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
});
