import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/theme/toastConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nManager } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { SettingsProvider, useSettings } from "./src/providers/SettingsProvider";
import { AuthProvider } from "./src/providers/AuthProvider";
import { FirebaseAuthShell } from "./src/components/FirebaseAuthShell";

I18nManager.forceRTL(true);

const queryClient = new QueryClient();

function Root() {
  const { theme } = useSettings();

  return (
    <NavigationContainer theme={theme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <AppNavigator />
      <Toast topOffset={52} config={toastConfig} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
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
  );
}

