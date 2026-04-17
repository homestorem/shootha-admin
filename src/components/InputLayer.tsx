import React from "react";
import type { ViewProps } from "react-native";

export type InputLayerProps = ViewProps & {
  children: React.ReactNode;
  /** محجوز للتوافق — لم يعد هناك غلاف عرض (كان يكسر اللمس/الكتابة مع zIndex على RN حديثة). */
  variant?: "stack" | "fill";
};

/** مرور مباشر للأطفال: غلاف View+zIndex سبق أن منع وصول اللمس/الإدخال لـ TextInput على بعض الأجهزة. */
export function InputLayer({ children }: InputLayerProps) {
  return <>{children}</>;
}
