import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";
import { t } from "../strings";
import type { AuthUser } from "../lib/authTypes";
import { formatWizardStep } from "../lib/arabicLocale";
import { DEFAULT_DIAL_CODE, hasResolvableContact } from "../lib/phoneDial";

type Props = {
  visible: boolean;
  onClose: () => void;
  user: AuthUser | null;
  /** معرّف المالك من الجلسة/الملف؛ للعرض فقط ويُرسل مع الطلب */
  ownerAccountId: string;
  reqPersonName: string;
  setReqPersonName: (v: string) => void;
  reqFieldName: string;
  setReqFieldName: (v: string) => void;
  reqCity: string;
  setReqCity: (v: string) => void;
  reqNotes: string;
  setReqNotes: (v: string) => void;
  reqPhone: string;
  setReqPhone: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
};

const STEPS = 3;

export function FieldRequestBottomSheet({
  visible,
  onClose,
  user,
  ownerAccountId,
  reqPersonName,
  setReqPersonName,
  reqFieldName,
  setReqFieldName,
  reqCity,
  setReqCity,
  reqNotes,
  setReqNotes,
  reqPhone,
  setReqPhone,
  submitting,
  onSubmit
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const backdrop = useSharedValue(0);
  const sheetY = useSharedValue(520);
  useEffect(() => {
    if (!visible || mounted) return;
    setMounted(true);
    setStep(0);
    backdrop.value = 0;
    sheetY.value = 520;
    requestAnimationFrame(() => {
      backdrop.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      sheetY.value = withSpring(0, { damping: 24, stiffness: 200 });
    });
  }, [visible, mounted, backdrop, sheetY]);

  useEffect(() => {
    if (visible || !mounted) return;
    backdrop.value = withTiming(0, { duration: 220 });
    sheetY.value = withTiming(560, { duration: 280, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(setMounted)(false);
    });
  }, [visible, mounted, backdrop, sheetY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.5
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }]
  }));

  const requestClose = () => {
    onClose();
  };

  const canNextFromStep0 = reqPersonName.trim().length > 0 && reqFieldName.trim().length > 0;

  const goNext = () => {
    if (step === 0 && !canNextFromStep0) return;
    if (step < STEPS - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else requestClose();
  };

  const contactOk = hasResolvableContact(reqPhone, user?.phone);

  const handlePrimary = () => {
    if (step < STEPS - 1) {
      goNext();
      return;
    }
    if (!contactOk) return;
    onSubmit();
  };

  const stepTitles = [t.bookings.fieldRequestStep1Title, t.bookings.fieldRequestStep2Title, t.bookings.fieldRequestStep3Title];

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={requestClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          <LinearGradient
            colors={[colors.primaryDeep, colors.primary, colors.heroEnd]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.handle} />
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="football-outline" size={28} color="#fff" />
              </View>
              <Pressable hitSlop={12} onPress={requestClose} style={styles.closeBtn}>
                <Ionicons name="close" size={26} color="rgba(255,255,255,0.95)" />
              </Pressable>
            </View>
            <Text style={styles.heroTitle}>{t.bookings.requestAddFieldTitle}</Text>
            <Text style={styles.heroSub}>{t.bookings.fieldRequestSheetSubtitle}</Text>
            <View style={styles.progressRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.progressSeg, step >= i && styles.progressSegActive]} />
              ))}
            </View>
            <Text style={styles.stepBadge}>
              {formatWizardStep(step + 1, STEPS, stepTitles[step])}
            </Text>
          </LinearGradient>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollPad}
          >
            {step === 0 && (
              <View>
                <Text style={styles.inputLabel}>{t.bookings.requesterNameLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.bookings.requesterNamePlaceholder}
                  value={reqPersonName}
                  textAlign="right"
                  onChangeText={setReqPersonName}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputLabel}>{t.bookings.fieldNameLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.bookings.fieldNamePlaceholder}
                  value={reqFieldName}
                  textAlign="right"
                  onChangeText={setReqFieldName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {step === 1 && (
              <View>
                <Text style={styles.inputLabel}>{t.bookings.cityLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.bookings.cityPlaceholder}
                  value={reqCity}
                  textAlign="right"
                  onChangeText={setReqCity}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputLabel}>{t.bookings.notesLabel}</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder={t.bookings.notesPlaceholder}
                  value={reqNotes}
                  textAlign="right"
                  multiline
                  onChangeText={setReqNotes}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={styles.inputLabel}>{t.bookings.fieldRequestOwnerIdLabel}</Text>
                <TextInput
                  style={[styles.input, styles.inputReadonly]}
                  value={ownerAccountId.trim() || "—"}
                  editable={false}
                  selectTextOnFocus
                  textAlign="right"
                />
                <Text style={styles.idHintMuted}>{t.bookings.fieldRequestOwnerIdHint}</Text>

                <Text style={styles.inputLabel}>{t.bookings.contactPhoneLabel}</Text>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={[styles.input, styles.phoneInputFlex]}
                    placeholder={t.bookings.contactPhonePlaceholderNational}
                    value={reqPhone}
                    textAlign="right"
                    keyboardType="phone-pad"
                    onChangeText={setReqPhone}
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.dialPrefix}>
                    <Text style={styles.dialPrefixText}>{DEFAULT_DIAL_CODE}</Text>
                  </View>
                </View>
                <Text style={styles.idHintMuted}>{t.bookings.requestIdSentHint}</Text>

                <View style={styles.summary}>
                  <Text style={styles.summaryTitle}>{t.bookings.fieldRequestSummaryTitle}</Text>
                  <Text style={styles.summaryLine}>
                    {t.bookings.requesterNameLabel}: {reqPersonName.trim() || "—"}
                  </Text>
                  <Text style={styles.summaryLine}>
                    {t.bookings.fieldNameLabel}: {reqFieldName.trim() || "—"}
                  </Text>
                  {(reqCity.trim() || reqNotes.trim()) && (
                    <Text style={styles.summaryLine} numberOfLines={3}>
                      {reqCity.trim() ? `${t.bookings.cityLabel}: ${reqCity.trim()}` : ""}
                      {reqCity.trim() && reqNotes.trim() ? "\n" : ""}
                      {reqNotes.trim() ? `${t.bookings.notesLabel}: ${reqNotes.trim()}` : ""}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              onPress={goBack}
              disabled={submitting}
            >
              <Text style={styles.btnSecondaryText}>{step === 0 ? t.bookings.modalCancel : t.bookings.fieldRequestBack}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                (step === 0 && !canNextFromStep0) || (step === 2 && !contactOk) ? styles.btnDisabled : null,
                pressed && styles.pressed
              ]}
              onPress={handlePrimary}
              disabled={submitting || (step === 0 && !canNextFromStep0) || (step === 2 && !contactOk)}
            >
              {submitting && step === STEPS - 1 ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {step < STEPS - 1 ? t.bookings.fieldRequestNext : t.bookings.submitFieldRequest}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.text
  },
  sheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: "92%",
    overflow: "hidden",
    shadowColor: "#0c1222",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 24
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.lg + 2
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 14
  },
  heroTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  closeBtn: {
    padding: 6
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "right",
    marginBottom: 6
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "right",
    lineHeight: 21,
    marginBottom: 16
  },
  progressRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginBottom: 10
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)"
  },
  progressSegActive: {
    backgroundColor: "#FFFFFF"
  },
  stepBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    textAlign: "right"
  },
  scrollPad: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12
  },
  inputLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 6,
    fontWeight: "700"
  },
  phoneRow: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    marginBottom: spacing.md + 2,
    gap: 8
  },
  phoneInputFlex: {
    flex: 1,
    marginBottom: 0
  },
  dialPrefix: {
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted
  },
  dialPrefixText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 16,
    marginBottom: spacing.md + 2,
    backgroundColor: colors.surfaceMuted,
    color: colors.text
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  inputReadonly: {
    opacity: 1,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted
  },
  idHintMuted: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: 10
  },
  summary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    marginBottom: 10
  },
  summaryLine: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 4
  },
  actions: {
    flexDirection: "row-reverse",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: 22,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  btnSecondary: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textSecondary
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.primary
  },
  btnDisabled: {
    opacity: 0.45
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  pressed: {
    opacity: 0.92
  }
});
