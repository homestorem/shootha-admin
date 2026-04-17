import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { DailyScheduleGrid } from "../components/DailyScheduleGrid";
import { spacing } from "../theme/tokens";

export const DailyScheduleScreen: React.FC = () => {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm
        }
      }),
    []
  );

  return (
    <ScreenShell>
      <View style={styles.inner}>
        <DailyScheduleGrid showHeader />
      </View>
    </ScreenShell>
  );
};
