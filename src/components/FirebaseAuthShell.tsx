import React from "react";
import { View, StyleSheet } from "react-native";

/** غلاف جذر للتطبيق داخل AuthProvider */
export function FirebaseAuthShell({ children }: { children: React.ReactNode }) {
  return <View style={styles.flex}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  }
});
