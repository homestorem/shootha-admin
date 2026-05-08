import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "./firebaseClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

function getEasProjectId(): string | null {
  const fromExpoConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const fromManifest = (
    Constants as typeof Constants & {
      easConfig?: { projectId?: string };
    }
  ).easConfig?.projectId;
  return fromExpoConfig || fromManifest || null;
}

export async function ensureNotificationChannelAndroid(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#39FF14",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
  });
}

export async function registerExpoPushTokenForUser(uid: string): Promise<string | null> {
  await ensureNotificationChannelAndroid();

  const perms = await Notifications.getPermissionsAsync();
  let finalStatus = perms.status;
  if (finalStatus !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = getEasProjectId();
  if (!projectId) return null;

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data?.trim();
  if (!token) return null;

  const db = getFirestoreDb();
  await setDoc(
    doc(db, "users", uid),
    {
      pushToken: token,
      pushTokenPlatform: Platform.OS,
      pushTokenUpdatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return token;
}

