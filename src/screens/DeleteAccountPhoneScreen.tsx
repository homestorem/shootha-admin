import React, { useCallback, useMemo, useState } from "react";
import { Text, StyleSheet, View, Pressable } from "react-native";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { t } from "../strings";
import { useAuth } from "../providers/AuthProvider";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { Button, PhoneLocalField } from "../components/ui";
import { useSettings } from "../providers/SettingsProvider";
import { spacing } from "../theme/tokens";
import { normalizeNationalDigits } from "../lib/phoneDial";
import type { MainAppStackParamList } from "../navigation/mainAppStackTypes";

type Props = NativeStackScreenProps<MainAppStackParamList, "DeleteAccountPhone">;

export const DeleteAccountPhoneScreen: React.FC<Props> = ({ navigation }) => {
  const { palette } = useSettings();
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
          color: palette.primary
        }
      }),
    [palette]
  );
  const { requestDeleteAccountOtp, cancelPendingDeleteAccount } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cancelPendingDeleteAccount();
    }, [cancelPendingDeleteAccount])
  );

  const handleSendOtp = async () => {
    const localPhone = normalizeNationalDigits(phone);
    if (localPhone.length < 8) {
      Toast.show({ type: "error", text1: t.errors.phoneNationalInvalid });
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestDeleteAccountOtp(localPhone);
      if (error === "phone_mismatch") {
        Toast.show({ type: "error", text1: t.deleteAccount.phoneMismatch });
        return;
      }
      if (error === "firebase_not_configured") {
        Toast.show({ type: "error", text1: t.errors.firebaseNotConfigured });
        return;
      }
      if (error === "rate_limited") {
        Toast.show({ type: "error", text1: t.auth.resendAfterOneMinute });
        return;
      }
      if (error === "no_user") {
        Toast.show({ type: "error", text1: t.deleteAccount.noSession });
        return;
      }
      if (error) {
        Toast.show({ type: "error", text1: error || t.errors.firebaseSendOtpFailed });
        return;
      }
      navigation.navigate("DeleteAccountOtp", { phone: localPhone });
      Toast.show({ type: "success", text1: t.auth.otpSentSuccess });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.auth.otpSendFailed;
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title={t.deleteAccount.title}
      subtitle={t.deleteAccount.phoneSubtitle}
      icon="trash-outline"
      footer={
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.linkText}>{t.deleteAccount.backToProfile}</Text>
          </Pressable>
        </View>
      }
    >
      <PhoneLocalField
        label={t.auth.phoneLabel}
        icon="call-outline"
        placeholder={t.auth.phonePlaceholderNational}
        value={phone}
        onChangeText={setPhone}
      />
      <Button
        title={t.deleteAccount.sendOtp}
        onPress={() => void handleSendOtp()}
        disabled={!phone.trim()}
        loading={loading}
        style={styles.btn}
      />
    </AuthScreenLayout>
  );
};
