import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";

function SkeletonLine({ width }: { width: string | number }) {
  const opacity = React.useRef(new Animated.Value(0.32)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.32, duration: 750, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.line, { width, opacity }]} />;
}

export const BookingSkeleton: React.FC = () => (
  <View style={[styles.card, cardElevation()]}>
    <View style={styles.row}>
      <SkeletonLine width="45%" />
      <SkeletonLine width={72} />
    </View>
    <SkeletonLine width="60%" />
    <View style={styles.rowBtns}>
      <SkeletonLine width={72} />
      <SkeletonLine width={72} />
    </View>
  </View>
);

export const BookingSkeletonList: React.FC = () => (
  <>
    <BookingSkeleton />
    <BookingSkeleton />
    <BookingSkeleton />
  </>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  rowBtns: {
    flexDirection: "row-reverse",
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border
  }
});
