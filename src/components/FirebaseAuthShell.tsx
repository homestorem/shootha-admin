import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { firebaseConfig, isFirebaseConfigured } from "../config/firebaseConfig";
import { nativeRecaptchaVerifierRef } from "../lib/firebaseRecaptchaRef";

/** reCAPTCHA لـ Firebase Phone على iOS/Android — الويب يستخدم `#recaptcha-container` داخل شاشة تسجيل الدخول */
function NativeRecaptchaModal() {
  if (Platform.OS === "web" || !isFirebaseConfigured()) return null;
  return (
    <FirebaseRecaptchaVerifierModal
      ref={(instance) => {
        nativeRecaptchaVerifierRef.current = instance;
      }}
      firebaseConfig={firebaseConfig}
      attemptInvisibleVerification
    />
  );
}

export function FirebaseAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.flex}>
      {children}
      <NativeRecaptchaModal />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  }
});
