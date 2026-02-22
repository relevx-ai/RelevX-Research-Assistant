import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList } from "react-native";
import { TIMEZONES } from "@/lib/constants/timezones";
import type { Frequency } from "core";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface ScheduleSectionProps {
  frequency: Frequency;
  deliveryTime: string; // HH:MM 24h
  timezone: string;
  dayOfWeek: number;
  dayOfMonth: number;
  onChangeTime: (time: string) => void;
  onChangeTimezone: (tz: string) => void;
  onChangeDayOfWeek: (day: number) => void;
  onChangeDayOfMonth: (day: number) => void;
}

function parse24To12(time: string) {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: h, minute: m, ampm };
}

function to24(hour: number, minute: number, ampm: string): string {
  let h = hour;
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function ScheduleSection({
  frequency,
  deliveryTime,
  timezone,
  dayOfWeek,
  dayOfMonth,
  onChangeTime,
  onChangeTimezone,
  onChangeDayOfWeek,
  onChangeDayOfMonth,
}: ScheduleSectionProps) {
  const [showTimezone, setShowTimezone] = useState(false);
  const parsed = parse24To12(deliveryTime);

  if (frequency === "once") {
    return (
      <View className="rounded-xl bg-slate-100 p-4 dark:bg-slate-700">
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          This project will run immediately after creation.
        </Text>
      </View>
    );
  }

  const currentTz = TIMEZONES.find((tz) => tz.value === timezone);

  return (
    <View className="gap-4">
      {/* Day of Week (weekly) */}
      {frequency === "weekly" && (
        <View>
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Day of Week
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day, i) => (
              <TouchableOpacity
                key={day}
                className={`rounded-lg px-3 py-2 ${
                  dayOfWeek === i
                    ? "bg-brand-600"
                    : "bg-slate-100 dark:bg-slate-700"
                }`}
                onPress={() => onChangeDayOfWeek(i)}
              >
                <Text
                  className={`text-xs font-medium ${
                    dayOfWeek === i
                      ? "text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Day of Month (monthly) */}
      {frequency === "monthly" && (
        <View>
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Day of Month
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <TouchableOpacity
                key={day}
                className={`h-9 w-9 items-center justify-center rounded-lg ${
                  dayOfMonth === day
                    ? "bg-brand-600"
                    : "bg-slate-100 dark:bg-slate-700"
                }`}
                onPress={() => onChangeDayOfMonth(day)}
              >
                <Text
                  className={`text-xs font-medium ${
                    dayOfMonth === day
                      ? "text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Time picker */}
      <View>
        <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Delivery Time
        </Text>
        <View className="flex-row items-center gap-2">
          {/* Hour */}
          <View className="flex-1 flex-row items-center rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-700">
            <TouchableOpacity
              onPress={() => {
                const newH = parsed.hour === 1 ? 12 : parsed.hour - 1;
                onChangeTime(to24(newH, parsed.minute, parsed.ampm));
              }}
            >
              <Text className="px-1 text-lg text-slate-400">-</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-base font-medium text-slate-800 dark:text-slate-200">
              {parsed.hour}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const newH = parsed.hour === 12 ? 1 : parsed.hour + 1;
                onChangeTime(to24(newH, parsed.minute, parsed.ampm));
              }}
            >
              <Text className="px-1 text-lg text-slate-400">+</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-lg font-bold text-slate-400">:</Text>

          {/* Minute */}
          <View className="flex-1 flex-row items-center rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-700">
            <TouchableOpacity
              onPress={() => {
                const newM = parsed.minute === 0 ? 59 : parsed.minute - 1;
                onChangeTime(to24(parsed.hour, newM, parsed.ampm));
              }}
            >
              <Text className="px-1 text-lg text-slate-400">-</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-base font-medium text-slate-800 dark:text-slate-200">
              {parsed.minute.toString().padStart(2, "0")}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const newM = parsed.minute === 59 ? 0 : parsed.minute + 1;
                onChangeTime(to24(parsed.hour, newM, parsed.ampm));
              }}
            >
              <Text className="px-1 text-lg text-slate-400">+</Text>
            </TouchableOpacity>
          </View>

          {/* AM/PM */}
          <TouchableOpacity
            className="rounded-xl bg-brand-100 px-4 py-2.5 dark:bg-brand-900"
            onPress={() => {
              const newAmpm = parsed.ampm === "AM" ? "PM" : "AM";
              onChangeTime(to24(parsed.hour, parsed.minute, newAmpm));
            }}
          >
            <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {parsed.ampm}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timezone */}
      <View>
        <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Timezone
        </Text>
        <TouchableOpacity
          className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-700"
          onPress={() => setShowTimezone(true)}
        >
          <Text className="text-sm text-slate-800 dark:text-slate-200">
            {currentTz?.label || timezone}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timezone modal */}
      <Modal visible={showTimezone} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
            <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Select Timezone
            </Text>
            <TouchableOpacity onPress={() => setShowTimezone(false)}>
              <Text className="text-brand-600 font-medium">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={TIMEZONES}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 ${
                  timezone === item.value ? "bg-brand-50 dark:bg-brand-950" : ""
                }`}
                onPress={() => {
                  onChangeTimezone(item.value);
                  setShowTimezone(false);
                }}
              >
                <Text
                  className={`text-sm ${
                    timezone === item.value
                      ? "font-semibold text-brand-600 dark:text-brand-400"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
