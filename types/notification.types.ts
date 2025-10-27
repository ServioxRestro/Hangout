export type ToastType = "success" | "error" | "warning" | "info" | "notification";

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // milliseconds, 0 = no auto-dismiss
  sound?: boolean; // play notification sound
}
