import React from "react";
import { View, Text, TouchableOpacity, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { BOOKING_PAYMENT_KEYS, paymentChipLabel, type BookingPaymentMethodKey } from "../lib/bookingPaymentMethod";

type Props = {
  value: string;
  onChange: (key: BookingPaymentMethodKey) => void;
  chipStyle: StyleProp<ViewStyle>;
  chipActiveStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  textActiveStyle: StyleProp<TextStyle>;
  rowStyle?: StyleProp<ViewStyle>;
};

export function BookingPaymentMethodChips({
  value,
  onChange,
  chipStyle,
  chipActiveStyle,
  textStyle,
  textActiveStyle,
  rowStyle
}: Props) {
  return (
    <View style={rowStyle}>
      {BOOKING_PAYMENT_KEYS.map((key) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[chipStyle, active && chipActiveStyle]}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityLabel={paymentChipLabel(key)}
          >
            <Text style={[textStyle, active && textActiveStyle]}>{paymentChipLabel(key)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
