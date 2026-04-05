import React, { useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { t } from "../../strings";
import { useAuth } from "../../providers/AuthProvider";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button, PhoneLocalField } from "../../components/ui";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/tokens";
import type { AuthStackParamList } from "../../navigation/authStackTypes";
import { buildE164FromNational } from "../../lib/phoneDial";
import { WebRecaptchaMount } from "../../components/WebRecaptchaMount";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneLogin">;

export const PhoneLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { requestPhoneOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const built = buildE164FromNational(phone);
    if (!built.ok) {
      Toast.show({ type: "error", text1: t.errors.phoneNationalInvalid });
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestPhoneOtp(built.e164);
      if (error) {
        const msg =
          error === "firebase_not_configured"
            ? t.errors.firebaseNotConfigured
            : error === "recaptcha_not_ready"
              ? t.errors.firebaseRecaptchaNotReady
              : error || t.errors.firebaseSendOtpFailed;
        throw new Error(msg);
      }
      navigation.navigate("OtpVerify", { phone: built.e164, flow: "login" });
      Toast.show({ type: "success", text1: t.auth.otpSentSuccess });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t.auth.otpSendFailed;
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      icon="log-in-outline"
      footer={
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.navigate("AuthHub")} hitSlop={12}>
            <Text style={styles.linkText}>{t.auth.backToAuthHub}</Text>
          </Pressable>
        </View>
      }
    >
      <WebRecaptchaMount />
      <PhoneLocalField
        label={t.auth.phoneLabel}
        icon="call-outline"
        placeholder={t.auth.phonePlaceholderNational}
        value={phone}
        onChangeText={setPhone}
      />
      <Button
        title={t.auth.sendOtp}
        onPress={handleSendOtp}
        disabled={!phone.trim()}
        loading={loading}
        style={styles.btn}
      />
      <View style={styles.signupRow}>
        <Text style={styles.signupHint}>{t.auth.noAccountYet}</Text>
        <Pressable onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.signupLink}>{t.auth.createAccount}</Text>
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
  signupRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: 6
  },
  signupHint: {
    fontSize: 14,
    color: colors.textMuted
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary
  }
});
