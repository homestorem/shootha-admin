import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  Alert,
  Keyboard
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainAppStackParamList, MainTabParamList } from "../navigation/AppNavigator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "../lib/dayjs";
import { classifyBookingDayTab } from "../lib/firestoreBookingDate";
import Toast from "react-native-toast-message";
import { BookingCard, Booking } from "../components/BookingCard";
import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { EmptyState } from "../components/EmptyState";
import { CenteredLoading } from "../components/ui/CenteredLoading";
import { t } from "../strings";
import { formatNumberEn } from "../lib/numberFormat";
import { isBackendSyncEnabled } from "../lib/backendFlags";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import {
  fetchBookingsForOwner,
  fetchFieldsForOwner,
  fetchPlayerLabels,
  formatDurationForDisplay,
  formatTimeForDisplay,
  insertBooking,
  mapDbStatusToUi,
  updateBookingStatus,
  type BookingRowWithField,
  type BookingDurationMinutesOption,
  BOOKING_DURATION_MINUTES_OPTIONS
} from "../lib/bookingsApi";
import { isAttendanceWindowOpen, type AttendanceStatus } from "../lib/bookingAttendance";
import {
  deleteOwnerBookingDoc,
  fetchOwnerBookingsForUid,
  insertOwnerBooking,
  setOwnerBookingAttendance,
  updateOwnerBookingDoc,
  updateOwnerBookingStatusFirestore,
  type OwnerBookingDoc
} from "../services/ownerBookingsFirestore";
import {
  deleteVenueBookingDoc,
  endTimeFromDuration,
  fetchVenueBookingsForOwner,
  normalizeHm,
  parseVenueBookingUiId,
  setVenueBookingAttendance,
  SYNC_SOURCE_OWNER_APP,
  updateVenueBookingDoc,
  updateVenueBookingStatus,
  VENUE_BOOKING_ID_PREFIX,
  type VenueBookingDoc
} from "../services/venueBookingsFirestore";
import { fetchMergedFieldsForUid } from "../services/ownerFieldsFirestore";
import { wrapFieldRequestError } from "../lib/fieldRequests";
import { submitFieldRequest } from "../services/fieldRequestService";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "../providers/SettingsProvider";
import { processDueWalletSettlements, scheduleBookingWalletCharge } from "../services/walletStore";
import { radius, spacing } from "../theme/tokens";
import { makeBookingsStyles } from "./bookingsScreenStyles";
import { FieldRequestBottomSheet } from "../components/FieldRequestBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookingPaymentMethodChips } from "../components/BookingPaymentMethodChips";
import {
  type BookingPaymentMethodKey,
  isBookingPaymentKey
} from "../lib/bookingPaymentMethod";
import { rtl } from "../utils/rtl";
import { HomeDashboardHero } from "../components/home/HomeDashboardHero";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function mapRowToBooking(row: BookingRowWithField, labels: Map<string, string>): Booking {
  const tp = row.total_price;
  const price = typeof tp === "string" ? parseFloat(tp) : tp;
  return {
    id: String(row.id),
    field_name: row.fields?.name ?? null,
    player_name: row.player_id ? labels.get(row.player_id) ?? null : null,
    start_time: formatTimeForDisplay(row.start_time),
    end_time: formatTimeForDisplay(row.end_time),
    status: mapDbStatusToUi(row.status),
    date: row.date,
    total_price: Number.isFinite(price) ? price : null,
    duration_label: formatDurationForDisplay(row.duration),
    created_by: row.created_by
  };
}

async function loadBookingsForUi(ownerId: string): Promise<Booking[]> {
  const raw = await fetchBookingsForOwner(ownerId);
  const playerIds = raw.map((r) => r.player_id).filter(Boolean) as string[];
  const labels = await fetchPlayerLabels(playerIds);
  return raw.map((row) => mapRowToBooking(row, labels));
}

function mapFsDocToBooking(b: OwnerBookingDoc): Booking {
  return {
    id: b.id,
    field_name: b.fieldName,
    player_name:
      b.source === "player"
        ? b.playerName || null
        : b.playerName?.trim()
          ? b.playerName
          : null,
    start_time: b.startTime,
    end_time: b.endTime,
    status: mapDbStatusToUi(b.status),
    date: b.date,
    total_price: b.totalPrice,
    duration_label: `${b.durationMinutes} دقيقة`,
    created_by: b.source === "manual" ? "owner" : "player",
    source_kind: b.source,
    services_summary: b.services?.length ? b.services.join("، ") : null,
    booking_kind: "owner",
    settled: Boolean(b.isSettled),
    player_user_id: b.playerUserId ?? null,
    payment_method: b.paymentMethod ?? null,
    attendance_status: b.attendanceStatus
  };
}

function mapVenueToBooking(d: VenueBookingDoc): Booking {
  const end = endTimeFromDuration(d.date, d.startTime, d.duration);
  const durLabel =
    d.duration > 24 ? `${d.duration} دقيقة` : d.duration === 1 ? "١ ساعة" : `${d.duration} ساعة`;
  const total = d.totalPrice ?? d.price ?? null;
  return {
    id: `${VENUE_BOOKING_ID_PREFIX}${d.id}`,
    field_name: d.venueName,
    player_name: d.playerName ?? null,
    start_time: d.startTime,
    end_time: end,
    status: mapDbStatusToUi(d.status ?? null),
    date: d.date,
    total_price: total,
    duration_label: durLabel,
    source_kind: "player",
    booking_kind: "venue",
    field_size: d.fieldSize ?? null,
    payment_method: d.paymentMethod ?? null,
    phone: d.phone ?? null,
    settled: Boolean(d.isSettled),
    player_user_id: d.playerUserId ?? null,
    services_summary: d.servicesSummary ?? null,
    attendance_status: d.attendanceStatus
  };
}

function padHmForDayjs(t: string): string {
  const p = t.trim().split(":");
  const h = (p[0] || "0").padStart(2, "0");
  const m = (p[1] || "00").padStart(2, "0");
  return `${h}:${m}`;
}

function bookingSlotEnded(b: Booking): boolean {
  const end = dayjs(`${b.date}T${padHmForDayjs(b.end_time)}:00`);
  return dayjs().isAfter(end);
}

function canOfferPostMatch(b: Booking, firebaseMode: boolean): boolean {
  if (!firebaseMode) return false;
  if (b.settled) return false;
  if (b.status === "pending" || b.status === "cancelled" || b.status === "rejected") return false;
  if (b.status !== "approved" && b.status !== "confirmed") return false;
  return bookingSlotEnded(b);
}

function canRecordAttendance(b: Booking, firebaseMode: boolean): boolean {
  if (!firebaseMode) return false;
  if (b.settled) return false;
  return b.status === "approved" || b.status === "confirmed";
}

function canShowAttendanceControls(b: Booking, firebaseMode: boolean): boolean {
  return canRecordAttendance(b, firebaseMode) && isAttendanceWindowOpen(b);
}

type TabKey = "today" | "upcoming" | "past";

function tabKeyForBookingDate(dateStr: string): TabKey {
  const tab = classifyBookingDayTab(dateStr);
  if (tab === "unknown") return "past";
  return tab;
}

export const BookingsScreen: React.FC = () => {
  const { palette, tr } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeBookingsStyles(palette), [palette]);
  const bookingModalScrollPad = useMemo(
    () => [styles.bookingModalScrollContent, { paddingBottom: spacing.xl + Math.max(insets.bottom, 8) }],
    [styles.bookingModalScrollContent, insets.bottom]
  );
  const queryClient = useQueryClient();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, "Home">>();
  const listRef = useRef<FlatList<Booking>>(null);
  const [deepLinkTarget, setDeepLinkTarget] = useState<string | null>(null);
  const [highlightBookingId, setHighlightBookingId] = useState<string | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const stackNav = navigation.getParent() as NativeStackNavigationProp<MainAppStackParamList> | undefined;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  /** لإعادة رسم البطاقات عند فتح نافذة تأكيد الحضور (قبل 15 دقيقة من الموعد) */
  const [, setAttendanceClockTick] = useState(0);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalStep, setAddModalStep] = useState<"pickField" | "form">("pickField");
  const [fieldRequestVisible, setFieldRequestVisible] = useState(false);
  const [fieldRequestSubmitting, setFieldRequestSubmitting] = useState(false);
  const [reqPersonName, setReqPersonName] = useState("");
  const [reqFieldName, setReqFieldName] = useState("");
  const [reqCity, setReqCity] = useState("");
  const [reqProvince, setReqProvince] = useState("");
  const [reqFieldType, setReqFieldType] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [newDate, setNewDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [newStartTime, setNewStartTime] = useState("18:00");
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState<BookingDurationMinutesOption>(60);
  const [newPrice, setNewPrice] = useState("100");
  const [newBookingPaymentMethod, setNewBookingPaymentMethod] = useState<BookingPaymentMethodKey>("cash");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [fsEditOpen, setFsEditOpen] = useState(false);
  const [fsEditDoc, setFsEditDoc] = useState<OwnerBookingDoc | null>(null);
  const [fsEditDate, setFsEditDate] = useState("");
  const [fsEditStart, setFsEditStart] = useState("18:00");
  const [fsEditDuration, setFsEditDuration] = useState<BookingDurationMinutesOption>(60);
  const [fsEditPrice, setFsEditPrice] = useState("100");
  const [fsEditServices, setFsEditServices] = useState("");
  const [fsEditSource, setFsEditSource] = useState<"manual" | "player">("manual");
  const [fsEditPlayer, setFsEditPlayer] = useState("");
  const [fsEditPaymentMethod, setFsEditPaymentMethod] = useState<BookingPaymentMethodKey>("cash");
  const [vbEditOpen, setVbEditOpen] = useState(false);
  const [vbEditDoc, setVbEditDoc] = useState<VenueBookingDoc | null>(null);
  const [vbEditDate, setVbEditDate] = useState("");
  const [vbEditStart, setVbEditStart] = useState("12:00");
  const [vbEditDuration, setVbEditDuration] = useState("1");
  const [vbEditVenueName, setVbEditVenueName] = useState("");
  const [vbEditVenueId, setVbEditVenueId] = useState("");
  const [vbEditFieldSize, setVbEditFieldSize] = useState("");
  const [vbEditPlayer, setVbEditPlayer] = useState("");
  const [vbEditPhone, setVbEditPhone] = useState("");
  const [vbEditPayment, setVbEditPayment] = useState("");
  const [vbEditPrice, setVbEditPrice] = useState("0");
  const [vbEditStatus, setVbEditStatus] = useState("confirmed");

  const useFs = Boolean(user?.id && isFirebaseConfigured());
  const canSync = Boolean(user?.id && (useFs || isBackendSyncEnabled));

  const mergedBookingsQuery = useQuery({
    queryKey: ["mergedBookings", user?.id],
    queryFn: async () => {
      const uid = user!.id;
      const ownerPub = user!.ownerId ?? deriveOwnerIdFromUid(uid);
      const [owner, venue] = await Promise.all([
        fetchOwnerBookingsForUid(uid),
        fetchVenueBookingsForOwner(ownerPub)
      ]);
      return { owner, venue };
    },
    enabled: useFs,
    staleTime: 60_000
  });

  const apiBookingsQuery = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: () => loadBookingsForUi(user!.id),
    enabled: Boolean(user?.id && isBackendSyncEnabled && !useFs),
    staleTime: 60_000
  });

  const bookingList = useMemo(() => {
    if (!useFs) return apiBookingsQuery.data ?? [];
    const d = mergedBookingsQuery.data;
    if (!d) return [];
    const ownerRows = d.owner.map(mapFsDocToBooking);
    const venueRows = d.venue
      .filter((v) => v.syncSource !== SYNC_SOURCE_OWNER_APP)
      .map(mapVenueToBooking);
    return [...ownerRows, ...venueRows].sort((x, y) => {
      const ax = `${x.date}T${x.start_time}`;
      const ay = `${y.date}T${y.start_time}`;
      return ay.localeCompare(ax);
    });
  }, [useFs, mergedBookingsQuery.data, apiBookingsQuery.data]);

  const isPending = useFs ? mergedBookingsQuery.isPending : apiBookingsQuery.isPending;
  const isError = useFs ? mergedBookingsQuery.isError : apiBookingsQuery.isError;
  const error = useFs ? mergedBookingsQuery.error : apiBookingsQuery.error;
  const refetch = useFs ? mergedBookingsQuery.refetch : apiBookingsQuery.refetch;
  const isRefetching = useFs ? mergedBookingsQuery.isRefetching : apiBookingsQuery.isRefetching;

  const fsFieldsQuery = useQuery({
    queryKey: ["ownerFields", user?.id, user?.ownerId],
    queryFn: async () => {
      const ownerPub = user!.ownerId ?? deriveOwnerIdFromUid(user!.id);
      return fetchMergedFieldsForUid(user!.id, ownerPub);
    },
    enabled: useFs,
    staleTime: 60_000
  });

  const apiFieldsQuery = useQuery({
    queryKey: ["fields", user?.id],
    queryFn: () => fetchFieldsForOwner(user!.id),
    enabled: Boolean(user?.id && isBackendSyncEnabled && !useFs),
    staleTime: 60_000
  });

  const fields = useFs
    ? (fsFieldsQuery.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        location: (f.location ?? "").trim()
      }))
    : (apiFieldsQuery.data ?? []).map((f) => ({ ...f, location: "" }));

  const fieldsListLoading = useFs ? fsFieldsQuery.isPending : apiFieldsQuery.isPending;

  useFocusEffect(
    useCallback(() => {
      setAttendanceClockTick((n) => n + 1);
      void processDueWalletSettlements();
      if (canSync) void refetch();
      if (useFs && user?.id) {
        void queryClient.invalidateQueries({ queryKey: ["ownerFields", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user.id] });
      }
    }, [canSync, refetch, useFs, user?.id, queryClient])
  );

  useEffect(() => {
    const id = setInterval(() => setAttendanceClockTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const p = route.params?.openBookingId?.trim();
    if (!p) return;
    setDeepLinkTarget(p);
    navigation.setParams({ openBookingId: undefined });
  }, [route.params?.openBookingId, navigation]);

  useEffect(() => {
    if (!deepLinkTarget) return;
    const b = bookingList.find((x) => x.id === deepLinkTarget);
    if (!b) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tabKeyForBookingDate(b.date));
    setHighlightBookingId(deepLinkTarget);
  }, [deepLinkTarget, bookingList]);

  useEffect(() => {
    if (!deepLinkTarget || isPending) return;
    const b = bookingList.find((x) => x.id === deepLinkTarget);
    if (b) return;
    const timer = setTimeout(() => {
      if (!bookingList.some((x) => x.id === deepLinkTarget)) {
        setDeepLinkTarget(null);
        setHighlightBookingId(null);
        Toast.show({ type: "info", text1: t.notifications.bookingNotFound });
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [deepLinkTarget, isPending, bookingList]);

  useEffect(() => {
    if (!highlightBookingId) return;
    const t = setTimeout(() => setHighlightBookingId(null), 4500);
    return () => clearTimeout(t);
  }, [highlightBookingId]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string | number; status: string }) => {
      if (useFs) {
        const sid = String(id);
        const vb = parseVenueBookingUiId(sid);
        if (vb) {
          await updateVenueBookingStatus(vb, status);
          return;
        }
        await updateOwnerBookingStatusFirestore(sid, status);
        return;
      }
      await updateBookingStatus(Number(id), status);
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void queryClient.invalidateQueries({ queryKey: ["bookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.bookings.statusUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const attendanceMutation = useMutation({
    mutationFn: async (p: { id: string; status: AttendanceStatus }) => {
      const vid = parseVenueBookingUiId(p.id);
      if (vid) await setVenueBookingAttendance(vid, p.status);
      else await setOwnerBookingAttendance(p.id, p.status);
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.bookings.attendanceSaved });
    },
    onError: () => {
      Toast.show({ type: "error", text1: t.bookings.attendanceError });
    }
  });

  const insertMutation = useMutation<{ id: number | string }, Error, Parameters<typeof insertBooking>[0]>({
    mutationFn: (row) =>
      useFs
        ? insertOwnerBooking({
            ownerUid: user!.id,
            fieldId: row.field_id,
            fieldName: fields.find((f) => f.id === row.field_id)?.name ?? "—",
            date: row.date,
            startTime: row.start_time,
            endTime: row.end_time,
            durationMinutes: row.durationMinutes,
            totalPrice: row.total_price,
            status: row.status ?? "approved",
            source: "manual",
            playerName: null,
            services: [],
            ownerPublicId: user!.ownerId ?? deriveOwnerIdFromUid(user!.id),
            paymentMethod: newBookingPaymentMethod
          })
        : insertBooking(row),
    onSuccess: (result, variables) => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void (async () => {
        const endAtIso = dayjs(`${variables.date} ${variables.end_time}`, "YYYY-MM-DD HH:mm").toDate().toISOString();
        await scheduleBookingWalletCharge({
          amount: variables.total_price,
          bookingRef: String(result.id),
          endAtIso,
          delayMinutes: 15,
          note: `استقطاع تلقائي بعد انتهاء الحجز +15 دقيقة`
        });
      })();
      void queryClient.invalidateQueries({ queryKey: ["bookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      setAddModalStep("pickField");
      setSelectedFieldId("");
      setAddModalVisible(false);
      Toast.show({ type: "success", text1: t.bookings.bookingSaved });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const fsUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!fsEditDoc || !user?.id) return;
      const [hour, minute] = fsEditStart.split(":").map((x) => parseInt(x, 10));
      const end = dayjs(fsEditDate)
        .hour(hour || 0)
        .minute(minute || 0)
        .second(0)
        .add(fsEditDuration, "minute");
      await updateOwnerBookingDoc(fsEditDoc.id, {
        date: fsEditDate,
        startTime: fsEditStart,
        endTime: end.format("HH:mm"),
        durationMinutes: fsEditDuration,
        totalPrice: parseFloat(fsEditPrice.replace(/,/g, ".")) || 0,
        source: fsEditSource,
        playerName: fsEditSource === "player" ? fsEditPlayer.trim() || null : null,
        services: fsEditServices
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        fieldName: fsEditDoc.fieldName,
        status: fsEditDoc.status,
        paymentMethod: fsEditPaymentMethod
      });
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      setFsEditOpen(false);
      setFsEditDoc(null);
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.fields.bookingUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const fsDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const vb = parseVenueBookingUiId(id);
      if (vb) await deleteVenueBookingDoc(vb);
      else await deleteOwnerBookingDoc(id);
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.fields.bookingDeleted });
    }
  });

  const vbUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!vbEditDoc) return;
      const duration = parseFloat(vbEditDuration.replace(/,/g, ".")) || 1;
      const priceNum = parseFloat(vbEditPrice.replace(/,/g, ".")) || 0;
      await updateVenueBookingDoc(vbEditDoc.id, {
        date: vbEditDate.trim(),
        startTime: normalizeHm(vbEditStart.trim()),
        duration: Math.round(duration),
        venueName: vbEditVenueName.trim(),
        venueId: vbEditVenueId.trim(),
        fieldSize: vbEditFieldSize.trim() || undefined,
        playerName: vbEditPlayer.trim() || undefined,
        phone: vbEditPhone.trim() || undefined,
        paymentMethod: vbEditPayment.trim() || undefined,
        price: priceNum,
        totalPrice: priceNum,
        status: vbEditStatus.trim() || "confirmed"
      });
    },
    onSuccess: () => {
      setVbEditOpen(false);
      setVbEditDoc(null);
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      Toast.show({ type: "success", text1: t.fields.bookingUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const closeAddBookingModal = useCallback(() => {
    if (insertMutation.isPending) return;
    Keyboard.dismiss();
    setAddModalStep("pickField");
    setSelectedFieldId("");
    setAddModalVisible(false);
  }, [insertMutation.isPending]);

  const closeFsEditModal = useCallback(() => {
    if (fsUpdateMutation.isPending) return;
    Keyboard.dismiss();
    setFsEditOpen(false);
    setFsEditDoc(null);
  }, [fsUpdateMutation.isPending]);

  const closeVbEditModal = useCallback(() => {
    if (vbUpdateMutation.isPending) return;
    Keyboard.dismiss();
    setVbEditOpen(false);
    setVbEditDoc(null);
  }, [vbUpdateMutation.isPending]);

  const openBookingEdit = (bookingId: string) => {
    Keyboard.dismiss();
    const vbId = parseVenueBookingUiId(bookingId);
    if (vbId) {
      const doc = (mergedBookingsQuery.data?.venue ?? []).find((b) => b.id === vbId);
      if (!doc) return;
      setVbEditDoc(doc);
      setVbEditDate(doc.date);
      setVbEditStart(doc.startTime);
      setVbEditDuration(String(doc.duration));
      setVbEditVenueName(doc.venueName);
      setVbEditVenueId(doc.venueId);
      setVbEditFieldSize(doc.fieldSize ?? "");
      setVbEditPlayer(doc.playerName ?? "");
      setVbEditPhone(doc.phone ?? "");
      setVbEditPayment(doc.paymentMethod ?? "");
      const tp = doc.totalPrice ?? doc.price ?? 0;
      setVbEditPrice(String(tp));
      setVbEditStatus((doc.status ?? "confirmed").trim() || "confirmed");
      setVbEditOpen(true);
      return;
    }
    const doc = (mergedBookingsQuery.data?.owner ?? []).find((b) => b.id === bookingId);
    if (!doc) return;
    setFsEditDoc(doc);
    setFsEditDate(doc.date);
    setFsEditStart(doc.startTime);
    setFsEditDuration((doc.durationMinutes === 90 ? 90 : 60) as BookingDurationMinutesOption);
    setFsEditPrice(String(doc.totalPrice));
    setFsEditServices((doc.services ?? []).join("، "));
    setFsEditSource(doc.source);
    setFsEditPlayer(doc.playerName ?? "");
    const pm = doc.paymentMethod?.trim();
    setFsEditPaymentMethod(pm && isBookingPaymentKey(pm) ? pm : "cash");
    setFsEditOpen(true);
  };

  const filteredBookings = useMemo(() => {
    return bookingList.filter((b) => {
      const tab = classifyBookingDayTab(b.date);
      const bucket = tab === "unknown" ? "past" : tab;
      return bucket === activeTab;
    });
  }, [bookingList, activeTab]);

  useEffect(() => {
    if (!detailsBooking) return;
    const fresh = bookingList.find((b) => b.id === detailsBooking.id);
    if (!fresh) {
      setDetailsBooking(null);
      return;
    }
    setDetailsBooking(fresh);
  }, [bookingList, detailsBooking]);

  const bookingTabCounts = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    let past = 0;
    for (const b of bookingList) {
      const tab = classifyBookingDayTab(b.date);
      if (tab === "today") today += 1;
      else if (tab === "upcoming") upcoming += 1;
      else past += 1;
    }
    return { today, upcoming, past };
  }, [bookingList]);

  useEffect(() => {
    if (!deepLinkTarget) return;
    const idx = filteredBookings.findIndex((x) => x.id === deepLinkTarget);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.12, animated: true });
    });
    setDeepLinkTarget(null);
    Toast.show({ type: "success", text1: t.notifications.bookingOpenedFromNotification });
  }, [filteredBookings, deepLinkTarget]);

  const homeDisplayName = (user?.display_name?.trim() || tr("profile.guestName")).trim();
  const homeWelcomeLine = tr("home.welcomeName", { name: homeDisplayName });
  const sectionBookingsTitle =
    activeTab === "today"
      ? tr("home.sectionBookingsToday")
      : activeTab === "past"
        ? tr("home.sectionBookingsPast")
        : tr("home.sectionBookingsUpcoming");

  const setTab = (k: TabKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(k);
  };

  const handleStatusChange = (id: string, status: "approved" | "rejected") => {
    updateStatusMutation.mutate({ id: useFs ? id : Number(id), status });
  };

  const statusLabel = (s: Booking["status"]): string => {
    if (s === "approved") return tr("home.statusApproved");
    if (s === "rejected") return tr("home.statusRejected");
    if (s === "confirmed") return tr("home.statusConfirmed");
    if (s === "cancelled") return tr("home.statusCancelled");
    return tr("home.statusPending");
  };

  const canShowDetailsAttendance = (b: Booking | null): boolean => {
    if (!b || !useFs || b.settled) return false;
    if (b.status !== "approved" && b.status !== "confirmed") return false;
    const start = dayjs(`${b.date}T${padHmForDayjs(b.start_time)}:00`);
    return dayjs().isAfter(start.add(15, "minute"));
  };

  const handleAddBooking = () => {
    if (!canSync) {
      Toast.show({
        type: "info",
        text1: !user?.id ? t.bookings.loginRequiredBookings : t.bookings.needBackendBookings
      });
      return;
    }
    if (!selectedFieldId) {
      Toast.show({ type: "error", text1: t.bookings.noFieldsHint });
      return;
    }
    const durationMinutes = bookingDurationMinutes;
    const [hour, minute] = newStartTime.split(":").map((x) => parseInt(x, 10));
    const start = dayjs(newDate).hour(hour || 0).minute(minute || 0).second(0);
    const end = start.add(durationMinutes, "minute");
    const priceNum = parseFloat(newPrice.replace(/,/g, ".")) || 0;

    insertMutation.mutate({
      field_id: selectedFieldId,
      player_id: null,
      date: newDate,
      start_time: start.format("HH:mm"),
      end_time: end.format("HH:mm"),
      durationMinutes,
      total_price: priceNum,
      status: "approved",
      created_by: "owner"
    });
  };

  const handleSubmitFieldRequest = async () => {
    const name = reqFieldName.trim();
    const location = reqCity.trim();
    const province = reqProvince.trim();
    const fieldType = reqFieldType.trim();

    if (!name) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestValidation });
      return;
    }
    if (!location) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationLocation });
      return;
    }
    if (!province) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationProvince });
      return;
    }
    if (!fieldType) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationFieldType });
      return;
    }
    if (!isFirebaseConfigured()) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestFirebaseNotConfigured });
      return;
    }
    if (!user?.id) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestLoginRequired });
      return;
    }
    const ownerId = user.ownerId ?? deriveOwnerIdFromUid(user.id);

    const ownerName = user.display_name?.trim() ?? "";
    const accountPhone = user.phone?.trim() ?? "";
    if (!ownerName || !accountPhone) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestProfileIncomplete });
      return;
    }

    setFieldRequestSubmitting(true);
    try {
      const result = await submitFieldRequest({
        fieldName: name,
        location,
        province,
        fieldType,
        notes: reqNotes.trim() || undefined,
        ownerId,
        ownerAccountId: ownerId,
        userUid: user.id,
        ownerName,
        phone: accountPhone
      });
      setFieldRequestVisible(false);
      setReqPersonName("");
      setReqFieldName("");
      setReqCity("");
      setReqProvince("");
      setReqFieldType("");
      setReqNotes("");
      setReqPhone("");
      Toast.show({
        type: "success",
        text1: t.bookings.fieldRequestSuccess,
        text2: `${t.bookings.requestIdSentHint}\n${result.id}`,
        visibilityTime: 7000
      });
    } catch (e: unknown) {
      const err = wrapFieldRequestError(e);
      const msg = err.message;
      if (msg === "FIREBASE_NOT_CONFIGURED") {
        Toast.show({ type: "error", text1: t.bookings.fieldRequestFirebaseNotConfigured });
      } else if (msg.startsWith("VALIDATION:")) {
        const key = msg.replace("VALIDATION:", "");
        if (key === "location") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationLocation });
        } else if (key === "province") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationProvince });
        } else if (key === "fieldType") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationFieldType });
        } else if (key === "ownerName") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestProfileIncomplete });
        } else if (key === "fieldName") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestValidation });
        } else if (key === "phone") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestProfileIncomplete });
        } else if (key === "ownerId" || key === "ownerAccountId" || key === "userUid") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestOwnerIdMissing });
        } else {
          Toast.show({ type: "error", text1: t.common.error });
        }
      } else {
        Toast.show({ type: "error", text1: msg || t.common.error });
      }
    } finally {
      setFieldRequestSubmitting(false);
    }
  };

  const openAddModal = () => {
    if (!user?.id) {
      Toast.show({ type: "info", text1: t.bookings.loginRequiredBookings });
      return;
    }
    if (!useFs && !isBackendSyncEnabled) {
      Toast.show({ type: "info", text1: t.bookings.needBackendBookings });
      return;
    }
    if (useFs) {
      void queryClient.invalidateQueries({ queryKey: ["ownerFields", user!.id] });
    } else {
      void queryClient.invalidateQueries({ queryKey: ["fields", user!.id] });
    }
    setAddModalStep("pickField");
    setSelectedFieldId("");
    setBookingDurationMinutes(60);
    setNewBookingPaymentMethod("cash");
    setAddModalVisible(true);
  };

  const renderListEmpty = () => {
    if (canSync && isPending && !isError) {
      return <CenteredLoading color={palette.primary} minHeight={280} />;
    }
    if (canSync && isError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={tr("home.emptyStateLoadTitle")}
          subtitle={tr("home.loadErrorBookings")}
        />
      );
    }
    if (!useFs && !isBackendSyncEnabled) {
      return (
        <EmptyState
          icon="settings-outline"
          title={tr("home.emptyStateBackendTitle")}
          subtitle={tr("home.needBackendBookings")}
        />
      );
    }
    if (!user?.id) {
      return (
        <EmptyState
          icon="lock-closed-outline"
          title={tr("home.emptyTitle")}
          subtitle={tr("home.loginRequiredBookings")}
        />
      );
    }
    return (
      <View style={styles.homeEmptyCard}>
        <Ionicons name="football-outline" size={40} color={palette.primary} />
        <Text style={styles.homeEmptyTitle}>{tr("home.emptyTitle")}</Text>
        <Text style={styles.homeEmptySubtitle}>{tr("home.emptySubtitle")}</Text>
      </View>
    );
  };

  const listShellStyle = styles.listInsetHome;

  return (
    <>
      <ScreenShell fullBleed bleedTop>
        <View style={styles.root}>
          <HomeDashboardHero
            paddingTop={insets.top}
            welcomeNameLine={homeWelcomeLine}
            welcomeSub={tr("home.welcomeSub")}
            addBookingLabel={tr("home.addBookingCta")}
            addBookingSub={tr("home.addBookingCtaSub")}
            fieldRequestTitle={tr("home.requestAddField")}
            fieldRequestSub={tr("home.fieldRequestSheetSubtitle")}
            todayLabel={tr("home.today")}
            pastLabel={tr("home.past")}
            upcomingLabel={tr("home.upcoming")}
            counts={{
              today: bookingTabCounts.today,
              past: bookingTabCounts.past,
              upcoming: bookingTabCounts.upcoming
            }}
            activeTab={activeTab}
            onTab={setTab}
            onAddBooking={openAddModal}
            onFieldRequest={() => setFieldRequestVisible(true)}
          />

          <FlatList
            ref={listRef}
            style={listShellStyle}
            data={filteredBookings}
            keyExtractor={(item) => item.id}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => {
                listRef.current?.scrollToIndex({ index, viewPosition: 0.12, animated: true });
              });
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 10) * 42).springify()}>
                <BookingCard
                  compact
                  onOpenDetails={() => setDetailsBooking(item)}
                  highlighted={item.id === highlightBookingId}
                  booking={item}
                  onApprove={() => handleStatusChange(item.id, "approved")}
                  onReject={() => handleStatusChange(item.id, "rejected")}
                  onSetAttendance={
                    canShowAttendanceControls(item, useFs)
                      ? (status) => attendanceMutation.mutate({ id: item.id, status })
                      : undefined
                  }
                  attendanceBusy={
                    attendanceMutation.isPending && attendanceMutation.variables?.id === item.id
                  }
                  onEdit={useFs ? () => openBookingEdit(item.id) : undefined}
                  onPostMatch={
                    canOfferPostMatch(item, useFs)
                      ? () => {
                          const vid = parseVenueBookingUiId(item.id);
                          stackNav?.navigate("PostMatch", vid
                            ? { mode: "venue", venueBookingId: vid }
                            : { mode: "owner", ownerBookingId: item.id });
                        }
                      : undefined
                  }
                  onDelete={
                    useFs
                      ? () =>
                          Alert.alert(t.fields.confirmDeleteTitle, t.fields.confirmDeleteBody, [
                            { text: t.common.cancel, style: "cancel" },
                            {
                              text: t.fields.deleteBooking,
                              style: "destructive",
                              onPress: () => fsDeleteMutation.mutate(item.id)
                            }
                          ])
                      : undefined
                  }
                />
              </Animated.View>
            )}
            contentContainerStyle={
              filteredBookings.length === 0 ? styles.listEmptyGrow : styles.listContent
            }
            ListHeaderComponent={<Text style={styles.listSectionTitle}>{sectionBookingsTitle}</Text>}
            ListEmptyComponent={renderListEmpty}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isPending}
                onRefresh={() => void refetch()}
                tintColor={palette.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScreenShell>

      <FieldRequestBottomSheet
        visible={fieldRequestVisible}
        onClose={() => setFieldRequestVisible(false)}
        user={user}
        ownerAccountId={user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "")}
        reqPersonName={reqPersonName}
        setReqPersonName={setReqPersonName}
        reqFieldName={reqFieldName}
        setReqFieldName={setReqFieldName}
        reqCity={reqCity}
        setReqCity={setReqCity}
        reqProvince={reqProvince}
        setReqProvince={setReqProvince}
        reqFieldType={reqFieldType}
        setReqFieldType={setReqFieldType}
        reqNotes={reqNotes}
        setReqNotes={setReqNotes}
        reqPhone={reqPhone}
        setReqPhone={setReqPhone}
        submitting={fieldRequestSubmitting}
        onSubmit={handleSubmitFieldRequest}
      />

      <Modal
        visible={Boolean(detailsBooking)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalSheetScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={bookingModalScrollPad}
          >
            <View style={styles.modalCard}>
              <InputLayer>
                <View style={styles.modalHeaderRow}>
                  <Pressable
                    onPress={() => setDetailsBooking(null)}
                    style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.headerBtnPressed]}
                  >
                    <Ionicons name="close" size={26} color={palette.text} />
                  </Pressable>
                  <Text style={styles.modalTitleInHeader}>تفاصيل الحجز</Text>
                  <View style={styles.modalHeaderSpacer} />
                </View>

                {detailsBooking ? (
                  <>
                    <Text style={styles.inputLabel}>اسم الحاجز</Text>
                    <Text style={styles.input}>{detailsBooking.player_name || t.bookings.noPlayerName}</Text>
                    {detailsBooking.phone ? (
                      <>
                        <Text style={styles.inputLabel}>{t.bookings.playerPhoneLabel}</Text>
                        <Text style={styles.input}>{detailsBooking.phone}</Text>
                      </>
                    ) : null}
                    <Text style={styles.inputLabel}>{t.bookings.fieldLabel}</Text>
                    <Text style={styles.input}>{detailsBooking.field_name || "—"}</Text>
                    <Text style={styles.inputLabel}>{t.bookings.dateLabel}</Text>
                    <Text style={styles.input}>{detailsBooking.date}</Text>
                    <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
                    <Text style={styles.input}>{detailsBooking.start_time}</Text>
                    <Text style={styles.inputLabel}>إلى</Text>
                    <Text style={styles.input}>{detailsBooking.end_time}</Text>
                    <Text style={styles.inputLabel}>{t.bookings.durationLabel}</Text>
                    <Text style={styles.input}>{detailsBooking.duration_label || "—"}</Text>
                    <Text style={styles.inputLabel}>{t.bookings.bookingStatusLabel}</Text>
                    <Text style={styles.input}>{statusLabel(detailsBooking.status)}</Text>
                    <Text style={styles.inputLabel}>{t.bookings.totalPriceLabel}</Text>
                    <Text style={styles.input}>
                      {detailsBooking.total_price != null
                        ? `${formatNumberEn(Number(detailsBooking.total_price))} ${t.bookings.currencyShort}`
                        : "—"}
                    </Text>
                    <Text style={styles.inputLabel}>{t.bookings.playerRequestedServicesLabel}</Text>
                    <Text style={styles.input}>
                      {detailsBooking.services_summary?.trim() || t.bookings.servicesNotSpecified}
                    </Text>
                    {detailsBooking.payment_method ? (
                      <>
                        <Text style={styles.inputLabel}>{t.bookings.paymentMethodLabel}</Text>
                        <Text style={styles.input}>{detailsBooking.payment_method}</Text>
                      </>
                    ) : null}
                    <View style={styles.modalActions}>
                      {(detailsBooking.status === "pending" || detailsBooking.status === "rejected") && (
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalPrimary]}
                          onPress={() => handleStatusChange(detailsBooking.id, "approved")}
                        >
                          <Text style={styles.modalPrimaryText}>{t.bookings.approve}</Text>
                        </TouchableOpacity>
                      )}
                      {detailsBooking.status !== "rejected" && detailsBooking.status !== "cancelled" && (
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalCancel]}
                          onPress={() => handleStatusChange(detailsBooking.id, "rejected")}
                        >
                          <Text style={styles.modalCancelText}>{t.bookings.reject}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {canShowDetailsAttendance(detailsBooking) ? (
                      <View style={styles.modalActions}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalPrimary]}
                          onPress={() =>
                            attendanceMutation.mutate({ id: detailsBooking.id, status: "attended" })
                          }
                        >
                          <Text style={styles.modalPrimaryText}>{t.bookings.attendanceAttended}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalCancel]}
                          onPress={() =>
                            attendanceMutation.mutate({ id: detailsBooking.id, status: "no_show" })
                          }
                        >
                          <Text style={styles.modalCancelText}>{t.bookings.attendanceNoShow}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalPrimary]}
                        onPress={() => {
                          setDetailsBooking(null);
                          openBookingEdit(detailsBooking.id);
                        }}
                      >
                        <Text style={styles.modalPrimaryText}>{t.bookings.editBookingShort}</Text>
                      </TouchableOpacity>
                      {useFs ? (
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: palette.danger }]}
                          onPress={() => fsDeleteMutation.mutate(detailsBooking.id)}
                        >
                          <Text style={styles.modalPrimaryText}>{t.bookings.deleteBookingShort}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </InputLayer>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddBookingModal}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalSheetScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            contentContainerStyle={bookingModalScrollPad}
          >
            <View style={styles.modalCard}>
              <InputLayer>
              <View style={styles.modalHeaderRow}>
                <Pressable
                  onPress={closeAddBookingModal}
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.headerBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t.bookings.modalCloseA11y}
                >
                  <Ionicons name="close" size={26} color={palette.text} />
                </Pressable>
                <Text style={styles.modalTitleInHeader}>
                  {addModalStep === "pickField" ? t.bookings.selectField : t.bookings.addBooking}
                </Text>
                <View style={styles.modalHeaderSpacer} />
              </View>
              {addModalStep === "pickField" ? (
                <>
                  <Text style={styles.addedFieldsSectionTitle}>{t.bookings.addedFieldsList}</Text>
                  {fieldsListLoading && fields.length === 0 ? (
                    <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
                      <ActivityIndicator size="large" color={palette.primary} />
                    </View>
                  ) : fields.length === 0 ? (
                    <Text style={styles.warnText}>{t.bookings.noFieldsHint}</Text>
                  ) : (
                    fields.map((f) => (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          closeAddBookingModal();
                          stackNav?.navigate("FieldManage", { fieldId: f.id, fieldName: f.name });
                        }}
                        style={({ pressed }) => [styles.fieldListRow, pressed && styles.fieldListRowPressed]}
                      >
                        <View style={styles.fieldListTextCol}>
                          <Text style={styles.fieldListName} numberOfLines={2}>
                            {f.name}
                          </Text>
                          {f.location ? (
                            <Text style={styles.fieldListLoc} numberOfLines={1}>
                              {f.location}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name={rtl.chevronForward} size={22} color={palette.textMuted} />
                      </Pressable>
                    ))
                  )}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalCancel, { flex: 1 }]}
                      onPress={closeAddBookingModal}
                    >
                      <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.selectedFieldBar}>
                    <View style={styles.selectedFieldBarText}>
                      <Text style={styles.selectedFieldLabel}>{t.bookings.selectedFieldShort}</Text>
                      <Text style={styles.selectedFieldName} numberOfLines={2}>
                        {fields.find((x) => x.id === selectedFieldId)?.name ?? "—"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setAddModalStep("pickField")}
                      style={({ pressed }) => [styles.changeFieldBtn, pressed && { opacity: 0.75 }]}
                    >
                      <Text style={styles.changeFieldBtnText}>{t.bookings.changeField}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.inputLabel}>{t.bookings.dateLabel}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.bookings.datePlaceholder}
                    value={newDate}
                    textAlign="right"
                    onChangeText={setNewDate}
                  />
                  <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.bookings.timePlaceholder}
                    value={newStartTime}
                    textAlign="right"
                    onChangeText={setNewStartTime}
                  />
                  <Text style={styles.inputLabel}>{t.bookings.durationMinutesLabel}</Text>
                  <View style={styles.durationChips}>
                    {BOOKING_DURATION_MINUTES_OPTIONS.map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        style={[styles.durationChip, bookingDurationMinutes === mins && styles.durationChipActive]}
                        onPress={() => setBookingDurationMinutes(mins)}
                      >
                        <Text
                          style={[
                            styles.durationChipTitle,
                            bookingDurationMinutes === mins && styles.durationChipTitleActive
                          ]}
                        >
                          {mins === 60 ? t.bookings.durationOneHour : t.bookings.durationOneHalfHour}
                        </Text>
                        <Text
                          style={[
                            styles.durationChipSub,
                            bookingDurationMinutes === mins && styles.durationChipSubActive
                          ]}
                        >
                          {mins === 60 ? t.bookings.durationOneHourSub : t.bookings.durationOneHalfHourSub}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>{t.bookings.priceLabel}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.bookings.pricePlaceholder}
                    value={newPrice}
                    keyboardType="decimal-pad"
                    textAlign="right"
                    onChangeText={setNewPrice}
                  />
                  <Text style={styles.inputLabel}>{t.bookings.paymentMethodLabel}</Text>
                  <BookingPaymentMethodChips
                    value={newBookingPaymentMethod}
                    onChange={setNewBookingPaymentMethod}
                    rowStyle={styles.durationChips}
                    chipStyle={styles.durationChip}
                    chipActiveStyle={styles.durationChipActive}
                    textStyle={styles.durationChipTitle}
                    textActiveStyle={styles.durationChipTitleActive}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalCancel]}
                      onPress={closeAddBookingModal}
                    >
                      <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalPrimary]}
                      onPress={() => {
                        if (insertMutation.isPending || !selectedFieldId) return;
                        handleAddBooking();
                      }}
                    >
                      {insertMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalPrimaryText}>{t.bookings.modalSave}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
              </InputLayer>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={vbEditOpen}
        transparent
        animationType="slide"
        onRequestClose={closeVbEditModal}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalSheetScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            contentContainerStyle={bookingModalScrollPad}
          >
            <View style={styles.modalCard}>
              <InputLayer>
              <View style={styles.modalHeaderRow}>
                <Pressable
                  onPress={closeVbEditModal}
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.headerBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t.bookings.modalCloseA11y}
                >
                  <Ionicons name="close" size={26} color={palette.text} />
                </Pressable>
                <Text style={styles.modalTitleInHeader}>{t.fields.editBooking}</Text>
                <View style={styles.modalHeaderSpacer} />
              </View>
              <Text style={styles.inputLabel}>{t.bookings.venueNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditVenueName}
                onChangeText={setVbEditVenueName}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.venueIdLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditVenueId}
                onChangeText={setVbEditVenueId}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.fields.selectDate}</Text>
              <TextInput style={styles.input} value={vbEditDate} onChangeText={setVbEditDate} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
              <TextInput style={styles.input} value={vbEditStart} onChangeText={setVbEditStart} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.durationLabel}</Text>
              <Text style={[styles.warnText, { marginBottom: 6 }]}>{t.bookings.venueDurationHint}</Text>
              <TextInput
                style={styles.input}
                value={vbEditDuration}
                onChangeText={setVbEditDuration}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.fieldSizeLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditFieldSize}
                onChangeText={setVbEditFieldSize}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.fields.playerNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPlayer}
                onChangeText={setVbEditPlayer}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.playerPhoneLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPhone}
                onChangeText={setVbEditPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.paymentMethodLabel}</Text>
              <BookingPaymentMethodChips
                value={vbEditPayment.trim()}
                onChange={(k) => setVbEditPayment(k)}
                rowStyle={styles.durationChips}
                chipStyle={styles.durationChip}
                chipActiveStyle={styles.durationChipActive}
                textStyle={styles.durationChipTitle}
                textActiveStyle={styles.durationChipTitleActive}
              />
              <Text style={[styles.warnText, { marginBottom: 6 }]}>{t.bookings.paymentMethodCustomHint}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPayment}
                onChangeText={setVbEditPayment}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.priceLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPrice}
                onChangeText={setVbEditPrice}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.bookingStatusLabel}</Text>
              <View style={styles.durationChips}>
                {(
                  [
                    ["pending", t.bookings.statusPending],
                    ["approved", t.bookings.statusApproved],
                    ["rejected", t.bookings.statusRejected],
                    ["cancelled", t.bookings.statusCancelled],
                    ["confirmed", t.bookings.statusConfirmed]
                  ] as const
                ).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.durationChip, vbEditStatus === key && styles.durationChipActive]}
                    onPress={() => setVbEditStatus(key)}
                  >
                    <Text
                      style={[styles.durationChipTitle, vbEditStatus === key && styles.durationChipTitleActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={closeVbEditModal}>
                  <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary]}
                  onPress={() => {
                    if (vbUpdateMutation.isPending) return;
                    vbUpdateMutation.mutate();
                  }}
                >
                  {vbUpdateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>{t.bookings.modalSave}</Text>
                  )}
                </TouchableOpacity>
              </View>
              </InputLayer>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={fsEditOpen}
        transparent
        animationType="slide"
        onRequestClose={closeFsEditModal}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalSheetScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            contentContainerStyle={bookingModalScrollPad}
          >
            <View style={styles.modalCard}>
              <InputLayer>
              <View style={styles.modalHeaderRow}>
                <Pressable
                  onPress={closeFsEditModal}
                  style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.headerBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t.bookings.modalCloseA11y}
                >
                  <Ionicons name="close" size={26} color={palette.text} />
                </Pressable>
                <Text style={styles.modalTitleInHeader}>{t.fields.editBooking}</Text>
                <View style={styles.modalHeaderSpacer} />
              </View>
              <Text style={styles.inputLabel}>{t.fields.selectDate}</Text>
              <TextInput style={styles.input} value={fsEditDate} onChangeText={setFsEditDate} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
              <TextInput style={styles.input} value={fsEditStart} onChangeText={setFsEditStart} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.durationMinutesLabel}</Text>
              <View style={styles.durationChips}>
                {BOOKING_DURATION_MINUTES_OPTIONS.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durationChip, fsEditDuration === mins && styles.durationChipActive]}
                    onPress={() => setFsEditDuration(mins)}
                  >
                    <Text
                      style={[
                        styles.durationChipTitle,
                        fsEditDuration === mins && styles.durationChipTitleActive
                      ]}
                    >
                      {mins === 60 ? t.bookings.durationOneHour : t.bookings.durationOneHalfHour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>{t.bookings.priceLabel}</Text>
              <TextInput
                style={styles.input}
                value={fsEditPrice}
                onChangeText={setFsEditPrice}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.paymentMethodLabel}</Text>
              <BookingPaymentMethodChips
                value={fsEditPaymentMethod}
                onChange={setFsEditPaymentMethod}
                rowStyle={styles.durationChips}
                chipStyle={styles.durationChip}
                chipActiveStyle={styles.durationChipActive}
                textStyle={styles.durationChipTitle}
                textActiveStyle={styles.durationChipTitleActive}
              />
              <Text style={styles.inputLabel}>{t.fields.servicesLabel}</Text>
              <TextInput
                style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
                value={fsEditServices}
                onChangeText={setFsEditServices}
                textAlign="right"
                multiline
              />
              <Text style={styles.inputLabel}>{t.fields.sourceLabel}</Text>
              <View style={styles.durationChips}>
                <TouchableOpacity
                  style={[styles.durationChip, fsEditSource === "manual" && styles.durationChipActive]}
                  onPress={() => setFsEditSource("manual")}
                >
                  <Text
                    style={[styles.durationChipTitle, fsEditSource === "manual" && styles.durationChipTitleActive]}
                  >
                    {t.fields.sourceManual}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationChip, fsEditSource === "player" && styles.durationChipActive]}
                  onPress={() => setFsEditSource("player")}
                >
                  <Text
                    style={[styles.durationChipTitle, fsEditSource === "player" && styles.durationChipTitleActive]}
                  >
                    {t.fields.sourcePlayer}
                  </Text>
                </TouchableOpacity>
              </View>
              {fsEditSource === "player" ? (
                <>
                  <Text style={styles.inputLabel}>{t.fields.playerNameLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={fsEditPlayer}
                    onChangeText={setFsEditPlayer}
                    textAlign="right"
                  />
                </>
              ) : null}
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={closeFsEditModal}>
                  <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary]}
                  onPress={() => {
                    if (fsUpdateMutation.isPending) return;
                    fsUpdateMutation.mutate();
                  }}
                >
                  {fsUpdateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>{t.bookings.modalSave}</Text>
                  )}
                </TouchableOpacity>
              </View>
              </InputLayer>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};
