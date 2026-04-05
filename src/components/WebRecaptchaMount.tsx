import React from "react";
import { View, Platform } from "react-native";

/**
 * Expo Web: `nativeID` يُعرَف كـ `id` في DOM لـ RecaptchaVerifier("recaptcha-container").
 */
export function WebRecaptchaMount() {
  if (Platform.OS !== "web") return null;
  return <View nativeID="recaptcha-container" />;
}
