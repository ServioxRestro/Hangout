interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  variant?: "default" | "primary" | "subtle";
  center?: boolean;
}

export function LoadingSpinner({
  size = "md",
  text,
  className = "",
  variant = "default",
  center = true,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const variantClasses = {
    default: "border-brand-primary",
    primary: "border-brand-primary",
    subtle: "border-text-tertiary",
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const containerClasses = center
    ? "flex flex-col items-center justify-center"
    : "flex items-center gap-2";

  const spinnerClasses = `
    animate-spin rounded-full border-2 border-transparent 
    border-t-current ${sizeClasses[size]} ${variantClasses[variant]}
  `
    .replace(/\s+/g, " ")
    .trim();

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={spinnerClasses} />
      {text && (
        <div
          className={`text-text-secondary ${textSizeClasses[size]} ${
            center ? "mt-2" : ""
          }`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
