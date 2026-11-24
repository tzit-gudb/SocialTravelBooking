import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import AuthScreen from "../features/auth/screens/AuthScreen";
import PlatformUnsupportedScreen from "../features/auth/screens/PlatformUnsupportedScreen";
import TouristTabsNavigator from "./TouristTabsNavigator";
import ServiceSearchScreen from "../features/explore/screens/ServiceSearchScreen";
import AllLocationsScreen from "../features/explore/screens/AllLocationsScreen";
import HolidayCampaignsScreen from "../features/explore/screens/HolidayCampaignsScreen";
import RoomTypeDetailScreen from "../features/explore/screens/RoomTypeDetailScreen";
import BookingCheckoutScreen from "../features/booking/screens/BookingCheckoutScreen";
import BookingDetailScreen from "../features/booking/screens/BookingDetailScreen";
import SepayPaymentScreen from "../features/booking/screens/SepayPaymentScreen";
import ProfileScreen from "../features/tourist/screens/ProfileScreen";
import ToursScreen from "../features/tour/screens/ToursScreen";
import DetailScreen from "../features/tour/screens/DetailScreen";

const Stack = createNativeStackNavigator();

/**
 * Điều hướng gốc ứng dụng Mobile:
 * - Mặc định mở thẳng Trang chủ (TouristTabsNavigator — Tab Tìm kiếm) cho cả Khách vãng lai (Guest) và Du khách (tourist).
 * - Khách vãng lai có thể chủ động bấm Đăng nhập / Đăng ký bất cứ lúc nào (stack Auth).
 * - Quản trị viên (admin) hoặc Nhà cung cấp (provider) sau khi đăng nhập sẽ chuyển sang PlatformUnsupportedScreen.
 */
export default function RootNavigator() {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated && role !== "tourist") {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PlatformUnsupported" component={PlatformUnsupportedScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName="TouristMainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TouristMainTabs" component={TouristTabsNavigator} />
      <Stack.Screen name="ServiceSearch" component={ServiceSearchScreen} />
      <Stack.Screen name="AllLocations" component={AllLocationsScreen} />
      <Stack.Screen name="HolidayCampaigns" component={HolidayCampaignsScreen} />
      <Stack.Screen
        name="Tours"
        component={ToursScreen}
        options={{ headerShown: true, title: "Danh sách Tour" }}
      />
      <Stack.Screen name="Detail" component={DetailScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="RoomTypeDetail"
        component={RoomTypeDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingCheckout"
        component={BookingCheckoutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SepayPayment"
        component={SepayPaymentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}
