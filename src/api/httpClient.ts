import axios, { type AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";

const AUTH_ACCESS_TOKEN_KEY = "@shoota_auth_access_token";

/**
 * عميل موحّد لطلبات REST بعد ربط قاعدة البيانات.
 * يضيف `Authorization: Bearer` من جلسة Firebase (معرّف المستخدم) عند توفرها.
 */
export function createApiClient(): AxiosInstance {
  const baseURL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
  const client = axios.create({ baseURL, timeout: 25000 });
  client.interceptors.request.use(async (config) => {
    let token: string | null = null;
    if (isFirebaseConfigured()) {
      try {
        const u = getFirebaseAuth().currentUser;
        if (u) token = await u.getIdToken();
      } catch {
        /* ignore */
      }
    }
    if (!token) {
      token = await AsyncStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return client;
}

let cached: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!cached) cached = createApiClient();
  return cached;
}
