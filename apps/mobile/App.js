import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { useFonts, Quicksand_600SemiBold, Quicksand_700Bold } from "@expo-google-fonts/quicksand";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "./src/features/auth/context/AuthContext";
import { useAuth } from "./src/hooks/useAuth";
import {
  ExploreDataProvider,
  useExploreData,
} from "./src/features/explore/context/ExploreDataContext";
import { SearchFilterProvider } from "./src/context/SearchFilterContext";
import { PendingBookingProvider } from "./src/context/PendingBookingContext";
import RootNavigator from "./src/navigation/RootNavigator";
import SplashScreen from "./src/features/splash/screens/SplashScreen";
import { colors } from "./src/theme/tokens";

function AppBootstrapShell({ fontsLoaded }) {
  const { isLoading: authLoading } = useAuth();
  const { isBootstrapped } = useExploreData();
  const [isSplashDone, setIsSplashDone] = useState(false);

  const isAppDataReady = fontsLoaded && !authLoading && isBootstrapped;

  if (!fontsLoaded) {
    return <View style={styles.splashFallback} />;
  }

  if (!isSplashDone) {
    return <SplashScreen isReady={isAppDataReady} onFinish={() => setIsSplashDone(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ExploreDataProvider>
          <SearchFilterProvider>
            <PendingBookingProvider>
              <AppBootstrapShell fontsLoaded={fontsLoaded} />
            </PendingBookingProvider>
          </SearchFilterProvider>
        </ExploreDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashFallback: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
  },
});
