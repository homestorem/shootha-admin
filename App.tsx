import "react-native-gesture-handler";
import React, { useMemo } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Cairo_400Regular, Cairo_700Bold } from "@expo-google-fonts/cairo";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme as NavigationTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { buildToastConfig } from "./src/theme/toastConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { SettingsProvider, useSettings } from "./src/providers/SettingsProvider";
import { AuthProvider } from "./src/providers/AuthProvider";
import { FirebaseAuthShell } from "./src/components/FirebaseAuthShell";
import { AppBackground } from "./src/components/AppBackground";

const queryClient = new QueryClient();

function RootChrome() {
  const { palette, dir } = useSettings();
  const toastCfg = useMemo(() => buildToastConfig(palette), [palette]);

  return (
    <>
      <StatusBar style={palette.scheme === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, writingDirection: dir }}>
        <AppBackground>
          <View style={{ flex: 1 }} pointerEvents="box-none">
            <AppNavigator />
          </View>
        </AppBackground>
      </View>
      <Toast topOffset={52} config={toastCfg} />
    </>
  );
}

function Root() {
  const { theme, palette } = useSettings();

  const navigationTheme = useMemo((): NavigationTheme => {
    const base = theme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme === "dark",
      colors: {
        ...base.colors,
        primary: palette.primary,
        background: "transparent",
        card: palette.surfaceCard,
        text: palette.text,
        border: palette.border,
        notification: palette.primary
      }
    };
  }, [theme, palette]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootChrome />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
    Inter_400Regular,
    Inter_700Bold
  });

  /** مؤقتاً: لا نستخدم preventAutoHideAsync — إخفاء السبلش الأصلي عند أول إطار */
  React.useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0C8E4E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <FirebaseAuthShell>
              <QueryClientProvider client={queryClient}>
                <Root />
              </QueryClientProvider>
            </FirebaseAuthShell>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
