import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Text, TextInput, StyleSheet, Pressable, View } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../providers/AuthProvider";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { Button } from "../components/ui";
import { useSettings } from "../providers/SettingsProvider";
import { radius, spacing } from "../theme/tokens";
import { t } from "../strings";
import type { MainAppStackParamList } from "../navigation/mainAppStackTypes";

type Props = NativeStackScreenProps<MainAppStackParamList, "DeleteAccountOtp">;

export const DeleteAccountOtpScreen: React.FC<Props> = ({ route, navigation }) => {
  const { palette } = useSettings();
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
        inputOuter: {
          alignSelf: "stretch",
          minWidth: 0,
          marginBottom: spacing.lg,
          writingDirection: "ltr"
        },
        input: {
          borderWidth: 1.5,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingVertical: spacing.md + 2,
          fontSize: 22,
          fontWeight: "800",
          letterSpacing: 6,
          backgroundColor: palette.surfaceMuted,
          color: palette.text,
          width: "100%"
        },
        inputFocused: {
          borderColor: palette.primary
        },
        btn: {
          marginBottom: spacing.sm
        },
        backRow: {
          alignSelf: "center",
          paddingVertical: spacing.sm
        },
        backText: {
          fontSize: 14,
          fontWeight: "700",
          color: palette.primary
        },
        warnBox: {
          marginTop: spacing.lg,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: palette.dangerSoft
        },
        warnText: {
          textAlign: "center",
          fontSize: 13,
          fontWeight: "600",
          color: palette.danger
        }
      }),
    [palette]
  );
  const { phone } = route.params;
  const { confirmDeleteAccountOtp, cancelPendingDeleteAccount } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const otpComplete = code.length === 6;

  useFocusEffect(
    useCallback(() => {
      return () => {
        cancelPendingDeleteAccount();
      };
    }, [cancelPendingDeleteAccount])
  );

  const goBackToPhone = useCallback(() => {
    cancelPendingDeleteAccount();
    navigation.goBack();
  }, [cancelPendingDeleteAccount, navigation]);

  const handleConfirm = async () => {
    if (!otpComplete) return;
    setLoading(true);
    try {
      const { error } = await confirmDeleteAccountOtp(code);
      if (error === "invalid_code") {
        Toast.show({ type: "error", text1: t.auth.otpWrongCode });
        return;
      }
      if (error === "no_confirmation") {
        Toast.show({ type: "error", text1: t.errors.firebaseOtpSessionExpired });
        return;
      }
      if (error === "code_expired") {
        Toast.show({ type: "error", text1: t.auth.otpExpired });
        return;
      }
      if (error === "retry_limit_exceeded") {
        Toast.show({ type: "error", text1: t.auth.otpRetryLimit });
        return;
      }
      if (error === "delete_failed") {
        Toast.show({ type: "error", text1: t.deleteAccount.deleteFailed });
        return;
      }
      if (error) {
        Toast.show({ type: "error", text1: error });
        return;
      }
      Toast.show({ type: "success", text1: t.deleteAccount.success });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.common.error;
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title={t.deleteAccount.otpTitle}
      subtitle={t.deleteAccount.otpSubtitle}
      icon="keypad-outline"
    >
      <Text style={styles.phoneHint} numberOfLines={1}>
        {phone}
      </Text>
      <View style={styles.inputOuter}>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          keyboardType="number-pad"
          maxLength={6}
          placeholder={t.auth.otpPlaceholderDots}
          textAlign="center"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          placeholderTextColor={palette.textSubtle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      <Button
        title={t.deleteAccount.confirmDelete}
        onPress={() => void handleConfirm()}
        disabled={!otpComplete}
        loading={loading}
        variant="danger"
        style={styles.btn}
      />
      <Pressable style={styles.backRow} onPress={goBackToPhone} hitSlop={12}>
        <Text style={styles.backText}>{t.auth.changePhone}</Text>
      </Pressable>
      <View style={styles.warnBox}>
        <Text style={styles.warnText}>{t.deleteAccount.finalWarning}</Text>
      </View>
    </AuthScreenLayout>
  );
};
