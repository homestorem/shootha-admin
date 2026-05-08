export type MainAppStackParamList = {
  MainTabs: undefined;
  DailySchedule: undefined;
  FieldManage: { fieldId: string; fieldName: string };
  PostMatch: {
    mode: "owner" | "venue";
    ownerBookingId?: string;
    venueBookingId?: string;
  };
  Wallet: undefined;
  SocialPlatforms: undefined;
  FieldDataRequest: undefined;
  SupportContact: undefined;
  TermsConditions: undefined;
  PrivacyPolicy: undefined;
  DeleteAccountPhone: undefined;
  DeleteAccountOtp: { phone: string };
};
