import React, { useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { t } from "../../strings";
import { useAuth } from "../../providers/AuthProvider";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button, TextField, PhoneLocalField } from "../../components/ui";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/tokens";
import type { AuthStackParamList } from "../../navigation/authStackTypes";
import { buildE164FromNational } from "../../lib/phoneDial";
import { WebRecaptchaMount } from "../../components/WebRecaptchaMount";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

export const PhoneRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { requestPhoneOtp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      Toast.show({ type: "error", text1: t.auth.nameTooShort });
      return;
    }

    const built = buildE164FromNational(phone);
    if (!built.ok) {
      Toast.show({ type: "error", text1: t.errors.phoneNationalInvalid });
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestPhoneOtp(built.e164, { pendingRegisterDisplayName: name });
      if (error) {
        const msg =
          error === "firebase_not_configured"
            ? t.errors.firebaseNotConfigured
            : error === "recaptcha_not_ready"
              ? t.errors.firebaseRecaptchaNotReady
              : error || t.errors.firebaseSendOtpFailed;
        throw new Error(msg);
      }
      navigation.navigate("OtpVerify", {
        phone: built.e164,
        flow: "register",
        displayName: name
      });
      Toast.show({ type: "success", text1: t.auth.otpSentSuccess });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t.auth.otpSendFailed;
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = displayName.trim().length >= 2 && phone.trim().length > 0;

  return (
    <AuthScreenLayout
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitlePhoneName}
      icon="person-add-outline"
      footer={
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.navigate("AuthHub")} hitSlop={12}>
            <Text style={styles.linkText}>{t.auth.backToAuthHub}</Text>
          </Pressable>
        </View>
      }
    >
      <WebRecaptchaMount />
      <TextField
        label={t.auth.fullNameLabel}
        icon="person-outline"
        placeholder={t.auth.fullNamePlaceholder}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
      />
      <PhoneLocalField
        label={t.auth.phoneLabel}
        icon="call-outline"
        placeholder={t.auth.phonePlaceholderNational}
        value={phone}
        onChangeText={setPhone}
      />
      <Button
        title={t.auth.registerSubmitContinue}
        onPress={handleSendOtp}
        disabled={!canSubmit}
        loading={loading}
        style={styles.btn}
      />
      <View style={styles.loginRow}>
        <Text style={styles.loginHint}>{t.auth.alreadyHaveAccount}</Text>
        <Pressable onPress={() => navigation.navigate("PhoneLogin")}>
          <Text style={styles.loginLink}>{t.auth.loginExisting}</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  btn: {
    marginBottom: spacing.sm
  },
  footerLinks: {
    alignItems: "center",
    paddingVertical: spacing.sm
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary
  },
  loginRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: 6
  },
  loginHint: {
    fontSize: 14,
    color: colors.textMuted
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary
  }
});
