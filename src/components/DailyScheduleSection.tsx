import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "../lib/dayjs";
import { t } from "../strings";
import type { MainAppStackParamList } from "../navigation/mainAppStackTypes";
import { spacing } from "../theme/tokens";
import { useSettings } from "../providers/SettingsProvider";
import { NeonHeroHeader } from "./ui/NeonHeroHeader";

export const DailyScheduleSection: React.FC = () => {
  const { palette } = useSettings();
  const navigation = useNavigation();
  const today = dayjs();
  const dateLine = today.format("DD MMMM");

  const openFullSchedule = () => {
    const parent = navigation.getParent() as NativeStackNavigationProp<MainAppStackParamList> | undefined;
    parent?.navigate("DailySchedule");
  };

  const subText = `${t.schedule.openHint} — ${dateLine}`;

  return (
    <Pressable
      onPress={openFullSchedule}
      style={({ pressed }) => [styles.press, pressed && { opacity: 0.94, transform: [{ scale: 0.992 }] }]}
      android_ripple={{ color: "rgba(255,255,255,0.25)" }}
    >
      <NeonHeroHeader
        palette={palette}
        title={t.schedule.title}
        subtitle={subText}
        compact
        rightAccessory={<Ionicons name="calendar" size={26} color="#FFFFFF" />}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  press: {
    marginBottom: spacing.lg
  }
});
