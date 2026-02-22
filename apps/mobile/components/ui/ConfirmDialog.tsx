import { Alert } from "react-native";

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      {
        text: options.cancelLabel || "Cancel",
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: options.confirmLabel || "Confirm",
        style: options.destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}
