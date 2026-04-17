import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
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
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import { useSettings } from "../providers/SettingsProvider";
import { makeFieldsStyles } from "./fieldsScreenStyles";
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
import { DailyScheduleSection } from "../components/DailyScheduleSection";
export const FieldsScreen: React.FC = () => {
  const { palette, tr } = useSettings();
  const styles = useMemo(() => makeFieldsStyles(palette), [palette]);
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
    enabled: canUse,
    staleTime: 60_000
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
      Toast.show({ type: "success", text1: tr("common.done") });
    },
    onError: () => {
      Toast.show({ type: "error", text1: tr("fields.loadError") });
    }
  });

  const statusLabel = (s: FieldOperationalStatus) => {
    if (s === "closed") return tr("fields.statusClosed");
    if (s === "maintenance") return tr("fields.statusMaintenance");
    return tr("fields.statusOpen");
  };

  const statusColor = (s: FieldOperationalStatus) => {
    if (s === "closed") return palette.danger;
    if (s === "maintenance") return palette.accent;
    return palette.primary;
  };

  const openMenu = (item: OwnerFieldDoc) => {
    const goManage = () =>
      navigation.getParent()?.navigate("FieldManage", { fieldId: item.id, fieldName: item.name });

    if (item.source === "dashboard") {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [tr("fields.actionManage"), tr("common.cancel")],
            cancelButtonIndex: 1,
            title: item.name
          },
          (i) => {
            if (i === 0) goManage();
          }
        );
      } else {
        Alert.alert(item.name, "", [
          { text: tr("fields.actionManage"), onPress: goManage },
          { text: tr("common.cancel"), style: "cancel" }
        ]);
      }
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            tr("fields.actionClose"),
            tr("fields.actionMaintenance"),
            tr("fields.actionOpen"),
            tr("fields.actionManage"),
            tr("common.cancel")
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
      Alert.alert(item.name, tr("fields.menuTitle"), [
        { text: tr("fields.actionClose"), onPress: () => statusMutation.mutate({ id: item.id, status: "closed" }) },
        {
          text: tr("fields.actionMaintenance"),
          onPress: () => statusMutation.mutate({ id: item.id, status: "maintenance" })
        },
        { text: tr("fields.actionOpen"), onPress: () => statusMutation.mutate({ id: item.id, status: "open" }) },
        { text: tr("fields.actionManage"), onPress: goManage },
        { text: tr("common.cancel"), style: "cancel" }
      ]);
    }
  };

  if (!uid) {
    return (
      <ScreenShell>
        <View style={styles.pad}>
          <Text style={styles.title}>{tr("fields.title")}</Text>
          <EmptyState icon="lock-closed-outline" title={tr("home.emptyTitle")} subtitle={tr("home.loginRequiredBookings")} />
        </View>
      </ScreenShell>
    );
  }

  if (!isFirebaseConfigured()) {
    return (
      <ScreenShell>
        <View style={styles.pad}>
          <Text style={styles.title}>{tr("fields.title")}</Text>
          <EmptyState icon="cloud-offline-outline" title={tr("fields.needFirebase")} subtitle={tr("fields.needFirebase")} />
        </View>
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell>
        <View style={styles.pad}>
          <Text style={styles.title}>{tr("fields.title")}</Text>
          <EmptyState icon="alert-circle-outline" title={tr("fields.loadError")} subtitle="" />
          <Pressable style={styles.retry} onPress={() => refetch()}>
            <Text style={styles.retryText}>{tr("common.tryAgain")}</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.root}>
        <NeonHeroHeader
          palette={palette}
          title={tr("fields.title")}
          rightAccessory={<Ionicons name="football" size={24} color="#FFFFFF" />}
          compact
        />
        <FlatList
          data={fields}
          keyExtractor={(item) => item.id}
          contentContainerStyle={fields.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={palette.primary} />
          }
          ListHeaderComponent={<DailyScheduleSection />}
          ListEmptyComponent={
            isPending ? (
              <View style={[styles.center, { paddingVertical: 48 }]}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={styles.loading}>{tr("common.loading")}</Text>
              </View>
            ) : (
              <EmptyState icon="football-outline" title={tr("fields.emptyTitle")} subtitle={tr("fields.emptySubtitle")} />
            )
          }
          renderItem={({ item }) => {
            const isOpen = item.status === "open";
            return (
              <View style={styles.cardShell}>
                <View
                  style={[
                    styles.cardFill,
                    palette.scheme === "dark" ? styles.cardFillDark : styles.cardFillLight
                  ]}
                  pointerEvents="none"
                />
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardText}>
                      <Text style={styles.fieldName}>{item.name}</Text>
                      {item.location ? <Text style={styles.loc}>{item.location}</Text> : null}
                      {item.fieldSize ? (
                        <Text style={styles.loc}>
                          {tr("fields.fieldSizeShort")}: {item.fieldSize}
                        </Text>
                      ) : null}
                      {item.source === "dashboard" ? (
                        <Text style={styles.dashBadge}>{tr("fields.dashboardFieldBadge")}</Text>
                      ) : null}
                      <Pressable
                        onPress={() => openMenu(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                      >
                        <Text
                          style={[styles.badge, isOpen ? styles.badgeOpen : { color: statusColor(item.status) }]}
                        >
                          {statusLabel(item.status)}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <Pressable
                    style={styles.manageLink}
                    onPress={() =>
                      navigation.getParent()?.navigate("FieldManage", { fieldId: item.id, fieldName: item.name })
                    }
                  >
                    <Text style={styles.manageLinkText}>{tr("fields.actionManage")}</Text>
                    <Ionicons name="chevron-back" size={18} color={palette.primary} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>
    </ScreenShell>
  );
};
