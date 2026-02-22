import { useState } from "react";
import { View, Text, TouchableOpacity, Share } from "react-native";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { RelevxDeliveryLog } from "core";

interface DeliveryLogCardProps {
  log: RelevxDeliveryLog;
  timezone: string;
}

function formatDeliveryDate(timestamp: number, timezone: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "success":
      return "text-green-600 dark:text-green-400";
    case "failed":
      return "text-red-600 dark:text-red-400";
    case "partial":
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "text-slate-500";
  }
}

export function DeliveryLogCard({ log, timezone }: DeliveryLogCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        title: log.reportTitle,
        message: log.reportMarkdown,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <View className="mx-4 mb-3 rounded-2xl bg-white dark:bg-slate-800">
      <TouchableOpacity
        className="p-4"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
              numberOfLines={2}
            >
              {log.reportTitle}
            </Text>
            <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {log.deliveredAt
                ? formatDeliveryDate(log.deliveredAt, timezone)
                : "Pending"}
            </Text>
          </View>
          <View className="items-end">
            <Text className={`text-xs font-medium capitalize ${statusColor(log.status)}`}>
              {log.status}
            </Text>
            <Text className="mt-1 text-lg text-slate-400">
              {expanded ? "▲" : "▼"}
            </Text>
          </View>
        </View>

        {log.reportSummary && !expanded && (
          <Text
            className="mt-2 text-xs text-slate-500 dark:text-slate-400"
            numberOfLines={2}
          >
            {log.reportSummary}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <View className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-700">
          {log.reportSummary && (
            <Text className="mb-3 text-sm italic text-slate-600 dark:text-slate-300">
              {log.reportSummary}
            </Text>
          )}

          <MarkdownRenderer content={log.reportMarkdown} />

          <TouchableOpacity
            className="mt-4 flex-row items-center justify-center rounded-lg bg-brand-600 py-2.5"
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Text className="font-medium text-white">Share Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
