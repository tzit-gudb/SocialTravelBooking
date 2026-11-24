import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarCheck2, Compass, Search, User } from "lucide-react-native";
import AppText from "../components/common/AppText";
import { colors, spacing } from "../theme/tokens";
import ExploreHomeScreen from "../features/explore/screens/ExploreHomeScreen";
import SocialFeedScreen from "../features/explore/screens/SocialFeedScreen";
import BookingsTabScreen from "../features/tourist/screens/BookingsTabScreen";
import AccountTabScreen from "../features/tourist/screens/AccountTabScreen";
import FloatingPendingBookingBanner from "../features/booking/components/FloatingPendingBookingBanner";

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  SearchTab: { label: "Tìm kiếm", icon: Search },
  DiscoverTab: { label: "Khám phá", icon: Compass },
  BookingsTab: { label: "Đặt chỗ", icon: CalendarCheck2 },
  AccountTab: { label: "Cá nhân", icon: User },
};

/**
 * Thanh điều hướng đáy thiết kế theo phong cách Liquid Glass (cảm hứng iOS 26):
 * - Dạng thanh nổi (floating pill dock) trong mờ với viền kính sáng phản quang
 * - Viên nang lỏng (liquid active capsule) nổi bật cho tab đang chọn
 */
function LiquidGlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10) + 4;

  return (
    <View style={[styles.dockOuter, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.glassPill}>
        {/* Viền phản quang kính phía trên tạo chiều sâu Liquid Glass */}
        <View style={styles.glassSpecularLine} pointerEvents="none" />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || { label: route.name, icon: Search };
          const IconComp = config.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || config.label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                isFocused && styles.tabItemActive,
                pressed && styles.tabItemPressed,
              ]}
            >
              <IconComp
                size={18}
                strokeWidth={isFocused ? 2.3 : 1.9}
                color={isFocused ? colors.brandPrimary : "#475569"}
              />
              <AppText
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {config.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TouristTabsNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="SearchTab"
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="SearchTab" component={ExploreHomeScreen} />
        <Tab.Screen name="DiscoverTab" component={SocialFeedScreen} />
        <Tab.Screen name="BookingsTab" component={BookingsTabScreen} />
        <Tab.Screen name="AccountTab" component={AccountTabScreen} />
      </Tab.Navigator>
      <FloatingPendingBookingBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  glassPill: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor:
      Platform.OS === "ios" ? "rgba(255, 255, 255, 0.84)" : "rgba(255, 255, 255, 0.93)",
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderWidth: 1.25,
    borderColor: "rgba(255, 255, 255, 0.96)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  glassSpecularLine: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 9999,
    overflow: "hidden",
    gap: 2,
    minHeight: 42,
  },
  tabItemActive: {
    backgroundColor: "rgba(2, 132, 199, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.32)",
    borderRadius: 9999,
  },
  tabItemPressed: {
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  tabLabelActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
});
