import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

type Props = {
  rows?: number;
  cols?: number;
};

/**
 * شبكة سداسية زخرفية تبدأ من الأعلى وتتلاشى للأسفل.
 * مخصّصة كطبقة جمالية غير تفاعلية فوق الهيدر.
 */
export function HoneycombTopFade({ rows = 7, cols = 9 }: Props) {
  const { width } = useWindowDimensions();
  const hexSize = 14;
  const hexW = hexSize * 1.15;
  const rowGap = -2;
  const colGap = -1;
  const totalRows = rows + 4;
  const regionHeight = totalRows * (hexW + rowGap) + 28;
  const colCount = Math.max(cols, Math.ceil(width / (hexW + colGap)) + 3);
  const rowItems = Array.from({ length: totalRows }, (_, i) => i);
  const colItems = Array.from({ length: colCount }, (_, i) => i);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={[styles.grid, { height: regionHeight }]}>
        {rowItems.map((row) => {
          const fade = Math.max(0, 1 - row / totalRows);
          const borderColor = `rgba(255,255,255,${0.04 + fade * 0.28})`;
          const isOffset = row % 2 === 1;
          return (
            <View
              key={`row-${row}`}
              style={[
                styles.row,
                {
                  marginTop: row === 0 ? 0 : rowGap,
                  marginLeft: isOffset ? hexW / 2 : 0
                }
              ]}
            >
              {colItems.map((col) => (
                <View
                  key={`hex-${row}-${col}`}
                  style={[
                    styles.hex,
                    {
                      width: hexW,
                      height: hexW,
                      borderColor,
                      marginLeft: col === 0 ? 0 : colGap
                    }
                  ]}
                />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0
  },
  grid: {
    overflow: "hidden"
  },
  row: {
    flexDirection: "row"
  },
  hex: {
    borderWidth: 0.8,
    borderRadius: 2,
    transform: [{ rotate: "30deg" }]
  }
});

