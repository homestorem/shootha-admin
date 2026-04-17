import type { AppCheck } from "firebase/app-check";

let appCheckInstance: AppCheck | null = null;

export function setFirebaseAppCheckInstance(instance: AppCheck | null): void {
  appCheckInstance = instance;
}

export function getFirebaseAppCheckInstance(): AppCheck | null {
  return appCheckInstance;
}
