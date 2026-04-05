import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "../providers/SettingsProvider";
import { t } from "../strings";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { colors } from "../theme/colors";
import { cardElevation, radius, spacing } from "../theme/tokens";

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useSettings();
  const [name, setName] = useState(user?.display_name || user?.user_metadata?.name || "");
  useEffect(() => {
    setName(user?.display_name || user?.user_metadata?.name || "");
  }, [user?.id, user?.display_name, user?.user_metadata?.name]);
  const [editVisible, setEditVisible] = useState(false);
  const [requestVisible, setRequestVisible] = useState<"field" | "issue" | null>(null);
  const [requestText, setRequestText] = useState("");

  const handleSaveProfile = () => {
    Toast.show({ type: "success", text1: t.profile.saveSuccessToast });
    setEditVisible(false);
  };

  const handleSendRequest = () => {
    Toast.show({ type: "success", text1: t.requests.success });
    setRequestVisible(null);
    setRequestText("");
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={[styles.avatar, cardElevation()]}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={styles.heroName}>{name || "—"}</Text>
          <Text style={styles.heroSub}>{user?.phone || "—"}</Text>
        </View>

        <Text style={styles.pageTitle}>{t.profile.title}</Text>

        <View style={[styles.card, cardElevation()]}>
          <Text style={styles.sectionLabel}>{t.profile.dataSection}</Text>
          <Text style={styles.label}>{t.profile.name}</Text>
          <Text style={styles.value}>{name || "-"}</Text>
          <Text style={styles.label}>{t.profile.phone}</Text>
          <Text style={styles.value}>{user?.phone || "-"}</Text>
          <Text style={styles.label}>{t.profile.fieldName}</Text>
          <Text style={styles.value}>{t.profile.fieldNameExample}</Text>
        </View>

        <View style={[styles.card, cardElevation()]}>
          <Text style={styles.sectionLabel}>{t.profile.settingsSection}</Text>
          <TouchableOpacity style={styles.row} onPress={() => setEditVisible(true)} activeOpacity={0.7}>
            <Text style={styles.rowText}>{t.profile.editProfile}</Text>
            <Ionicons name="chevron-back" size={20} color={colors.textSubtle} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => setRequestVisible("field")} activeOpacity={0.7}>
            <Text style={styles.rowText}>{t.profile.requestFieldChange}</Text>
            <Ionicons name="chevron-back" size={20} color={colors.textSubtle} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => setRequestVisible("issue")} activeOpacity={0.7}>
            <Text style={styles.rowText}>{t.profile.reportIssue}</Text>
            <Ionicons name="chevron-back" size={20} color={colors.textSubtle} />
          </TouchableOpacity>
          <View style={styles.row}>
            <Text style={styles.rowText}>{t.profile.darkMode}</Text>
            <Switch
              value={theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={theme === "dark" ? colors.primary : colors.surfaceCard}
            />
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={styles.logoutText}>{t.auth.logout}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.profile.editProfile}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.profile.name}
              value={name}
              onChangeText={setName}
              textAlign="right"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => setEditVisible(false)}>
                <Text style={styles.modalCancelText}>{t.profile.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimary]} onPress={handleSaveProfile}>
                <Text style={styles.modalPrimaryText}>{t.profile.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!requestVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {requestVisible === "field" ? t.requests.fieldChangeTitle : t.requests.issueTitle}
            </Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: "top" }]}
              placeholder={t.requests.placeholder}
              multiline
              value={requestText}
              onChangeText={setRequestText}
              textAlign="right"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => setRequestVisible(null)}>
                <Text style={styles.modalCancelText}>{t.profile.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimary]} onPress={handleSendRequest}>
                <Text style={styles.modalPrimaryText}>{t.requests.send}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
    paddingTop: spacing.sm
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xl
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.surfaceCard
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3
  },
  heroSub: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600"
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.md,
    letterSpacing: -0.3
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md + 2
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSubtle,
    textAlign: "right",
    marginBottom: spacing.md,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
    fontWeight: "600"
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: spacing.md,
    color: colors.text
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  rowText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "600"
  },
  logoutButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent"
  },
  logoutText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 15
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.lg,
    color: colors.text,
    letterSpacing: -0.3
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    marginBottom: spacing.sm + 2,
    backgroundColor: colors.surfaceMuted,
    color: colors.text
  },
  modalActions: {
    flexDirection: "row-reverse",
    marginTop: spacing.sm + 2
  },
  modalButton: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  modalCancel: {
    backgroundColor: colors.surfaceMuted,
    marginLeft: spacing.sm
  },
  modalPrimary: {
    backgroundColor: colors.primary
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: "800"
  },
  modalPrimaryText: {
    color: colors.textOnPrimary,
    fontWeight: "800"
  }
});
