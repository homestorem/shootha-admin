import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../providers/AuthProvider";
import { t } from "../strings";
import { BookingsScreen } from "../screens/BookingsScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AccountsScreen } from "../screens/AccountsScreen";
import { FieldsScreen } from "../screens/FieldsScreen";
import { FieldManageScreen } from "../screens/FieldManageScreen";
import { PostMatchScreen } from "../screens/PostMatchScreen";
import { AuthHubScreen } from "../screens/auth/AuthHubScreen";
import { PhoneLoginScreen } from "../screens/auth/PhoneLoginScreen";
import { PhoneRegisterScreen } from "../screens/auth/PhoneRegisterScreen";
import { OtpVerifyScreen } from "../screens/auth/OtpVerifyScreen";
import { BRAND } from "../theme/brand";
import { colors } from "../theme/colors";
import { CustomTabBar } from "./CustomTabBar";
import type { AuthStackParamList } from "./authStackTypes";

export type { AuthStackParamList } from "./authStackTypes";

export type MainTabParamList = {
  Home: { openBookingId?: string } | undefined;
  Fields: undefined;
  Notifications: undefined;
  Accounts: undefined;
  Profile: undefined;
  Schedule: undefined;
};

export type MainAppStackParamList = {
  MainTabs: undefined;
  FieldManage: { fieldId: string; fieldName: string };
  PostMatch: {
    mode: "owner" | "venue";
    ownerBookingId?: string;
    venueBookingId?: string;
  };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const StackAuth = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<MainAppStackParamList>();

function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
        sceneContainerStyle: { backgroundColor: colors.surface }
      }}
    >
      <Tab.Screen name="Home" component={BookingsScreen} options={{ title: t.tabs.home }} />
      <Tab.Screen name="Fields" component={FieldsScreen} options={{ title: t.tabs.fields }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: t.tabs.notifications }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} options={{ title: t.tabs.accounts }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t.tabs.profile }} />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: t.schedule.title,
          tabBarButton: () => null
        }}
      />
    </Tab.Navigator>
  );
}

function AppLoggedInStack() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={AppTabs} />
      <AppStack.Screen
        name="FieldManage"
        component={FieldManageScreen}
        options={{
          headerShown: true,
          headerTitleAlign: "center",
          headerBackTitleVisible: false,
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.surfaceCard },
          headerTitleStyle: { fontWeight: "800" }
        }}
      />
      <AppStack.Screen
        name="PostMatch"
        component={PostMatchScreen}
        options={{
          headerShown: true,
          headerTitleAlign: "center",
          headerBackTitleVisible: false,
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.surfaceCard },
          headerTitleStyle: { fontWeight: "800" }
        }}
      />
    </AppStack.Navigator>
  );
}

function AuthLoading() {
  return (
    <View style={loadingStyles.wrap}>
      <Text style={loadingStyles.brand}>{BRAND.name}</Text>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={loadingStyles.text}>{t.common.loading}</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  },
  brand: {
    marginBottom: 20,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: colors.primary
  },
  text: {
    marginTop: 14,
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "600"
  }
});

function AuthStack() {
  return (
    <StackAuth.Navigator initialRouteName="AuthHub" screenOptions={{ headerShown: false }}>
      <StackAuth.Screen name="AuthHub" component={AuthHubScreen} />
      <StackAuth.Screen name="SignUp" component={PhoneRegisterScreen} />
      <StackAuth.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <StackAuth.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </StackAuth.Navigator>
  );
}

export const AppNavigator = () => {
  const { session, loading } = useAuth();

  if (loading) return <AuthLoading />;

  const isAuthenticated = !!session;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <Stack.Screen name="App" component={AppLoggedInStack} />
      )}
    </Stack.Navigator>
  );
};
