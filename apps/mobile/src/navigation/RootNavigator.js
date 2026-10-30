import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";
import AuthScreen from "../features/auth/screens/AuthScreen";
import PlatformUnsupportedScreen from "../features/auth/screens/PlatformUnsupportedScreen";
import TouristWorkspaceScreen from "../features/tourist/screens/TouristWorkspaceScreen";
import ToursScreen from "../features/tour/screens/ToursScreen";
import DetailScreen from "../features/tour/screens/DetailScreen";

const Stack = createNativeStackNavigator();

/**
 * Điều hướng gốc ứng dụng Mobile:
 * - Khách chưa đăng nhập: AuthScreen
 * - Khách du lịch (tourist): TouristWorkspace & luồng khám phá tour
 * - Quản trị viên (admin) hoặc Nhà cung cấp (provider): Màn hình 404 PlatformUnsupportedScreen
 */
export default function RootNavigator() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : role === "tourist" ? (
        <>
          <Stack.Screen name="TouristWorkspace" component={TouristWorkspaceScreen} />
          <Stack.Screen
            name="Tours"
            component={ToursScreen}
            options={{ headerShown: true, title: "Danh sách Tour" }}
          />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{ headerShown: true, title: "Chi tiết Dịch vụ" }}
          />
        </>
      ) : (
        <Stack.Screen name="PlatformUnsupported" component={PlatformUnsupportedScreen} />
      )}
    </Stack.Navigator>
  );
}
