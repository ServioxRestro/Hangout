import { toast as hotToast, Toaster } from "react-hot-toast";

/**
 * Toast notification utility wrapper for react-hot-toast
 * Provides consistent toast notifications across the application
 */

export const toast = {
  /**
   * Show a success toast
   * @param message - Success message to display
   */
  success: (message: string) =>
    hotToast.success(message, {
      duration: 3000,
      position: "top-center",
      style: {
        background: "#10b981",
        color: "#fff",
        padding: "16px",
        borderRadius: "8px",
      },
    }),

  /**
   * Show an error toast
   * @param message - Error message to display
   */
  error: (message: string) =>
    hotToast.error(message, {
      duration: 4000,
      position: "top-center",
      style: {
        background: "#ef4444",
        color: "#fff",
        padding: "16px",
        borderRadius: "8px",
      },
    }),

  /**
   * Show a loading toast
   * @param message - Loading message to display
   * @returns Toast ID for dismissal
   */
  loading: (message: string) =>
    hotToast.loading(message, {
      position: "top-center",
      style: {
        background: "#3b82f6",
        color: "#fff",
        padding: "16px",
        borderRadius: "8px",
      },
    }),

  /**
   * Show an info/warning toast
   * @param message - Info message to display
   */
  info: (message: string) =>
    hotToast(message, {
      duration: 3500,
      position: "top-center",
      icon: "ℹ️",
      style: {
        background: "#3b82f6",
        color: "#fff",
        padding: "16px",
        borderRadius: "8px",
      },
    }),

  /**
   * Show a warning toast
   * @param message - Warning message to display
   */
  warning: (message: string) =>
    hotToast(message, {
      duration: 4000,
      position: "top-center",
      icon: "⚠️",
      style: {
        background: "#f59e0b",
        color: "#fff",
        padding: "16px",
        borderRadius: "8px",
      },
    }),

  /**
   * Dismiss a specific toast
   * @param toastId - ID of the toast to dismiss
   */
  dismiss: (toastId: string) => hotToast.dismiss(toastId),

  /**
   * Dismiss all toasts
   */
  dismissAll: () => hotToast.dismiss(),

  /**
   * Show a promise toast with loading, success, and error states
   * @param promise - Promise to track
   * @param messages - Messages for loading, success, and error states
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) =>
    hotToast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        position: "top-center",
        style: {
          padding: "16px",
          borderRadius: "8px",
        },
      }
    ),
};

// Export the Toaster component for use in layout
export { Toaster };

// Export type for toast IDs
export type ToastId = string;
