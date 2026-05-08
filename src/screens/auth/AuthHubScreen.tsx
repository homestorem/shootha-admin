import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthScreenLayout } from "../../components/AuthScreenLayout";
import { Button } from "../../components/ui";
import { spacing } from "../../theme/tokens";
import { t } from "../../strings";
import type { AuthStackParamList } from "../../navigation/authStackTypes";
import { StyleSheet } from "react-native";

type Props = NativeStackScreenProps<AuthStackParamList, "AuthHub">;

export const AuthHubScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <AuthScreenLayout title={t.auth.authHubTitle} subtitle={t.auth.authHubSubtitle} icon="football-outline">
      <Button title={t.auth.createAccount} onPress={() => navigation.navigate("SignUp")} style={styles.primaryBtn} />
      <Button variant="ghost" title={t.auth.loginExisting} onPress={() => navigation.navigate("PhoneLogin")} style={styles.ghostBtn} />
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  primaryBtn: {
    marginBottom: spacing.md,
    shadowColor: "#0A5C36",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10
  },
  ghostBtn: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8
  }
});
