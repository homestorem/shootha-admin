import React, { useMemo, useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../providers/AuthProvider";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button, TextField, PhoneLocalField } from "../../components/ui";
import { useSettings } from "../../providers/SettingsProvider";
import { spacing } from "../../theme/tokens";
import type { AuthStackParamList } from "../../navigation/authStackTypes";
import { normalizeNationalDigits } from "../../lib/phoneDial";
import { PRIMARY_HERO_GRADIENT_DARK, PRIMARY_HERO_GRADIENT_LIGHT } from "../../theme/primaryHeroGradient";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

export const PhoneRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { palette, tr } = useSettings();
  const authGreen = palette.scheme === "dark" ? palette.primary : palette.primaryDark;
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          color: authGreen
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
          color: palette.textMuted
        },
        loginLink: {
          fontSize: 14,
          fontWeight: "800",
          color: authGreen
        }
      }),
    [palette, authGreen]
  );
  const { requestPhoneOtp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      Toast.show({ type: "error", text1: tr("auth.nameTooShort") });
      return;
    }

    const localPhone = normalizeNationalDigits(phone);
    if (localPhone.length < 8) {
      Toast.show({ type: "error", text1: tr("errors.phoneNationalInvalid") });
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestPhoneOtp(localPhone, { pendingRegisterDisplayName: name });
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
      navigation.navigate("OtpVerify", {
        phone: localPhone,
        flow: "register",
        displayName: name
      });
      Toast.show({ type: "success", text1: tr("auth.otpSentSuccess") });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : tr("auth.otpSendFailed");
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = displayName.trim().length >= 2 && phone.trim().length > 0;

  return (
    <AuthScreenLayout
      title={tr("auth.registerTitle")}
      subtitle={tr("auth.registerSubtitlePhoneName")}
      icon="person-add-outline"
      footer={
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.navigate("AuthHub")} hitSlop={12}>
            <Text style={styles.linkText}>{tr("auth.backToAuthHub")}</Text>
          </Pressable>
        </View>
      }
    >
      <TextField
        label={tr("auth.fullNameLabel")}
        icon="person-outline"
        placeholder={tr("auth.fullNamePlaceholder")}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
      />
      <PhoneLocalField
        label={tr("auth.phoneLabel")}
        icon="call-outline"
        placeholder={tr("auth.phonePlaceholderNational")}
        value={phone}
        onChangeText={setPhone}
        showDialCode={false}
      />
      <Button
        title={tr("auth.registerSubmitContinue")}
        onPress={handleSendOtp}
        disabled={!canSubmit}
        loading={loading}
        style={styles.btn}
        primaryGradientColors={palette.scheme === "dark" ? PRIMARY_HERO_GRADIENT_DARK : PRIMARY_HERO_GRADIENT_LIGHT}
      />
      <View style={styles.loginRow}>
        <Text style={styles.loginHint}>{tr("auth.alreadyHaveAccount")}</Text>
        <Pressable onPress={() => navigation.navigate("PhoneLogin")}>
          <Text style={styles.loginLink}>{tr("auth.loginExisting")}</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
};
