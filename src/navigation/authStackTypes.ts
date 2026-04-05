export type AuthStackParamList = {
  AuthHub: undefined;
  SignUp: undefined;
  PhoneLogin: undefined;
  OtpVerify: { phone: string; flow: "login" | "register"; displayName?: string };
};
