import { useColorScheme } from "react-native";
import Markdown from "react-native-markdown-display";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const styles = {
    body: {
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontSize: 14,
      lineHeight: 22,
    },
    heading1: {
      color: isDark ? "#f8fafc" : "#0f172a",
      fontSize: 22,
      fontWeight: "bold" as const,
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      color: isDark ? "#f8fafc" : "#0f172a",
      fontSize: 18,
      fontWeight: "bold" as const,
      marginTop: 14,
      marginBottom: 6,
    },
    heading3: {
      color: isDark ? "#f1f5f9" : "#1e293b",
      fontSize: 16,
      fontWeight: "600" as const,
      marginTop: 12,
      marginBottom: 4,
    },
    link: {
      color: "#3b82f6",
    },
    blockquote: {
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
      borderLeftColor: "#3b82f6",
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    code_inline: {
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontSize: 13,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
      color: isDark ? "#e2e8f0" : "#1e293b",
      fontSize: 13,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    list_item: {
      marginVertical: 2,
    },
    hr: {
      backgroundColor: isDark ? "#334155" : "#e2e8f0",
      marginVertical: 12,
    },
  };

  return <Markdown style={styles}>{content}</Markdown>;
}
