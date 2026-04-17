import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { t } from "../strings";
import { useSettings } from "../providers/SettingsProvider";
import { cardElevation } from "../theme/tokens";
import { makeBookingCardStyles } from "./bookingCardStyles";
import { formatBookingPaymentMethod } from "../lib/bookingPaymentMethod";
import { formatHm12HourAr } from "../lib/timeFormat";
import type { AttendanceStatus } from "../lib/bookingAttendance";
import { formatNumberEn } from "../lib/numberFormat";

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
  /** معرّف لاعب Firebase عند الحجز من التطبيق */
  player_user_id?: string | null;
  attendance_status?: AttendanceStatus;
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
  /** تأكيد حضور (حضر / لم يحضر) — يُفعّل الخصم التلقائي عند عدم الحضور */
  onSetAttendance?: (status: AttendanceStatus) => void;
  attendanceBusy?: boolean;
  /** بطاقة مختصرة: تعرض اسم الحاجز فقط */
  compact?: boolean;
  onOpenDetails?: () => void;
};

export const BookingCard: React.FC<Props> = ({
  booking,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onPostMatch,
  highlighted,
  onSetAttendance,
  attendanceBusy,
  compact = false,
  onOpenDetails
}) => {
  const { palette } = useSettings();
  const styles = useMemo(() => makeBookingCardStyles(palette), [palette]);

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
      background: palette.accentMuted
    },
    approved: {
      label: t.bookings.statusApproved,
      color: palette.primaryDark,
      background: palette.primarySoft
    },
    rejected: {
      label: t.bookings.statusRejected,
      color: "#991B1B",
      background: palette.dangerSoft
    },
    cancelled: {
      label: t.bookings.statusCancelled,
      color: palette.textSecondary,
      background: palette.surfaceMuted
    },
    confirmed: {
      label: t.bookings.statusConfirmed,
      color: palette.primaryDark,
      background: palette.primarySoft
    }
  };

  const status = statusConfig[booking.status];

  const price =
    booking.total_price != null && !Number.isNaN(Number(booking.total_price))
      ? formatNumberEn(Number(booking.total_price), { maximumFractionDigits: 2 })
      : null;

  const isOwnerManualBooking =
    booking.source_kind === "manual" || booking.created_by === "owner";

  const createdLabel =
    booking.booking_kind === "venue"
      ? t.bookings.dashboardBookingSource
      : isOwnerManualBooking
        ? t.bookings.bookingByFieldOwnerLabel
        : booking.player_name
          ? `${t.bookings.sourcePlayerPrefix}${booking.player_name}`
          : t.bookings.createdByPlayer;

  const ownerBookingPm = String(booking.payment_method ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const showPaymentRow =
    Boolean(booking.payment_method?.trim()) &&
    !isOwnerManualBooking &&
    ownerBookingPm !== "owner_manual";

  const showCreatedByLine =
    Boolean(booking.created_by || booking.source_kind || booking.booking_kind) &&
    !(isOwnerManualBooking && booking.booking_kind === "owner");

  if (compact) {
    const compactName =
      isOwnerManualBooking
        ? booking.player_name?.trim() || t.bookings.bookingByFieldOwnerLabel
        : booking.player_name?.trim() || t.bookings.noPlayerName;
    return (
      <Pressable
        onPress={onOpenDetails}
        style={({ pressed }) => [
          styles.card,
          cardElevation(palette, true),
          styles.cardEdge,
          highlighted && styles.cardHighlighted,
          pressed && styles.actionPressed
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.playerName}>{compactName}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        cardElevation(palette, true),
        styles.cardEdge,
        booking.status === "pending" && styles.cardPendingAccent,
        highlighted && styles.cardHighlighted
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.fieldName}>{booking.field_name || "—"}</Text>
          <Text style={styles.playerName}>
            {isOwnerManualBooking
              ? t.bookings.bookingByFieldOwnerLabel
              : booking.player_name?.trim()
                ? booking.player_name.trim()
                : t.bookings.noPlayerName}
          </Text>
        </View>
        <View style={styles.headerPills}>
          {booking.settled ? (
            <View style={[styles.settledPill, { backgroundColor: palette.surfaceMuted }]}>
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
        {formatHm12HourAr(booking.start_time)} — {formatHm12HourAr(booking.end_time)}
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
      <Text style={styles.metaLine}>
        {t.bookings.playerRequestedServicesLabel}:{" "}
        {booking.services_summary?.trim()
          ? booking.services_summary.trim()
          : t.bookings.servicesNotSpecified}
      </Text>
      {booking.field_size ? (
        <Text style={styles.metaLine}>
          {t.bookings.fieldSizeLabel}: {booking.field_size}
        </Text>
      ) : null}
      {showPaymentRow ? (
        <Text style={styles.metaLine}>
          {t.bookings.paymentMethodLabel}: {formatBookingPaymentMethod(booking.payment_method)}
        </Text>
      ) : null}
      {booking.phone ? (
        <Text style={styles.metaLine}>
          {t.bookings.playerPhoneLabel}: {booking.phone}
        </Text>
      ) : null}
      {showCreatedByLine ? <Text style={styles.createdBy}>{createdLabel}</Text> : null}
      {onSetAttendance && !booking.settled ? (
        <View style={styles.attendanceBlock}>
          <Text style={styles.attendanceTitle}>{t.bookings.attendanceTitle}</Text>
          <Text style={styles.attendanceHint}>{t.bookings.attendanceDiscountHint}</Text>
          <View style={styles.attendanceRow}>
            <Pressable
              onPress={() => onSetAttendance("attended")}
              disabled={attendanceBusy}
              style={({ pressed }) => [
                styles.attendanceBtn,
                booking.attendance_status === "attended" && styles.attendanceBtnAttendedActive,
                pressed && styles.actionPressed,
                attendanceBusy && styles.attendanceBtnDisabled
              ]}
            >
              <Text
                style={[
                  styles.attendanceBtnText,
                  booking.attendance_status === "attended" && styles.attendanceBtnTextOnActive
                ]}
              >
                {t.bookings.attendanceAttended}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSetAttendance("no_show")}
              disabled={attendanceBusy}
              style={({ pressed }) => [
                styles.attendanceBtn,
                booking.attendance_status === "no_show" && styles.attendanceBtnNoShowActive,
                pressed && styles.actionPressed,
                attendanceBusy && styles.attendanceBtnDisabled
              ]}
            >
              <Text
                style={[
                  styles.attendanceBtnText,
                  booking.attendance_status === "no_show" && styles.attendanceBtnTextNoShow
                ]}
              >
                {t.bookings.attendanceNoShow}
              </Text>
            </Pressable>
          </View>
        </View>
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
