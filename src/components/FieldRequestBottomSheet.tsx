import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../providers/SettingsProvider";
import { spacing } from "../theme/tokens";
import { makeFieldRequestBottomSheetStyles } from "./fieldRequestBottomSheetStyles";
import { t } from "../strings";
import type { AuthUser } from "../lib/authTypes";
import { formatWizardStep } from "../lib/arabicLocale";
import { DEFAULT_DIAL_CODE, hasResolvableContact } from "../lib/phoneDial";
import { InputLayer } from "./InputLayer";

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
  reqProvince: string;
  setReqProvince: (v: string) => void;
  reqFieldType: string;
  setReqFieldType: (v: string) => void;
  reqNotes: string;
  setReqNotes: (v: string) => void;
  reqPhone: string;
  setReqPhone: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
};

const STEPS = 3;
const IRAQ_PROVINCES = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "الأنبار",
  "كركوك",
  "صلاح الدين",
  "النجف",
  "كربلاء",
  "بابل",
  "ديالى",
  "واسط",
  "ميسان",
  "ذي قار",
  "المثنى",
  "القادسية",
  "دهوك",
  "السليمانية"
] as const;

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
  reqProvince,
  setReqProvince,
  reqFieldType,
  setReqFieldType,
  reqNotes,
  setReqNotes,
  reqPhone,
  setReqPhone,
  submitting,
  onSubmit
}: Props) {
  const { palette } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeFieldRequestBottomSheetStyles(palette), [palette]);
  /** ارتفاع الشاشة الفعلي — لا يتقلص مع الكيبورد (بعكس window) فيظهر الكيبورد فوق الورقة بدلاً من دفعها */
  const screenH = Dimensions.get("screen").height;
  const sheetHeight = Math.min(screenH * 0.92, screenH - insets.top - 8);
  const actionsPadBottom = spacing.lg + Math.max(insets.bottom, 12);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const backdrop = useSharedValue(0);
  const sheetY = useSharedValue(520);

  useEffect(() => {
    if (!visible) setKeyboardHeight(0);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const subHide = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [mounted]);
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
    Keyboard.dismiss();
    onClose();
  };

  const canNextFromStep0 = reqPersonName.trim().length > 0 && reqFieldName.trim().length > 0;
  const canNextFromStep1 =
    reqCity.trim().length > 0 && reqProvince.trim().length > 0 && reqFieldType.trim().length > 0;

  const goNext = () => {
    if (step === 0 && !canNextFromStep0) return;
    if (step === 1 && !canNextFromStep1) return;
    if (step < STEPS - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else requestClose();
  };

  const contactOk = hasResolvableContact(reqPhone, user?.phone);
  const heroColors =
    palette.scheme === "dark"
      ? (["rgba(18, 34, 28, 0.98)", "rgba(24, 48, 39, 0.96)", "rgba(31, 58, 47, 0.94)"] as const)
      : (["#2B6B58", "#357863", "#40856E"] as const);

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
      <View style={styles.kavRoot} pointerEvents="box-none">
        <View style={styles.root} pointerEvents="box-none">
          <Pressable
            style={[StyleSheet.absoluteFill, styles.backdropPressable]}
            onPress={requestClose}
            accessible={false}
            pointerEvents="box-none"
          >
            <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
          </Pressable>

          <Animated.View
            style={[styles.sheet, sheetStyle, { height: sheetHeight, maxHeight: sheetHeight }]}
            pointerEvents="auto"
          >
          <LinearGradient
            colors={heroColors}
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

          <View style={styles.sheetBody}>
            <InputLayer variant="fill">
              <ScrollView
                style={styles.sheetScroll}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets={false}
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
                  placeholderTextColor={palette.textSubtle}
                />
                <Text style={styles.inputLabel}>{t.bookings.fieldNameLabel}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.bookings.fieldNamePlaceholder}
                  value={reqFieldName}
                  textAlign="right"
                  onChangeText={setReqFieldName}
                  placeholderTextColor={palette.textSubtle}
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
                  placeholderTextColor={palette.textSubtle}
                />
                <Text style={styles.inputLabel}>{t.bookings.provinceLabel}</Text>
                <View style={styles.optionsWrap}>
                  {IRAQ_PROVINCES.map((province) => {
                    const active = reqProvince === province;
                    return (
                      <Pressable
                        key={province}
                        onPress={() => setReqProvince(province)}
                        style={({ pressed }) => [
                          styles.optionChip,
                          active && styles.optionChipActive,
                          pressed && styles.pressed
                        ]}
                      >
                        <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{province}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.inputLabel}>{t.bookings.fieldTypeLabel}</Text>
                <View style={styles.optionsWrap}>
                  {[
                    t.bookings.fieldTypeFootball,
                    t.bookings.fieldTypePadel,
                    t.bookings.fieldTypeBasketball,
                    t.bookings.fieldTypeVolleyball
                  ].map((fieldType) => {
                    const active = reqFieldType === fieldType;
                    return (
                      <Pressable
                        key={fieldType}
                        onPress={() => setReqFieldType(fieldType)}
                        style={({ pressed }) => [
                          styles.optionChip,
                          active && styles.optionChipActive,
                          pressed && styles.pressed
                        ]}
                      >
                        <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                          {fieldType}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.inputLabel}>{t.bookings.notesLabel}</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder={t.bookings.notesPlaceholder}
                  value={reqNotes}
                  textAlign="right"
                  multiline
                  onChangeText={setReqNotes}
                  placeholderTextColor={palette.textSubtle}
                />
              </View>
            )}

            {step === 2 && (
              <View>
                <Text style={styles.inputLabel}>{t.bookings.fieldRequestOwnerIdLabel}</Text>
                <View style={[styles.input, styles.readonlyIdBox]}>
                  <Text style={styles.readonlyIdText} selectable>
                    {ownerAccountId.trim() || "—"}
                  </Text>
                </View>
                <Text style={styles.idHintMuted}>{t.bookings.fieldRequestOwnerIdHint}</Text>

                <Text style={styles.inputLabel}>{t.bookings.contactPhoneLabel}</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.dialPrefix}>
                    <Text style={styles.dialPrefixText}>{DEFAULT_DIAL_CODE}</Text>
                  </View>
                  <View style={styles.phoneInputOuter}>
                    <TextInput
                      style={[styles.input, styles.phoneInputFlex]}
                      placeholder={t.bookings.contactPhonePlaceholderNational}
                      value={reqPhone}
                      textAlign="left"
                      keyboardType="phone-pad"
                      onChangeText={setReqPhone}
                      placeholderTextColor={palette.textSubtle}
                    />
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
                  <Text style={styles.summaryLine}>
                    {t.bookings.provinceLabel}: {reqProvince.trim() || "—"}
                  </Text>
                  <Text style={styles.summaryLine}>
                    {t.bookings.fieldTypeLabel}: {reqFieldType.trim() || "—"}
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

              <View style={[styles.actions, { paddingBottom: actionsPadBottom }]}>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              onPress={() => {
                if (submitting) return;
                goBack();
              }}
            >
              <Text style={styles.btnSecondaryText}>{step === 0 ? t.bookings.modalCancel : t.bookings.fieldRequestBack}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                (step === 0 && !canNextFromStep0) ||
                (step === 1 && !canNextFromStep1) ||
                (step === 2 && !contactOk)
                  ? styles.btnDisabled
                  : null,
                pressed && styles.pressed
              ]}
              onPress={() => {
                if (
                  submitting ||
                  (step === 0 && !canNextFromStep0) ||
                  (step === 1 && !canNextFromStep1) ||
                  (step === 2 && !contactOk)
                ) {
                  return;
                }
                handlePrimary();
              }}
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
            </InputLayer>
          </View>
        </Animated.View>
        </View>

        {keyboardHeight > 0 ? (
          <View style={[styles.keyboardAccessoryBar, { bottom: keyboardHeight }]} pointerEvents="box-none">
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={({ pressed }) => [styles.keyboardDoneBtn, pressed && { opacity: 0.75 }]}
              hitSlop={14}
            >
              <Text style={styles.keyboardDoneText}>{t.common.done}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
