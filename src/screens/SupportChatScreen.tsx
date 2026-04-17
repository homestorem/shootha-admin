import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "../providers/SettingsProvider";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import {
  sendOwnerSupportMessage,
  subscribeSupportChatMessages,
  type SupportChatMessage
} from "../services/supportChatFirestore";
import { spacing } from "../theme/tokens";
import type { AppPalette } from "../theme/colors";

export const SupportChatScreen: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const { palette, tr, textAlign, isRTL } = useSettings();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<SupportChatMessage>>(null);
  const permissionToastShown = useRef(false);

  useEffect(() => {
    if (!uid || !isFirebaseConfigured()) {
      setMessages([]);
      setReady(true);
      setLoadError(!isFirebaseConfigured() ? tr("supportChat.needFirebase") : null);
      return;
    }
    setReady(false);
    setLoadError(null);
    const unsub = subscribeSupportChatMessages(
      uid,
      (rows) => {
        setMessages(rows);
        setLoadError(null);
        setReady(true);
      },
      (e) => {
        setReady(true);
        setLoadError(e.message);
        if (e.code === "permission-denied" && !permissionToastShown.current) {
          permissionToastShown.current = true;
          Toast.show({ type: "error", text1: tr("supportChat.permissionHint") });
        }
      }
    );
    return unsub;
  }, [uid, tr]);

  const onSend = useCallback(async () => {
    const t = input.trim();
    if (!t || !uid || sending) return;
    setSending(true);
    try {
      await sendOwnerSupportMessage(uid, t);
      setInput("");
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : tr("supportChat.sendFailed");
      Toast.show({ type: "error", text1: msg });
    } finally {
      setSending(false);
    }
  }, [input, uid, sending, tr]);

  const styles = useMemo(() => makeStyles(palette, isRTL), [palette, isRTL]);

  const renderItem: ListRenderItem<SupportChatMessage> = useCallback(
    ({ item }) => {
      const mine = item.sender === "owner";
      const time =
        item.createdAt?.toDate?.().toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) ?? "";
      return (
        <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>{item.text}</Text>
            {time ? <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{time}</Text> : null}
          </View>
        </View>
      );
    },
    [styles]
  );

  const emptyHint = !uid ? tr("supportChat.needLogin") : loadError ?? tr("supportChat.emptyHint");

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <InputLayer>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { textAlign }]}>{tr("supportChat.statusOpen")}</Text>
            <View style={styles.statusDot} />
          </View>
          {!ready ? (
            <View style={styles.center}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listPad}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { textAlign }]}>{emptyHint}</Text>
                </View>
              }
            />
          )}
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
            <TextInput
              style={[styles.input, { textAlign, writingDirection: isRTL ? "rtl" : "ltr" }]}
              placeholder={tr("supportChat.inputPlaceholder")}
              placeholderTextColor={palette.textSubtle}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={4000}
              editable={!!uid && isFirebaseConfigured() && !sending}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
              onPress={() => void onSend()}
              disabled={!input.trim() || sending || !uid}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={isRTL ? "arrow-forward" : "send"} size={22} color="#fff" />
              )}
            </Pressable>
          </View>
        </InputLayer>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
};

function makeStyles(palette: AppPalette, isRTL: boolean) {
  const isDark = palette.scheme === "dark";
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    statusRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs
    },
    statusLabel: { fontSize: 13, fontWeight: "700", color: palette.textSubtle },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary },
    listPad: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexGrow: 1 },
    row: { marginVertical: 4, width: "100%" },
    rowMine: { alignItems: isRTL ? "flex-start" : "flex-end" },
    rowTheirs: { alignItems: isRTL ? "flex-end" : "flex-start" },
    bubble: { maxWidth: "85%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { backgroundColor: palette.primary },
    bubbleTheirs: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
    },
    bubbleText: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
    bubbleTextMine: { color: "#fff" },
    bubbleTextTheirs: { color: palette.text },
    time: { fontSize: 11, marginTop: 4, fontWeight: "600" },
    timeMine: { color: "rgba(255,255,255,0.85)" },
    timeTheirs: { color: palette.textSubtle },
    emptyWrap: { paddingVertical: spacing.xl },
    emptyText: { color: palette.textSubtle, fontWeight: "700", lineHeight: 22 },
    composer: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center"
    },
    sendBtnDisabled: { opacity: 0.45 }
  });
}
