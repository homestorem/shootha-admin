import React, { useState } from "react";
import { Text, TextInput, StyleSheet, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { t } from "../../strings";
import { useAuth } from "../../providers/AuthProvider";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button } from "../../components/ui";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/tokens";
import type { AuthStackParamList } from "../../navigation/authStackTypes";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

export const OtpVerifyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone, flow, displayName } = route.params;
  const { verifyPhoneOtp } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const isRegister = flow === "register";
  const otpComplete = code.length === 6;

  const handleVerifyOtp = async () => {
    if (!otpComplete) return;
    setLoading(true);
    try {
      const { error } = await verifyPhoneOtp(phone, code);
      if (error === "invalid_code") {
        Toast.show({ type: "error", text1: t.auth.otpWrongCode });
        return;
      }
      if (error === "no_confirmation") {
        Toast.show({ type: "error", text1: t.errors.firebaseOtpSessionExpired });
        return;
      }
      if (error) throw new Error(error);
      Toast.show({
        type: "success",
        text1: isRegister ? t.auth.registerSuccess : t.auth.otpVerifySuccess
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t.auth.otpWrongCode;
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title={isRegister ? t.auth.otpScreenTitleRegister : t.auth.enterOtp}
      subtitle={isRegister ? t.auth.otpHeroSubtitleRegister : t.auth.otpHeroSubtitle}
      icon="keypad-outline"
    >
      <Text style={styles.phoneHint} numberOfLines={1}>
        {phone}
      </Text>
      {isRegister && displayName ? (
        <Text style={styles.nameHint} numberOfLines={1}>
          {t.auth.fullNameLabel}: {displayName}
        </Text>
      ) : null}
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        keyboardType="number-pad"
        maxLength={6}
        placeholder={t.auth.otpPlaceholderDots}
        textAlign="center"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        placeholderTextColor={colors.textSubtle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <Button
        title={isRegister ? t.auth.verifyOtpRegister : t.auth.verifyOtp}
        onPress={handleVerifyOtp}
        disabled={!otpComplete}
        loading={loading}
        style={styles.btn}
      />
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
        <Text style={styles.backText}>{t.auth.changePhone}</Text>
      </Pressable>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  phoneHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
    fontWeight: "600"
  },
  nameHint: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "center",
    marginBottom: spacing.md,
    fontWeight: "600"
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 24,
    marginBottom: spacing.xl,
    letterSpacing: 12,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontWeight: "800"
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surfaceCard
  },
  btn: {
    marginBottom: spacing.sm
  },
  backRow: {
    marginTop: spacing.lg,
    alignItems: "center"
  },
  backText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "700"
  }
});
