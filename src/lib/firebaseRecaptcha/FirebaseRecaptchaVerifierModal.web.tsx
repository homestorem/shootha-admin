import { getApp } from "firebase/app";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import * as React from "react";
import { isFirebaseConfigured } from "../../../config/firebase.js";
import type { FirebaseAuthApplicationVerifier } from "./FirebaseRecaptcha.types";

interface Props {
  attemptInvisibleVerification?: boolean;
  appVerificationDisabledForTesting?: boolean;
  languageCode?: string;
  innerRef: React.MutableRefObject<FirebaseAuthApplicationVerifier | null>;
}

/**
 * ويب: نفس منطق expo-firebase-recaptcha — RecaptchaVerifier من firebase/compat.
 */
class FirebaseRecaptchaVerifierModal extends React.Component<Props> {
  private verifier: FirebaseAuthApplicationVerifier | null = null;

  private setRef = (ref: HTMLDivElement | null) => {
    if (ref) {
      if (isFirebaseConfigured() && !firebase.apps.length) {
        firebase.initializeApp(getApp().options);
      }
      if (this.props.appVerificationDisabledForTesting !== undefined) {
        firebase.auth().settings.appVerificationDisabledForTesting = !!this.props.appVerificationDisabledForTesting;
      }
      if (this.props.languageCode) {
        firebase.auth().languageCode = this.props.languageCode;
      }
      this.verifier = new firebase.auth.RecaptchaVerifier(ref, {
        size: this.props.attemptInvisibleVerification ? "invisible" : "normal"
      });
    } else {
      this.verifier = null;
    }
    if (this.props.innerRef) {
      this.props.innerRef.current = this.verifier;
    }
  };

  shouldComponentUpdate(nextProps: Props) {
    return (
      this.props.appVerificationDisabledForTesting !== nextProps.appVerificationDisabledForTesting ||
      this.props.attemptInvisibleVerification !== nextProps.attemptInvisibleVerification ||
      this.props.languageCode !== nextProps.languageCode
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.innerRef !== prevProps.innerRef && this.props.innerRef) {
      this.props.innerRef.current = this.verifier;
    }
  }

  render() {
    const { attemptInvisibleVerification, appVerificationDisabledForTesting, languageCode } = this.props;
    return (
      <div
        style={styles.container}
        key={`${attemptInvisibleVerification ? "invisible" : "visible"}-${
          appVerificationDisabledForTesting ? "testing" : "regular"
        }-${languageCode ?? ""}`}
        id="recaptcha-container"
        ref={this.setRef}
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: { zIndex: 1000 }
};

export default React.forwardRef<
  FirebaseAuthApplicationVerifier | null,
  Omit<Props, "innerRef">
>((props, ref) => <FirebaseRecaptchaVerifierModal {...props} innerRef={ref as React.MutableRefObject<FirebaseAuthApplicationVerifier | null>} />);
