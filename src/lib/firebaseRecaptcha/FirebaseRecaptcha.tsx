import type { FirebaseOptions } from "firebase/app";
import * as React from "react";
import { WebView } from "react-native-webview";
import { getRecaptchaWebViewSource } from "./recaptchaWebViewSource";

type WebViewRef = React.ComponentRef<typeof WebView>;

interface Props extends Omit<React.ComponentProps<typeof WebView>, "source" | "onMessage"> {
  firebaseConfig?: FirebaseOptions;
  /** إصدار سكربتات firebase-app-compat / firebase-auth-compat على gstatic */
  firebaseCompatVersion?: string;
  appVerificationDisabledForTesting?: boolean;
  languageCode?: string;
  onLoad?: () => void;
  onError?: () => void;
  onVerify: (token: string) => void;
  onFullChallenge?: () => void;
  invisible?: boolean;
  verify?: boolean;
}

export default function FirebaseRecaptcha(props: Props) {
  const {
    firebaseConfig,
    firebaseCompatVersion,
    appVerificationDisabledForTesting,
    languageCode,
    onVerify,
    onLoad,
    onError,
    onFullChallenge,
    invisible,
    verify,
    ...otherProps
  } = props;

  const webview = React.useRef<WebViewRef>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (webview.current && loaded && verify) {
      webview.current.injectJavaScript(`
    (function(){
      window.dispatchEvent(new MessageEvent('message', {data: { verify: true }}));
    })();
    true;
    `);
    }
  }, [verify, loaded]);

  if (!firebaseConfig) {
    console.error("FirebaseRecaptcha: Missing firebaseConfig prop.");
    return null;
  }

  return (
    <WebView
      ref={webview}
      javaScriptEnabled
      domStorageEnabled
      automaticallyAdjustContentInsets
      mixedContentMode="always"
      originWhitelist={["https://*", "http://*"]}
      setSupportMultipleWindows={false}
      source={getRecaptchaWebViewSource(firebaseConfig, {
        firebaseCompatVersion,
        appVerificationDisabledForTesting,
        languageCode,
        invisible
      })}
      onError={onError}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as {
            type: string;
            token?: string;
          };
          switch (data.type) {
            case "load":
              setLoaded(true);
              onLoad?.();
              break;
            case "error":
              onError?.();
              break;
            case "verify":
              if (data.token != null) onVerify(data.token);
              break;
            case "fullChallenge":
              onFullChallenge?.();
              break;
            default:
              break;
          }
        } catch {
          onError?.();
        }
      }}
      {...otherProps}
    />
  );
}
