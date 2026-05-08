import "react-native-gesture-handler";
import React, { useMemo, useState, useEffect } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Cairo_400Regular, Cairo_700Bold } from "@expo-google-fonts/cairo";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type Theme as NavigationTheme
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { buildToastConfig } from "./src/theme/toastConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { SettingsProvider, useSettings } from "./src/providers/SettingsProvider";
import { AuthProvider, useAuth } from "./src/providers/AuthProvider";
import { FirebaseAuthShell } from "./src/components/FirebaseAuthShell";
import { AppBackground } from "./src/components/AppBackground";
import { AnimatedLogoSplash } from "./src/components/AnimatedLogoSplash";
import { registerExpoPushTokenForUser } from "./src/lib/pushNotifications";

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* تجاهل إن كان النظام لا يدعم إخفاءً يدوياً */
});

const SPLASH_BG = "#FFFFFF";

const queryClient = new QueryClient();

/** سبلاش فوق المحتوى حتى مرور 3 ثوانٍ على الأقل + اكتمال تهيئة المصادقة */
function BootSplashLayer({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const [splashIntroDone, setSplashIntroDone] = useState(Platform.OS === "web");
  const appReady = !loading;

  return (
    <>
      {children}
      {!splashIntroDone && Platform.OS !== "web" ? (
        <AnimatedLogoSplash appReady={appReady} onComplete={() => setSplashIntroDone(true)} />
      ) : null}
    </>
  );
}

function RootChrome() {
  const { palette, dir } = useSettings();
  const toastCfg = useMemo(() => buildToastConfig(palette), [palette]);

  return (
    <>
      <StatusBar style={palette.scheme === "dark" ? "light" : "dark"} />
      <View style={[{ flex: 1 }, { writingDirection: dir } as ViewStyle]}>
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

function PushNotificationsBootstrap() {
  const { user } = useAuth();
  const lastUidRef = React.useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.uid ?? user?.id ?? null;
    if (!uid || uid === lastUidRef.current) return;
    lastUidRef.current = uid;
    void registerExpoPushTokenForUser(uid).catch((e) => {
      console.warn("[push] token register failed:", e);
    });
  }, [user?.uid, user?.id]);

  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
    Inter_400Regular,
    Inter_700Bold
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: SPLASH_BG }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: SPLASH_BG }}>
      <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
        <SafeAreaProvider>
          <SettingsProvider>
            <AuthProvider>
              <BootSplashLayer>
                <FirebaseAuthShell>
                  <PushNotificationsBootstrap />
                  <QueryClientProvider client={queryClient}>
                    <Root />
                  </QueryClientProvider>
                </FirebaseAuthShell>
              </BootSplashLayer>
            </AuthProvider>
          </SettingsProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
