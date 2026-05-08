import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  type TextStyle
} from "react-native";

const SPLASH_GREEN = "#228B22";
const FADE_MS = 320;
/** أقل مدة عرض للسبلاش (ثوانٍ) */
const MIN_SPLASH_MS = 3000;

type Props = {
  onComplete: () => void;
  /** يصبح true عندما يكون التطبيق جاهزاً (مثلاً انتهاء تهيئة Firebase Auth) */
  appReady: boolean;
};

/**
 * سبلاش مخصّص بدون صور — iOS/Android فقط؛ على الويب يُستدعى onComplete فوراً.
 */
export function AnimatedLogoSplash({ onComplete, appReady }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(false);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  const finishOnce = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (Platform.OS === "web") {
      finishOnce();
      return undefined;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true
    }).start();

    minTimerRef.current = setTimeout(() => {
      minTimerRef.current = null;
      setMinSplashElapsed(true);
    }, MIN_SPLASH_MS);

    return () => {
      if (minTimerRef.current != null) {
        clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
    };
  }, [finishOnce, opacity]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (minSplashElapsed && appReady) {
      finishOnce();
    }
  }, [minSplashElapsed, appReady, finishOnce]);

  if (Platform.OS === "web") {
    return null;
  }

  const screenH = Dimensions.get("window").height;
  const bottomBandH = Math.round(screenH / 3);

  const logoMarkStyle = {
    alignItems: "center" as const
  };

  const logoPrimaryStyle: TextStyle = {
    color: "#FFFFFF",
    fontSize: 40,
    textAlign: "center",
    writingDirection: "ltr",
    letterSpacing: 0,
    fontFamily: "Cairo_700Bold",
    includeFontPadding: false
  };

  const logoSecondaryStyle: TextStyle = {
    color: "rgba(255,255,255,0.92)",
    fontSize: 22,
    textAlign: "center",
    writingDirection: "ltr",
    letterSpacing: 0.5,
    fontFamily: "Cairo_700Bold",
    includeFontPadding: false,
    marginTop: 4
  };

  return (
    <View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.fill, { opacity }]}>
        <View style={styles.centerWrap}>
          <View style={logoMarkStyle}>
            <Text style={logoPrimaryStyle}>SHOOT'HA</Text>
            <Text style={logoSecondaryStyle}>Business</Text>
          </View>
        </View>
        <View style={[styles.bottomBand, { height: bottomBandH }]}>
          <Text style={styles.tagline}>
            أضف ملعبك في ثوانٍ
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_GREEN,
    zIndex: 99999,
    elevation: 99999
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_GREEN
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  bottomBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  tagline: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 26,
    opacity: 0.95,
    writingDirection: "rtl",
    textAlign: "center"
  }
});
