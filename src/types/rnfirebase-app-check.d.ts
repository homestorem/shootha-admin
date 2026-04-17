declare module "@react-native-firebase/app-check" {
  export class ReactNativeFirebaseAppCheckProvider {
    configure(options: {
      android: { provider: string; debugToken?: string };
      apple: { provider: string; debugToken?: string };
    }): void;
  }
}
