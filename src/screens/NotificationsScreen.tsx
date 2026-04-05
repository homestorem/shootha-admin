import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import dayjs from "../lib/dayjs";
import { t } from "../strings";
import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../theme/colors";
import { cardElevation, radius, spacing } from "../theme/tokens";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationRead,
  subscribeNotificationsForUser,
  type NotificationRow
} from "../lib/notificationsApi";
import Toast from "react-native-toast-message";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "../navigation/AppNavigator";

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const userId = user?.id;
  /** نفس القيمة التي يرسلها الداشبورد في حقل `userId` داخل مستند الإشعار */
  const ownerPublicId = user?.ownerId ?? (userId ? deriveOwnerIdFromUid(userId) : "");

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const notificationBaselineRef = useRef<NotificationRow[] | null>(null);

  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) {
      setLoading(false);
      setRows([]);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const unsub = subscribeNotificationsForUser(
      userId,
      ownerPublicId || null,
      (next) => {
        setRows(next);
        setLoading(false);
        setLoadError(null);
      },
      (e) => {
        setLoadError(e);
        setLoading(false);
      }
    );

    return unsub;
  }, [userId, ownerPublicId, retryKey]);

  const refetch = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const onRefresh = useCallback(async () => {
    if (!userId || !isFirebaseConfigured()) return;
    setRefreshing(true);
    try {
      const next = await fetchNotificationsForUser(userId, ownerPublicId || null);
      setRows(next);
    } finally {
      setRefreshing(false);
    }
  }, [userId, ownerPublicId]);

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsReadForUser(userId!, ownerPublicId || null),
    onSuccess: () => {
      Toast.show({ type: "success", text1: t.notifications.allUpdatedToast });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : t.notifications.loadError;
      Toast.show({ type: "error", text1: msg });
    }
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(userId!, id)
  });

  const items = rows;
  const unreadCount = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (loading && items.length === 0) return;
    const prev = notificationBaselineRef.current;
    notificationBaselineRef.current = items;
    if (prev === null) return;

    const prevIds = new Set(prev.map((r) => r.id));
    for (const n of items) {
      if (prevIds.has(n.id)) continue;
      if (n.type !== "booking" || n.is_read) continue;
      Toast.show({
        type: "info",
        text1: t.notifications.newBookingToastTitle,
        text2: n.title || t.notifications.newBookingToastSub,
        visibilityTime: 5000,
        onPress: () => {
          Toast.hide();
          navigation.navigate(
            "Home",
            n.booking_ui_id ? { openBookingId: n.booking_ui_id } : undefined
          );
        }
      });
    }
  }, [items, loading, navigation]);

  const notificationTypeLabel = (type: NotificationRow["type"]): string | null => {
    if (type === "booking") return t.notifications.typeBooking;
    if (type === "approval") return t.notifications.typeApproval;
    if (type === "system") return t.notifications.typeSystem;
    return null;
  };

  const showNoAuth = !userId;
  const showNoEnv = !isFirebaseConfigured();

  const listHeader = (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.title}>{t.notifications.title}</Text>
        <Text style={styles.sub}>
          {unreadCount > 0
            ? `${unreadCount} ${t.notifications.unreadSuffix}`
            : t.notifications.noNewAlerts}
        </Text>
      </View>
      {items.length > 0 && unreadCount > 0 && (
        <TouchableOpacity
          onPress={() => userId && markAllMutation.mutate()}
          disabled={markAllMutation.isPending}
          hitSlop={12}
        >
          {markAllMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.markAll}>{t.notifications.markAllRead}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (showNoAuth) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{t.notifications.title}</Text>
              <Text style={styles.sub}>{t.notifications.loginRequiredSubtitle}</Text>
            </View>
          </View>
          <EmptyState
            icon="lock-closed-outline"
            title={t.notifications.guestEmptyTitle}
            subtitle={t.notifications.loginRequiredSubtitle}
          />
        </View>
      </ScreenShell>
    );
  }

  if (showNoEnv) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          <Text style={styles.title}>{t.notifications.title}</Text>
          <EmptyState
            icon="settings-outline"
            title={t.notifications.emptyStateBackendTitle}
            subtitle={t.notifications.needBackendSync}
          />
        </View>
      </ScreenShell>
    );
  }

  if (loading && items.length === 0) {
    return (
      <ScreenShell>
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      </ScreenShell>
    );
  }

  if (loadError) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          <Text style={styles.title}>{t.notifications.title}</Text>
          <EmptyState
            icon="alert-circle-outline"
            title={t.notifications.loadError}
            subtitle={loadError.message}
          />
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryText}>{t.common.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.root}>
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title={t.notifications.emptyTitle}
              subtitle={t.notifications.emptySubtitle}
            />
          }
          contentContainerStyle={styles.listPadGrow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const read = Boolean(item.is_read);
            const typeLabel = notificationTypeLabel(item.type);
            const canOpenBooking = item.type === "booking" && Boolean(item.booking_ui_id);
            const rowDisabled = markOneMutation.isPending || (read && !canOpenBooking);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={rowDisabled}
                onPress={() => {
                  if (canOpenBooking && item.booking_ui_id) {
                    navigation.navigate("Home", { openBookingId: item.booking_ui_id });
                    if (!read) markOneMutation.mutate(item.id);
                    return;
                  }
                  if (!read) markOneMutation.mutate(item.id);
                }}
              >
                <View style={[cardElevation(), styles.card, !read && styles.cardUnread]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardTime}>
                      {item.created_at ? dayjs(item.created_at).fromNow() : ""}
                    </Text>
                  </View>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  {canOpenBooking ? (
                    <Text style={styles.openHint}>{t.notifications.openBookingHint}</Text>
                  ) : null}
                  {typeLabel ? <Text style={styles.typeTag}>{typeLabel}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontWeight: "600"
  },
  retryBtn: {
    marginTop: spacing.lg,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border
  },
  retryText: {
    color: colors.primary,
    fontWeight: "700"
  },
  root: {
    flex: 1,
    paddingTop: 8
  },
  list: {
    flex: 1
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingTop: 8
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    letterSpacing: -0.5
  },
  sub: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "right",
    fontWeight: "500"
  },
  markAll: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 6
  },
  listPadGrow: {
    paddingBottom: 100,
    paddingTop: spacing.sm,
    flexGrow: 1
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  cardUnread: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
    color: colors.text
  },
  cardTime: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: "700"
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 22,
    fontWeight: "500"
  },
  typeTag: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: "right",
    fontWeight: "700"
  },
  openHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.primary,
    textAlign: "right",
    fontWeight: "700"
  }
});
