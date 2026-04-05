import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { t } from "../strings";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled" | "confirmed";

export type Booking = {
  id: string;
  player_name: string | null;
  field_name?: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  date: string;
  total_price?: number | null;
  duration_label?: string | null;
  created_by?: string | null;
  /** مصدر الحجز من Firestore */
  source_kind?: "manual" | "player";
  services_summary?: string | null;
  /** من مجموعة bookings (داشبورد) */
  booking_kind?: "owner" | "venue";
  field_size?: string | null;
  payment_method?: string | null;
  phone?: string | null;
  settled?: boolean;
};

type Props = {
  booking: Booking;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** بعد انتهاء وقت الحجز — تقييم وإنهاء */
  onPostMatch?: () => void;
  /** تم التمرير إليه من إشعار */
  highlighted?: boolean;
};

export const BookingCard: React.FC<Props> = ({
  booking,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onPostMatch,
  highlighted
}) => {
  const statusConfig: Record<
    BookingStatus,
    {
      label: string;
      color: string;
      background: string;
    }
  > = {
    pending: {
      label: t.bookings.statusPending,
      color: "#92400E",
      background: colors.accentMuted
    },
    approved: {
      label: t.bookings.statusApproved,
      color: colors.primaryDark,
      background: colors.primarySoft
    },
    rejected: {
      label: t.bookings.statusRejected,
      color: "#991B1B",
      background: colors.dangerSoft
    },
    cancelled: {
      label: t.bookings.statusCancelled,
      color: colors.textSecondary,
      background: colors.surfaceMuted
    },
    confirmed: {
      label: t.bookings.statusConfirmed,
      color: colors.primaryDark,
      background: colors.primarySoft
    }
  };

  const status = statusConfig[booking.status];

  const price =
    booking.total_price != null && !Number.isNaN(Number(booking.total_price))
      ? Number(booking.total_price).toLocaleString("ar-SA", { maximumFractionDigits: 2 })
      : null;

  const createdLabel =
    booking.booking_kind === "venue"
      ? t.bookings.dashboardBookingSource
      : booking.source_kind === "manual" || booking.created_by === "owner"
        ? t.bookings.sourceManualLabel
        : booking.player_name
          ? `${t.bookings.sourcePlayerPrefix}${booking.player_name}`
          : t.bookings.createdByPlayer;

  return (
    <View
      style={[
        styles.card,
        cardElevation(true),
        booking.status === "pending" && styles.cardPendingAccent,
        highlighted && styles.cardHighlighted
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.fieldName}>{booking.field_name || "—"}</Text>
          <Text style={styles.playerName}>{booking.player_name || t.bookings.noPlayerName}</Text>
        </View>
        <View style={styles.headerPills}>
          {booking.settled ? (
            <View style={[styles.settledPill, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={styles.settledPillText}>{t.bookings.settledBadge}</Text>
            </View>
          ) : null}
          <View style={[styles.statusPill, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.dateText}>{booking.date}</Text>
      <Text style={styles.timeText}>
        {booking.start_time} — {booking.end_time}
      </Text>
      {booking.duration_label ? (
        <Text style={styles.metaLine}>
          {t.bookings.durationLabel}: {booking.duration_label}
        </Text>
      ) : null}
      {price != null ? (
        <Text style={styles.metaLine}>
          {t.bookings.totalPriceLabel}: {price} {t.bookings.currencyShort}
        </Text>
      ) : null}
      {booking.field_size ? (
        <Text style={styles.metaLine}>
          {t.bookings.fieldSizeLabel}: {booking.field_size}
        </Text>
      ) : null}
      {booking.payment_method ? (
        <Text style={styles.metaLine}>
          {t.bookings.paymentMethodLabel}: {booking.payment_method}
        </Text>
      ) : null}
      {booking.phone ? (
        <Text style={styles.metaLine}>
          {t.bookings.playerPhoneLabel}: {booking.phone}
        </Text>
      ) : null}
      {booking.created_by || booking.source_kind || booking.booking_kind ? (
        <Text style={styles.createdBy}>{createdLabel}</Text>
      ) : null}
      {booking.services_summary ? (
        <Text style={styles.metaLine}>
          {t.bookings.servicesLineLabel}: {booking.services_summary}
        </Text>
      ) : null}
      {(onEdit || onDelete || onPostMatch) && (
        <View style={styles.ownerActions}>
          {onPostMatch ? (
            <Pressable
              onPress={onPostMatch}
              style={({ pressed }) => [styles.smallBtnAccent, pressed && styles.actionPressed]}
            >
              <Text style={styles.smallBtnAccentText}>{t.bookings.endMatchButton}</Text>
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable onPress={onEdit} style={({ pressed }) => [styles.smallBtn, pressed && styles.actionPressed]}>
              <Text style={styles.smallBtnText}>{t.bookings.editBookingShort}</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable onPress={onDelete} style={({ pressed }) => [styles.smallBtnDanger, pressed && styles.actionPressed]}>
              <Text style={styles.smallBtnDangerText}>{t.bookings.deleteBookingShort}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {booking.status === "pending" && (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.reject, pressed && styles.actionPressed]}
            onPress={onReject}
          >
            <Text style={styles.actionText}>{t.bookings.reject}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.approve, pressed && styles.actionPressed]}
            onPress={onApprove}
          >
            <Text style={[styles.actionText, styles.approveText]}>{t.bookings.approve}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  cardPendingAccent: {
    borderStartWidth: 3,
    borderStartColor: colors.accent
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  headerPills: {
    alignItems: "flex-end",
    gap: 6
  },
  settledPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  settledPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md
  },
  fieldName: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    color: colors.text,
    marginBottom: 4
  },
  playerName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    color: colors.textMuted
  },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700"
  },
  dateText: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "right",
    marginBottom: 4,
    fontWeight: "600"
  },
  timeText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.sm,
    fontWeight: "700"
  },
  metaLine: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: 4,
    fontWeight: "600"
  },
  createdBy: {
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: "right",
    marginBottom: spacing.md,
    fontWeight: "600"
  },
  actionsRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  actionButton: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center"
  },
  actionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }]
  },
  reject: {
    backgroundColor: colors.dangerSoft
  },
  approve: {
    backgroundColor: colors.primary
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger
  },
  approveText: {
    color: colors.textOnPrimary
  },
  ownerActions: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  smallBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft
  },
  smallBtnText: {
    fontWeight: "800",
    color: colors.primaryDark,
    fontSize: 13
  },
  smallBtnDanger: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft
  },
  smallBtnDangerText: {
    fontWeight: "800",
    color: colors.danger,
    fontSize: 13
  },
  smallBtnAccent: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent
  },
  smallBtnAccentText: {
    fontWeight: "800",
    color: colors.accent,
    fontSize: 13
  }
});
