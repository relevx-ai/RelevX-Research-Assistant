import { View, Text, TouchableOpacity } from "react-native";
import type { Frequency } from "core";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "once", label: "Once" },
];

interface FrequencyPickerProps {
  value: Frequency;
  onChange: (value: Frequency) => void;
  disabled?: boolean;
}

export function FrequencyPicker({
  value,
  onChange,
  disabled,
}: FrequencyPickerProps) {
  return (
    <View className="flex-row gap-2">
      {FREQUENCIES.map((freq) => {
        const isSelected = value === freq.value;
        return (
          <TouchableOpacity
            key={freq.value}
            className={`flex-1 rounded-xl py-2.5 ${
              isSelected
                ? "bg-brand-600"
                : "bg-slate-100 dark:bg-slate-700"
            } ${disabled ? "opacity-50" : ""}`}
            onPress={() => !disabled && onChange(freq.value)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text
              className={`text-center text-sm font-medium ${
                isSelected
                  ? "text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {freq.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
