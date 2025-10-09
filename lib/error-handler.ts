import { toast } from "@/lib/toast";

/**
 * Custom application error class with error codes
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Common error codes used across the application
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  REQUIRED_FIELD: "REQUIRED_FIELD",

  // Database errors
  DATABASE_ERROR: "DATABASE_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // Business logic errors
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  TABLE_OCCUPIED: "TABLE_OCCUPIED",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  INVALID_ORDER_STATE: "INVALID_ORDER_STATE",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",

  // Generic
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Show a toast notification to the user */
  showToast?: boolean;
  /** Custom toast message (overrides error message) */
  toastMessage?: string;
  /** Log error to console */
  logToConsole?: boolean;
  /** Log error to server (future implementation) */
  logToServer?: boolean;
  /** Additional context for debugging */
  context?: Record<string, any>;
  /** Fallback message if error message is generic */
  fallbackMessage?: string;
}

/**
 * Extract a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "An unexpected error occurred";
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }

  // Check for Supabase errors
  if (error && typeof error === "object") {
    if ("code" in error && typeof error.code === "string") {
      return error.code;
    }
    if ("status" in error && typeof error.status === "number") {
      return `HTTP_${error.status}`;
    }
  }

  return ErrorCodes.UNKNOWN_ERROR;
}

/**
 * Main error handler function
 * Provides consistent error handling across the application
 *
 * @param error - The error to handle
 * @param context - Context information (e.g., function name, operation)
 * @param options - Options for error handling behavior
 * @returns Formatted error information
 *
 * @example
 * ```typescript
 * try {
 *   await fetchOrders();
 * } catch (error) {
 *   const { message, code } = handleError(error, 'fetchOrders', {
 *     showToast: true,
 *     logToConsole: true,
 *     fallbackMessage: 'Failed to load orders'
 *   });
 *   setError(message);
 * }
 * ```
 */
export function handleError(
  error: unknown,
  context: string,
  options: ErrorHandlerOptions = {}
): { message: string; code: string } {
  const {
    showToast = false,
    toastMessage,
    logToConsole = true,
    logToServer = false,
    context: additionalContext,
    fallbackMessage,
  } = options;

  const message = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  const displayMessage = toastMessage || message || fallbackMessage || "An error occurred";

  // Log to console if enabled
  if (logToConsole) {
    console.error(`[${context}] Error:`, {
      message,
      code: errorCode,
      error,
      context: additionalContext,
    });
  }

  // Show toast notification if enabled
  if (showToast) {
    toast.error(displayMessage);
  }

  // Log to server if enabled (placeholder for future implementation)
  if (logToServer) {
    logErrorToServer({
      context,
      message,
      code: errorCode,
      error: error instanceof Error ? error.stack : undefined,
      additionalContext,
    });
  }

  return {
    message: displayMessage,
    code: errorCode,
  };
}

/**
 * Async wrapper that handles errors automatically
 *
 * @example
 * ```typescript
 * const fetchData = withErrorHandler(
 *   async () => {
 *     const data = await supabase.from('orders').select();
 *     return data;
 *   },
 *   'fetchData',
 *   { showToast: true }
 * );
 * ```
 */
export function withErrorHandler<T>(
  fn: () => Promise<T>,
  context: string,
  options: ErrorHandlerOptions = {}
): Promise<T> {
  return fn().catch((error) => {
    handleError(error, context, options);
    throw error;
  });
}

/**
 * React Hook for error handling in components
 *
 * @example
 * ```typescript
 * const { handleError } = useErrorHandler('MyComponent');
 *
 * const fetchData = async () => {
 *   try {
 *     await supabase.from('orders').select();
 *   } catch (error) {
 *     handleError(error, { showToast: true });
 *   }
 * };
 * ```
 */
export function useErrorHandler(componentName: string) {
  return {
    handleError: (error: unknown, options?: ErrorHandlerOptions) =>
      handleError(error, componentName, options),
  };
}

/**
 * Placeholder for server-side error logging
 * Can be implemented later with a logging service
 */
function logErrorToServer(errorData: {
  context: string;
  message: string;
  code: string;
  error?: string;
  additionalContext?: Record<string, any>;
}): void {
  // TODO: Implement server-side error logging
  // Could use a service like Sentry, LogRocket, or custom API endpoint
  console.log("[Server Log]", errorData);
}

/**
 * Validate and throw AppError if validation fails
 *
 * @example
 * ```typescript
 * validateOrThrow(email, 'Email is required', ErrorCodes.REQUIRED_FIELD);
 * validateOrThrow(price > 0, 'Price must be positive', ErrorCodes.VALIDATION_ERROR);
 * ```
 */
export function validateOrThrow(
  condition: any,
  message: string,
  code: ErrorCode = ErrorCodes.VALIDATION_ERROR
): asserts condition {
  if (!condition) {
    throw new AppError(message, code, 400);
  }
}

/**
 * Check if error is a specific type
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("timeout")
    );
  }
  return false;
}

export function isDatabaseError(error: unknown): boolean {
  if (error && typeof error === "object") {
    return "code" in error && typeof error.code === "string" && error.code.startsWith("P");
  }
  return false;
}
