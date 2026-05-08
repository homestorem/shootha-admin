import React from "react";
import { StyleSheet, View } from "react-native";
import { useSettings } from "../providers/SettingsProvider";

type Props = {
  children: React.ReactNode;
};

export function AppBackground({ children }: Props) {
  const { palette } = useSettings();

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    flex: 1
  }
});
