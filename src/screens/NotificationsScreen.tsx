import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StyleSheet
} from "react-native";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import dayjs from "../lib/dayjs";
import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/EmptyState";
import { useSettings } from "../providers/SettingsProvider";
import { makeNotificationsStyles } from "./notificationsScreenStyles";
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
import { spacing } from "../theme/tokens";
import { rtl } from "../utils/rtl";

function notificationVisuals(type: NotificationRow["type"], primary: string) {
  const t = type ?? "system";
  switch (t) {
    case "booking":
      return {
        icon: "calendar" as const,
        iconColor: primary
      };
    case "approval":
      return {
        icon: "checkmark-done-circle" as const,
        iconColor: "#FFC107"
      };
    case "system":
    default:
      return {
        icon: "sparkles" as const,
        iconColor: "#9E9E9E"
      };
  }
}

export const NotificationsScreen: React.FC = () => {
  const { palette, tr } = useSettings();
  const styles = useMemo(() => makeNotificationsStyles(palette), [palette]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const userId = user?.id;
  /** نفس القيمة التي يرسلها الداشبورد في حقل `userId` داخل مستند الإشعار */
  const ownerPublicId = user?.ownerId ?? (userId ? deriveOwnerIdFromUid(userId) : "");

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const notificationBaselineRef = useRef<NotificationRow[] | null>(null);

  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) {
      setRows([]);
      setLoadError(null);
      return;
    }

    setLoadError(null);

    const unsub = subscribeNotificationsForUser(
      userId,
      ownerPublicId || null,
      (next) => {
        setRows(next);
        setLoadError(null);
      },
      (e) => {
        setLoadError(e);
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
      Toast.show({ type: "success", text1: tr("notifications.allUpdatedToast") });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : tr("notifications.loadError");
      Toast.show({ type: "error", text1: msg });
    }
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(userId!, id)
  });

  const items = rows;
  const unreadCount = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    const prev = notificationBaselineRef.current;
    notificationBaselineRef.current = items;
    if (prev === null) return;

    const prevIds = new Set(prev.map((r) => r.id));
    for (const n of items) {
      if (prevIds.has(n.id)) continue;
      if (n.type !== "booking" || n.is_read) continue;
      Toast.show({
        type: "info",
        text1: tr("notifications.newBookingToastTitle"),
        text2: n.title || tr("notifications.newBookingToastSub"),
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
  }, [items, navigation]);

  const notificationTypeLabel = (type: NotificationRow["type"]): string | null => {
    if (type === "booking") return tr("notifications.typeBooking");
    if (type === "approval") return tr("notifications.typeApproval");
    if (type === "system" || type == null) return tr("notifications.typeSystem");
    return null;
  };

  const showNoAuth = !userId;
  const showNoEnv = !isFirebaseConfigured();

  const heroSubtitle =
    unreadCount > 0
      ? `${unreadCount} ${tr("notifications.unreadSuffix")}`
      : tr("notifications.noNewAlerts");

  const markAllFooter =
    items.length > 0 && unreadCount > 0 ? (
      <TouchableOpacity
        onPress={() => {
          if (markAllMutation.isPending || !userId) return;
          markAllMutation.mutate();
        }}
        hitSlop={12}
        style={styles.markAllPill}
        activeOpacity={0.88}
      >
        {markAllMutation.isPending ? (
          <ActivityIndicator size="small" color={palette.primaryDeep} />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={16} color={palette.primaryDeep} />
            <Text style={styles.markAllPillText}>{tr("notifications.markAllRead")}</Text>
          </>
        )}
      </TouchableOpacity>
    ) : undefined;

  const listHeader = (
    <NeonHeroHeader
      palette={palette}
      title={tr("notifications.title")}
      subtitle={heroSubtitle}
      rightAccessory={<Ionicons name="notifications" size={22} color="rgba(255,255,255,0.95)" />}
      footer={markAllFooter}
    />
  );

  const simpleHero = (subtitle: string) => (
    <NeonHeroHeader
      palette={palette}
      title={tr("notifications.title")}
      subtitle={subtitle}
      rightAccessory={<Ionicons name="notifications" size={22} color="rgba(255,255,255,0.95)" />}
    />
  );

  if (showNoAuth) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          {simpleHero(tr("notifications.loginRequiredSubtitle"))}
          <EmptyState
            icon="lock-closed-outline"
            title={tr("notifications.guestEmptyTitle")}
            subtitle={tr("notifications.loginRequiredSubtitle")}
          />
        </View>
      </ScreenShell>
    );
  }

  if (showNoEnv) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          {simpleHero(tr("notifications.needBackendSync"))}
          <EmptyState
            icon="settings-outline"
            title={tr("notifications.emptyStateBackendTitle")}
            subtitle={tr("notifications.needBackendSync")}
          />
        </View>
      </ScreenShell>
    );
  }

  if (loadError) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          {simpleHero(tr("notifications.loadError"))}
          <EmptyState
            icon="alert-circle-outline"
            title={tr("notifications.loadError")}
            subtitle={loadError.message}
          />
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.88}>
            <Text style={styles.retryText}>{tr("common.tryAgain")}</Text>
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
            <View style={{ paddingTop: spacing.sm }}>
              <EmptyState
                icon="notifications-outline"
                title={tr("notifications.emptyTitle")}
                subtitle={tr("notifications.emptySubtitle")}
              />
            </View>
          }
          contentContainerStyle={styles.listPadGrow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={palette.primary}
              colors={[palette.primary]}
            />
          }
          renderItem={({ item }) => {
            const read = Boolean(item.is_read);
            const typeLabel = notificationTypeLabel(item.type);
            const canOpenBooking = item.type === "booking" && Boolean(item.booking_ui_id);
            const rowDisabled = markOneMutation.isPending || (read && !canOpenBooking);
            const visuals = notificationVisuals(item.type, palette.primary);
            const isDark = palette.scheme === "dark";
            const nt = item.type ?? "system";
            const pillBooking = nt === "booking";
            const pillApproval = nt === "approval";
            const pillSystem = nt === "system";
            return (
              <View style={styles.itemOuter}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={rowDisabled}
                  onPress={() => {
                    if (rowDisabled) return;
                    if (canOpenBooking && item.booking_ui_id) {
                      navigation.navigate("Home", { openBookingId: item.booking_ui_id });
                      if (!read) markOneMutation.mutate(item.id);
                      return;
                    }
                    if (!read) markOneMutation.mutate(item.id);
                  }}
                >
                  <View style={[styles.cardShell, !read && styles.cardShellUnread]}>
                    <View
                      style={[
                        styles.cardTintBase,
                        isDark ? styles.cardTintDark : styles.cardTintLight,
                        nt === "approval" && styles.cardTintWarning
                      ]}
                      pointerEvents="none"
                    />
                    {nt === "booking" ? <View style={styles.accentStripe} /> : null}
                    <View style={styles.cardInner}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemMain}>
                          <Text
                            style={[styles.itemTitle, !read && { fontWeight: "900" }]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          {item.body ? <Text style={styles.itemBody}>{item.body}</Text> : null}
                          <View style={styles.itemMeta}>
                            {typeLabel ? (
                              <View
                                style={[
                                  styles.typePill,
                                  pillBooking && styles.typePillBooking,
                                  pillApproval && styles.typePillApproval,
                                  pillSystem && styles.typePillSystem
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.typePillText,
                                    pillBooking && styles.typePillBookingText,
                                    pillApproval && styles.typePillApprovalText,
                                    pillSystem && styles.typePillSystemText
                                  ]}
                                >
                                  {typeLabel}
                                </Text>
                              </View>
                            ) : null}
                            <View style={styles.timeWrap}>
                              <Ionicons name="time-outline" size={13} color="#9E9E9E" />
                              <Text style={styles.timeText}>
                                {item.created_at ? dayjs(item.created_at).fromNow() : "—"}
                              </Text>
                            </View>
                            {canOpenBooking ? (
                              <View style={styles.ctaInline}>
                                <Ionicons name={rtl.chevronForward} size={14} color={palette.primary} />
                                <Text style={styles.ctaText} numberOfLines={1}>
                                  {tr("notifications.openBookingHint")}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.iconCircle}>
                          <Ionicons name={visuals.icon} size={20} color={visuals.iconColor} />
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    </ScreenShell>
  );
};
