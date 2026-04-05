import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";
import { t } from "../strings";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { useAuth } from "../providers/AuthProvider";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import type { MainAppStackParamList } from "../navigation/AppNavigator";
import {
  completePostMatch,
  fetchPostMatchContext
} from "../services/postMatchFirestore";

type Props = NativeStackScreenProps<MainAppStackParamList, "PostMatch">;

export const PostMatchScreen: React.FC<Props> = ({ navigation, route }) => {
  const { mode, ownerBookingId, venueBookingId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({ title: t.bookings.postMatchTitle });
  }, [navigation]);

  const ctxQuery = useQuery({
    queryKey: ["postMatchCtx", mode, ownerBookingId, venueBookingId],
    queryFn: () => fetchPostMatchContext(mode, ownerBookingId, venueBookingId),
    enabled: Boolean(isFirebaseConfigured() && user?.id && (ownerBookingId || venueBookingId))
  });

  const submitMut = useMutation({
    mutationFn: () =>
      completePostMatch({
        mode,
        ownerUid: user!.id,
        ownerPublicId: user!.ownerId ?? deriveOwnerIdFromUid(user!.id),
        ownerBookingId,
        venueBookingId,
        rating,
        comment
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "")] });
      Toast.show({ type: "success", text1: t.bookings.postMatchSuccess });
      navigation.goBack();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "ALREADY_SETTLED") {
        Toast.show({ type: "info", text1: t.bookings.postMatchAlreadyDone });
      } else {
        Toast.show({ type: "error", text1: t.bookings.postMatchError });
      }
    }
  });

  if (!user?.id || !isFirebaseConfigured()) {
    return (
      <ScreenShell>
        <Text style={styles.err}>{t.fields.needFirebase}</Text>
      </ScreenShell>
    );
  }

  if (ctxQuery.isPending) {
    return (
      <ScreenShell>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenShell>
    );
  }

  const ctx = ctxQuery.data;
  if (!ctx) {
    return (
      <ScreenShell>
        <Text style={styles.err}>{t.bookings.postMatchNotFound}</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>{t.bookings.modalCancel}</Text>
        </Pressable>
      </ScreenShell>
    );
  }

  if (ctx.isSettled) {
    return (
      <ScreenShell>
        <View style={[styles.card, cardElevation(true)]}>
          <Text style={styles.doneTitle}>{t.bookings.postMatchAlreadyDone}</Text>
          <Text style={styles.meta}>
            {ctx.fieldName} · {ctx.date}
          </Text>
        </View>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>{t.bookings.modalCancel}</Text>
        </Pressable>
      </ScreenShell>
    );
  }

  const priceLabel =
    ctx.totalPrice > 0 ? ctx.totalPrice.toLocaleString("ar-IQ", { maximumFractionDigits: 2 }) : "—";

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sub}>{t.bookings.postMatchSubtitle}</Text>

        <View style={[styles.card, cardElevation(true)]}>
          <Text style={styles.fieldTitle}>{ctx.fieldName}</Text>
          <Text style={styles.meta}>{ctx.date}</Text>
          <Text style={styles.meta}>
            {t.bookings.totalPriceLabel}: {priceLabel} {t.bookings.currencyShort}
          </Text>
          <Text style={styles.playerLabel}>{t.bookings.ratePlayerLabel}</Text>
          <Text style={styles.playerName}>{ctx.playerDisplayName || t.bookings.noPlayerName}</Text>
        </View>

        <Text style={styles.section}>{t.bookings.starsHint}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={8} style={styles.starHit}>
              <Ionicons
                name={n <= rating ? "star" : "star-outline"}
                size={36}
                color={n <= rating ? colors.accent : colors.textSubtle}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{t.bookings.commentLabel}</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder={t.bookings.commentPlaceholder}
          placeholderTextColor={colors.textSubtle}
          textAlign="right"
          multiline
        />

        <Pressable
          style={[styles.primaryBtn, submitMut.isPending && styles.disabled]}
          disabled={submitMut.isPending}
          onPress={() => {
            if (rating < 1) {
              Toast.show({ type: "info", text1: t.bookings.postMatchPickRating });
              return;
            }
            submitMut.mutate();
          }}
        >
          {submitMut.isPending ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>{t.bookings.submitPostMatch}</Text>
          )}
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  err: { textAlign: "center", color: colors.danger, fontWeight: "700", padding: spacing.lg },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 22,
    marginBottom: spacing.md,
    fontWeight: "600"
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg
  },
  fieldTitle: { fontSize: 20, fontWeight: "900", textAlign: "right", color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, textAlign: "right", marginTop: 8, fontWeight: "600" },
  playerLabel: { fontSize: 13, color: colors.textSubtle, textAlign: "right", marginTop: spacing.md, fontWeight: "700" },
  playerName: { fontSize: 17, fontWeight: "800", textAlign: "right", color: colors.primaryDark, marginTop: 4 },
  section: { fontSize: 14, fontWeight: "800", textAlign: "right", marginBottom: spacing.sm, color: colors.text },
  starsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs
  },
  starHit: { padding: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: "top",
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    marginBottom: spacing.xl
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: "center"
  },
  primaryBtnText: { color: colors.textOnPrimary, fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.55 },
  doneTitle: { fontSize: 18, fontWeight: "900", textAlign: "right", color: colors.text },
  backBtn: { marginTop: spacing.md, alignSelf: "center", padding: spacing.md },
  backTxt: { color: colors.primary, fontWeight: "800" }
});
