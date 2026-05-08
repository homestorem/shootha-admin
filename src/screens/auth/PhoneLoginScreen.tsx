import React, { useMemo, useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../providers/AuthProvider";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button, PhoneLocalField } from "../../components/ui";
import { useSettings } from "../../providers/SettingsProvider";
import { spacing } from "../../theme/tokens";
import type { AuthStackParamList } from "../../navigation/authStackTypes";
import { normalizeNationalDigits } from "../../lib/phoneDial";
import { PRIMARY_HERO_GRADIENT_DARK, PRIMARY_HERO_GRADIENT_LIGHT } from "../../theme/primaryHeroGradient";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneLogin">;

export const PhoneLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { palette, tr } = useSettings();
  const authGreen = palette.scheme === "dark" ? palette.primary : palette.primaryDark;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          marginBottom: spacing.sm,
          shadowColor: palette.scheme === "dark" ? "#00C853" : "#0A5C36",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: palette.scheme === "dark" ? 0.34 : 0.28,
          shadowRadius: 16,
          elevation: 10
        },
        footerLinks: {
          alignItems: "center",
          paddingVertical: spacing.sm
        },
        linkText: {
          fontSize: 14,
          fontWeight: "700",
          color: authGreen
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
          color: palette.textMuted
        },
        signupLink: {
          fontSize: 14,
          fontWeight: "800",
          color: authGreen
        }
      }),
    [palette, authGreen]
  );
  const { requestPhoneOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const localPhone = normalizeNationalDigits(phone);
    if (localPhone.length < 8) {
      Toast.show({ type: "error", text1: tr("errors.phoneNationalInvalid") });
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestPhoneOtp(localPhone);
      if (error) {
        const msg =
          error === "firebase_not_configured"
            ? tr("errors.firebaseNotConfigured")
            : error === "invalid_phone_format"
              ? tr("errors.phoneNationalInvalid")
              : error === "rate_limited"
                ? tr("auth.resendAfterOneMinute")
              : error || tr("errors.firebaseSendOtpFailed");
        throw new Error(msg);
      }
      navigation.navigate("OtpVerify", { phone: localPhone, flow: "login" });
      Toast.show({ type: "success", text1: tr("auth.otpSentSuccess") });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : tr("auth.otpSendFailed");
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title={tr("auth.loginTitle")}
      icon="log-in-outline"
      footer={
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.navigate("AuthHub")} hitSlop={12}>
            <Text style={styles.linkText}>{tr("auth.backToAuthHub")}</Text>
          </Pressable>
        </View>
      }
    >
      <PhoneLocalField
        label={tr("auth.phoneLabel")}
        icon="call-outline"
        placeholder={tr("auth.phonePlaceholderNational")}
        value={phone}
        onChangeText={setPhone}
        showDialCode={false}
      />
      <Button
        title={tr("auth.sendOtp")}
        onPress={handleSendOtp}
        disabled={!phone.trim()}
        loading={loading}
        style={styles.btn}
        primaryGradientColors={palette.scheme === "dark" ? PRIMARY_HERO_GRADIENT_DARK : PRIMARY_HERO_GRADIENT_LIGHT}
      />
      <View style={styles.signupRow}>
        <Text style={styles.signupHint}>{tr("auth.noAccountYet")}</Text>
        <Pressable onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.signupLink}>{tr("auth.createAccount")}</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
};
