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
      <Button title={t.auth.createAccount} onPress={() => navigation.navigate("SignUp")} style={styles.mb} />
      <Button variant="ghost" title={t.auth.loginExisting} onPress={() => navigation.navigate("PhoneLogin")} />
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  mb: {
    marginBottom: spacing.md
  }
});
