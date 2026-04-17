import type { FirebaseOptions } from "firebase/app";

/** إصدار سكربتات Firebase compat على gstatic (متوافق مع RecaptchaVerifier). */
const DEFAULT_FIREBASE_COMPAT_VERSION = "10.14.1";

function validateFirebaseConfig(firebaseConfig?: FirebaseOptions): asserts firebaseConfig is FirebaseOptions {
  if (!firebaseConfig) {
    throw new Error('Missing firebase web configuration (firebaseConfig).');
  }
  if (!firebaseConfig.authDomain) {
    throw new Error('Missing "authDomain" in firebase web configuration.');
  }
}

/**
 * HTML + baseUrl مطابق منطق expo-firebase-recaptcha: Firebase compat + RecaptchaVerifier في WebView.
 * لا يعتمد على expo-firebase-core.
 */
export function getRecaptchaWebViewSource(
  firebaseConfig: FirebaseOptions,
  options: {
    firebaseCompatVersion?: string;
    appVerificationDisabledForTesting?: boolean;
    languageCode?: string;
    invisible?: boolean;
  } = {}
) {
  validateFirebaseConfig(firebaseConfig);
  const firebaseVersion = options.firebaseCompatVersion ?? DEFAULT_FIREBASE_COMPAT_VERSION;
  const appVerificationDisabledForTesting = options.appVerificationDisabledForTesting ?? false;
  const languageCode = options.languageCode ?? "";
  const invisible = options.invisible ?? false;

  const cfgJson = JSON.stringify(firebaseConfig);

  return {
    baseUrl: `https://${firebaseConfig.authDomain}`,
    html: `
<!DOCTYPE html><html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="HandheldFriendly" content="true">
  <script src="https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-auth-compat.js"></script>
  <script type="text/javascript">firebase.initializeApp(${cfgJson});</script>
  <style>
    html, body {
      height: 100%;
      ${invisible ? `padding: 0; margin: 0;` : ``}
    }
    #recaptcha-btn {
      width: 100%;
      height: 100%;
      padding: 0;
      margin: 0;
      border: 0;
      user-select: none;
      -webkit-user-select: none;
    }
  </style>
</head>
<body>
  ${
    invisible
      ? `<button id="recaptcha-btn" type="button" onclick="onClickButton()">Confirm reCAPTCHA</button>`
      : `<div id="recaptcha-cont" class="g-recaptcha"></div>`
  }
  <script>
    var fullChallengeTimer;
    function onVerify(token) {
      if (fullChallengeTimer) {
        clearInterval(fullChallengeTimer);
        fullChallengeTimer = undefined;
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'verify',
        token: token
      }));
    }
    function onLoad() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'load'
      }));
      firebase.auth().settings.appVerificationDisabledForTesting = ${appVerificationDisabledForTesting};
      ${languageCode ? `firebase.auth().languageCode = '${languageCode.replace(/'/g, "\\'")}';` : ""}
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("${
        invisible ? "recaptcha-btn" : "recaptcha-cont"
      }", {
        size: "${invisible ? "invisible" : "normal"}",
        callback: onVerify
      });
      window.recaptchaVerifier.render();
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error'
      }));
    }
    function onClickButton() {
      if (!fullChallengeTimer) {
        fullChallengeTimer = setInterval(function() {
          var iframes = document.getElementsByTagName("iframe");
          var isFullChallenge = false;
          for (var i = 0; i < iframes.length; i++) {
            var parentWindow = iframes[i].parentNode ? iframes[i].parentNode.parentNode : undefined;
            var isHidden = parentWindow && parentWindow.style.opacity == 0;
            isFullChallenge = isFullChallenge || (
              !isHidden &&
              ((iframes[i].title === 'recaptcha challenge') ||
               (iframes[i].src.indexOf('google.com/recaptcha/api2/bframe') >= 0)));
          }
          if (isFullChallenge) {
            clearInterval(fullChallengeTimer);
            fullChallengeTimer = undefined;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'fullChallenge'
            }));
          }
        }, 100);
      }
    }
    window.addEventListener('message', function(event) {
      if (event.data && event.data.verify) {
        document.getElementById('recaptcha-btn').click();
      }
    });
  </script>
  <script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit&hl=${languageCode}" onerror="onError()"></script>
</body></html>`
  };
}
