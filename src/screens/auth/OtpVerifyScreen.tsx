import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, TextInput, StyleSheet, Pressable, View } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../providers/AuthProvider";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button } from "../../components/ui";
import { useSettings } from "../../providers/SettingsProvider";
import { radius, spacing } from "../../theme/tokens";
import type { AuthStackParamList } from "../../navigation/authStackTypes";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

export const OtpVerifyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { palette, tr } = useSettings();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        phoneHint: {
          fontSize: 13,
          color: palette.textMuted,
          textAlign: "center",
          marginBottom: spacing.sm,
          fontWeight: "600"
        },
        nameHint: {
          fontSize: 12,
          color: palette.textSubtle,
          textAlign: "center",
          marginBottom: spacing.md,
          fontWeight: "600"
        },
        inputOuter: {
          alignSelf: "stretch",
          minWidth: 0,
          marginBottom: spacing.lg,
          writingDirection: "ltr"
        },
        hiddenInput: {
          position: "absolute",
          opacity: 0
        },
        otpRow: {
          flexDirection: "row",
          justifyContent: "center",
          gap: spacing.sm
        },
        otpBox: {
          width: 40,
          height: 56,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.2)",
          backgroundColor: "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center"
        },
        otpBoxActive: {
          borderColor: "#00C853",
          shadowColor: "#00C853",
          shadowOpacity: 0.35,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 8
        },
        otpDigit: {
          fontSize: 22,
          fontWeight: "800",
          color: palette.text
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
          color: palette.primary,
          fontWeight: "700"
        },
        resendWrap: {
          marginTop: spacing.md,
          alignItems: "center"
        },
        resendText: {
          fontSize: 13,
          color: palette.textSubtle,
          fontWeight: "700"
        },
        resendAction: {
          fontSize: 14,
          color: palette.primary,
          fontWeight: "800"
        }
      }),
    [palette]
  );
  const { phone, flow, displayName } = route.params;
  const { verifyPhoneOtp, requestPhoneOtp } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const otpRef = useRef<TextInput>(null);

  const isRegister = flow === "register";
  const otpDigits = 4;
  const otpComplete = code.length === otpDigits;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const mmss = `00:${String(Math.max(0, resendIn)).padStart(2, "0")}`;

  const handleVerifyOtp = async () => {
    if (!otpComplete) return;
    setLoading(true);
    try {
      const { error } = await verifyPhoneOtp(phone, code);
      if (error === "invalid_code") {
        Toast.show({ type: "error", text1: tr("auth.otpWrongCode") });
        return;
      }
      if (error === "no_confirmation") {
        Toast.show({ type: "error", text1: tr("errors.firebaseOtpSessionExpired") });
        return;
      }
      if (error === "code_expired") {
        Toast.show({ type: "error", text1: tr("auth.otpExpired") });
        return;
      }
      if (error === "retry_limit_exceeded") {
        Toast.show({ type: "error", text1: tr("auth.otpRetryLimit") });
        return;
      }
      if (error) throw new Error(error);
      Toast.show({
        type: "success",
        text1: isRegister ? tr("auth.registerSuccess") : tr("auth.otpVerifySuccess")
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : tr("auth.otpWrongCode");
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    const { error } = await requestPhoneOtp(phone, isRegister && displayName ? { pendingRegisterDisplayName: displayName } : undefined);
    if (error) {
      const msg =
        error === "rate_limited"
          ? tr("auth.resendAfterOneMinute")
          : error === "invalid_phone_format"
            ? tr("errors.phoneNationalInvalid")
            : error;
      Toast.show({ type: "error", text1: msg });
      return;
    }
    setResendIn(60);
    setCode("");
    Toast.show({ type: "success", text1: tr("auth.otpSentSuccess") });
  };

  return (
    <AuthScreenLayout
      title={isRegister ? tr("auth.otpScreenTitleRegister") : tr("auth.enterOtp")}
      subtitle={isRegister ? tr("auth.otpHeroSubtitleRegister") : tr("auth.otpHeroSubtitle")}
      icon="keypad-outline"
    >
      <Text style={styles.phoneHint} numberOfLines={1}>
        {phone}
      </Text>
      {isRegister && displayName ? (
        <Text style={styles.nameHint} numberOfLines={1}>
          {tr("auth.fullNameLabel")}: {displayName}
        </Text>
      ) : null}
      <View style={styles.inputOuter}>
        <TextInput
          ref={otpRef}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          maxLength={otpDigits}
          textAlign="center"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, otpDigits))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable style={styles.otpRow} onPress={() => otpRef.current?.focus()}>
          {Array.from({ length: otpDigits }, (_, i) => i).map((i) => {
            const d = code[i] ?? "";
            const active = focused && (code.length === i || (code.length >= otpDigits && i === otpDigits - 1));
            return (
              <View key={i} style={[styles.otpBox, active && styles.otpBoxActive]}>
                <Text style={styles.otpDigit}>{d}</Text>
              </View>
            );
          })}
        </Pressable>
      </View>
      <Button
        title={isRegister ? tr("auth.verifyOtpRegister") : tr("auth.verifyOtpConfirm")}
        onPress={handleVerifyOtp}
        disabled={!otpComplete}
        loading={loading}
        style={styles.btn}
      />
      <View style={styles.resendWrap}>
        {resendIn > 0 ? (
          <Text style={styles.resendText}>
            {tr("auth.resendAfter")} {mmss}
          </Text>
        ) : (
          <Pressable onPress={() => void handleResend()} hitSlop={12}>
            <Text style={styles.resendAction}>{tr("auth.resendOtp")}</Text>
          </Pressable>
        )}
      </View>
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
        <Text style={styles.backText}>{tr("auth.changePhone")}</Text>
      </Pressable>
    </AuthScreenLayout>
  );
};
