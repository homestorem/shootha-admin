import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  ActionSheetIOS
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";
import { t } from "../strings";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { useAuth } from "../providers/AuthProvider";
import {
  fetchMergedFieldsForUid,
  setOwnerFieldStatus,
  type FieldOperationalStatus,
  type OwnerFieldDoc
} from "../services/ownerFieldsFirestore";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import Toast from "react-native-toast-message";
export const FieldsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const uid = user?.id;
  const canUse = Boolean(uid && isFirebaseConfigured());

  const {
    data: fields = [],
    isPending,
    isError,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ["ownerFields", uid, user?.ownerId],
    queryFn: async () => {
      const ownerPub = user!.ownerId ?? deriveOwnerIdFromUid(user!.id);
      return fetchMergedFieldsForUid(user!.id, ownerPub);
    },
    enabled: canUse
  });

  useFocusEffect(
    useCallback(() => {
      if (canUse) void queryClient.invalidateQueries({ queryKey: ["ownerFields", uid] });
    }, [canUse, queryClient, uid])
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FieldOperationalStatus }) =>
      setOwnerFieldStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ownerFields", uid] });
      Toast.show({ type: "success", text1: t.common.done });
    },
    onError: () => {
      Toast.show({ type: "error", text1: t.fields.loadError });
    }
  });

  const statusLabel = (s: FieldOperationalStatus) => {
    if (s === "closed") return t.fields.statusClosed;
    if (s === "maintenance") return t.fields.statusMaintenance;
    return t.fields.statusOpen;
  };

  const statusColor = (s: FieldOperationalStatus) => {
    if (s === "closed") return colors.danger;
    if (s === "maintenance") return colors.accent;
    return colors.primary;
  };

  const openMenu = (item: OwnerFieldDoc) => {
    const goManage = () =>
      navigation.getParent()?.navigate("FieldManage", { fieldId: item.id, fieldName: item.name });

    if (item.source === "dashboard") {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [t.fields.actionManage, t.common.cancel],
            cancelButtonIndex: 1,
            title: item.name
          },
          (i) => {
            if (i === 0) goManage();
          }
        );
      } else {
        Alert.alert(item.name, "", [
          { text: t.fields.actionManage, onPress: goManage },
          { text: t.common.cancel, style: "cancel" }
        ]);
      }
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t.fields.actionClose,
            t.fields.actionMaintenance,
            t.fields.actionOpen,
            t.fields.actionManage,
            t.common.cancel
          ],
          cancelButtonIndex: 4,
          title: item.name
        },
        (i) => {
          if (i === 0) statusMutation.mutate({ id: item.id, status: "closed" });
          else if (i === 1) statusMutation.mutate({ id: item.id, status: "maintenance" });
          else if (i === 2) statusMutation.mutate({ id: item.id, status: "open" });
          else if (i === 3) goManage();
        }
      );
    } else {
      Alert.alert(item.name, t.fields.menuTitle, [
        { text: t.fields.actionClose, onPress: () => statusMutation.mutate({ id: item.id, status: "closed" }) },
        {
          text: t.fields.actionMaintenance,
          onPress: () => statusMutation.mutate({ id: item.id, status: "maintenance" })
        },
        { text: t.fields.actionOpen, onPress: () => statusMutation.mutate({ id: item.id, status: "open" }) },
        { text: t.fields.actionManage, onPress: goManage },
        { text: t.common.cancel, style: "cancel" }
      ]);
    }
  };

  if (!uid) {
    return (
      <ScreenShell>
        <View style={styles.pad}>
          <Text style={styles.title}>{t.fields.title}</Text>
          <EmptyState icon="lock-closed-outline" title={t.bookings.emptyTitle} subtitle={t.bookings.loginRequiredBookings} />
        </View>
      </ScreenShell>
    );
  }

  if (!isFirebaseConfigured()) {
    return (
      <ScreenShell>
        <View style={styles.pad}>
          <Text style={styles.title}>{t.fields.title}</Text>
          <EmptyState icon="cloud-offline-outline" title={t.fields.needFirebase} subtitle={t.fields.needFirebase} />
        </View>
      </ScreenShell>
    );
  }

  if (isPending && fields.length === 0) {
    return (
      <ScreenShell>
        <View style={[styles.center, styles.flex]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loading}>{t.common.loading}</Text>
        </View>
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell>
        <View style={styles.pad}>
          <Text style={styles.title}>{t.fields.title}</Text>
          <EmptyState icon="alert-circle-outline" title={t.fields.loadError} subtitle="" />
          <Pressable style={styles.retry} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t.common.tryAgain}</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.fields.title}</Text>
          <Text style={styles.sub}>{t.fields.subtitle}</Text>
        </View>
        <FlatList
          data={fields}
          keyExtractor={(item) => item.id}
          contentContainerStyle={fields.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState icon="football-outline" title={t.fields.emptyTitle} subtitle={t.fields.emptySubtitle} />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, cardElevation(true)]}>
              <View style={styles.cardTop}>
                <View style={styles.cardText}>
                  <Text style={styles.fieldName}>{item.name}</Text>
                  {item.location ? <Text style={styles.loc}>{item.location}</Text> : null}
                  {item.fieldSize ? (
                    <Text style={styles.loc}>
                      {t.fields.fieldSizeShort}: {item.fieldSize}
                    </Text>
                  ) : null}
                  {item.source === "dashboard" ? (
                    <Text style={styles.dashBadge}>{t.fields.dashboardFieldBadge}</Text>
                  ) : null}
                  <Text style={[styles.badge, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                </View>
                <Pressable
                  hitSlop={12}
                  onPress={() => openMenu(item)}
                  style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="ellipsis-horizontal-circle" size={28} color={colors.primary} />
                </Pressable>
              </View>
              <Pressable
                style={styles.manageLink}
                onPress={() =>
                  navigation.getParent()?.navigate("FieldManage", { fieldId: item.id, fieldName: item.name })
                }
              >
                <Text style={styles.manageLinkText}>{t.fields.actionManage}</Text>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </Pressable>
            </View>
          )}
        />
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: spacing.sm },
  pad: { padding: spacing.lg },
  flex: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  loading: { marginTop: 12, color: colors.textMuted, fontWeight: "600" },
  header: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "right" },
  sub: { marginTop: 6, fontSize: 14, color: colors.textMuted, textAlign: "right", lineHeight: 20 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  listEmpty: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  cardTop: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
  cardText: { flex: 1 },
  fieldName: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right" },
  loc: { fontSize: 13, color: colors.textMuted, textAlign: "right", marginTop: 4 },
  dashBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "right"
  },
  badge: { marginTop: 8, fontSize: 13, fontWeight: "700", textAlign: "right" },
  menuBtn: { padding: 4 },
  manageLink: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.md,
    gap: 6
  },
  manageLinkText: { fontSize: 15, fontWeight: "800", color: colors.primary },
  retry: {
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full
  },
  retryText: { color: colors.primary, fontWeight: "700" }
});
