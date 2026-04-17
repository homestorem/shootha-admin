import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "../providers/SettingsProvider";
import { BookingsScreen } from "../screens/BookingsScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AccountsScreen } from "../screens/AccountsScreen";
import { FieldsScreen } from "../screens/FieldsScreen";
import { FieldManageScreen } from "../screens/FieldManageScreen";
import { DailyScheduleScreen } from "../screens/DailyScheduleScreen";
import { PostMatchScreen } from "../screens/PostMatchScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { SocialPlatformsScreen } from "../screens/SocialPlatformsScreen";
import { EditAccountScreen } from "../screens/EditAccountScreen";
import { FieldDataRequestScreen } from "../screens/FieldDataRequestScreen";
import { SupportContactScreen } from "../screens/SupportContactScreen";
import { SupportChatScreen } from "../screens/SupportChatScreen";
import { TermsConditionsScreen } from "../screens/TermsConditionsScreen";
import { PrivacyPolicyScreen } from "../screens/PrivacyPolicyScreen";
import { DeleteAccountPhoneScreen } from "../screens/DeleteAccountPhoneScreen";
import { DeleteAccountOtpScreen } from "../screens/DeleteAccountOtpScreen";
import { AuthHubScreen } from "../screens/auth/AuthHubScreen";
import { PhoneLoginScreen } from "../screens/auth/PhoneLoginScreen";
import { PhoneRegisterScreen } from "../screens/auth/PhoneRegisterScreen";
import { OtpVerifyScreen } from "../screens/auth/OtpVerifyScreen";
import { fontFamily } from "../theme/fonts";
import { CustomTabBar } from "./CustomTabBar";
import type { AuthStackParamList } from "./authStackTypes";
import type { MainAppStackParamList } from "./mainAppStackTypes";

export type { AuthStackParamList } from "./authStackTypes";
export type { MainAppStackParamList } from "./mainAppStackTypes";

export type MainTabParamList = {
  Home: { openBookingId?: string } | undefined;
  Fields: undefined;
  Notifications: undefined;
  Accounts: undefined;
  Profile: undefined;
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
  const { palette, tr } = useSettings();
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: "transparent" }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamily.sansBold, marginBottom: 4 }
      }}
    >
      <Tab.Screen name="Fields" component={FieldsScreen} options={{ title: tr("tabs.fields") }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: tr("tabs.notifications") }} />
      <Tab.Screen name="Home" component={BookingsScreen} options={{ title: tr("tabs.home") }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} options={{ title: tr("tabs.accounts") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: tr("tabs.profile") }} />
    </Tab.Navigator>
  );
}

function AppLoggedInStack() {
  const { palette, isRTL, tr } = useSettings();
  const headerWritingDirection: "rtl" | "ltr" = isRTL ? "rtl" : "ltr";
  const headerTextAlign: "right" | "left" = isRTL ? "right" : "left";
  const headerOpts = useMemo(
    () => ({
      headerTintColor: palette.primary,
      headerStyle: {
        backgroundColor: palette.surfaceCard
      },
      headerTitleStyle: {
        fontFamily: fontFamily.sansBold,
        color: palette.text,
        writingDirection: headerWritingDirection,
        textAlign: headerTextAlign
      },
      headerBackTitleVisible: false
    }),
    [palette, headerWritingDirection, headerTextAlign]
  );
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <AppStack.Screen name="MainTabs" component={AppTabs} />
      <AppStack.Screen
        name="DailySchedule"
        component={DailyScheduleScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          title: tr("schedule.title"),
          ...headerOpts
        }}
      />
      <AppStack.Screen
        name="FieldManage"
        component={FieldManageScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          ...headerOpts
        }}
      />
      <AppStack.Screen
        name="PostMatch"
        component={PostMatchScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          ...headerOpts
        }}
      />
      <AppStack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          title: tr("nav.wallet"),
          ...headerOpts
        }}
      />
      <AppStack.Screen
        name="SocialPlatforms"
        component={SocialPlatformsScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          title: tr("profile.platformsTitle"),
          ...headerOpts
        }}
      />
      <AppStack.Screen
        name="EditAccount"
        component={EditAccountScreen}
        options={{ headerShown: true, headerTitleAlign: isRTL ? "left" : "center", title: tr("nav.editAccount"), ...headerOpts }}
      />
      <AppStack.Screen
        name="FieldDataRequest"
        component={FieldDataRequestScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          title: tr("nav.fieldDataRequest"),
          ...headerOpts
        }}
      />
      <AppStack.Screen
        name="SupportContact"
        component={SupportContactScreen}
        options={{ headerShown: true, headerTitleAlign: isRTL ? "left" : "center", title: tr("nav.supportContact"), ...headerOpts }}
      />
      <AppStack.Screen
        name="SupportChat"
        component={SupportChatScreen}
        options={{ headerShown: true, headerTitleAlign: isRTL ? "left" : "center", title: tr("supportChat.title"), ...headerOpts }}
      />
      <AppStack.Screen
        name="TermsConditions"
        component={TermsConditionsScreen}
        options={{ headerShown: true, headerTitleAlign: isRTL ? "left" : "center", title: tr("nav.terms"), ...headerOpts }}
      />
      <AppStack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: true, headerTitleAlign: isRTL ? "left" : "center", title: tr("nav.privacy"), ...headerOpts }}
      />
      <AppStack.Screen
        name="DeleteAccountPhone"
        component={DeleteAccountPhoneScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          ...headerOpts,
          title: tr("deleteAccount.navTitle")
        }}
      />
      <AppStack.Screen
        name="DeleteAccountOtp"
        component={DeleteAccountOtpScreen}
        options={{
          headerShown: true,
          headerTitleAlign: isRTL ? "left" : "center",
          ...headerOpts,
          title: tr("deleteAccount.otpNavTitle")
        }}
      />
    </AppStack.Navigator>
  );
}

function AuthStackNavigator() {
  return (
    <StackAuth.Navigator
      initialRouteName="AuthHub"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
    >
      <StackAuth.Screen name="AuthHub" component={AuthHubScreen} />
      <StackAuth.Screen name="SignUp" component={PhoneRegisterScreen} />
      <StackAuth.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <StackAuth.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </StackAuth.Navigator>
  );
}

export const AppNavigator = () => {
  const { session, loading } = useAuth();

  if (loading) return null;

  const isAuthenticated = !!session;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
      ) : (
        <Stack.Screen name="App" component={AppLoggedInStack} />
      )}
    </Stack.Navigator>
  );
};
