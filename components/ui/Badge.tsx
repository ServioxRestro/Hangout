import { ReactNode } from "react";

interface BadgeProps {
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({
  variant = "default",
  size = "md",
  children,
  className = "",
  dot = false,
}: BadgeProps) {
  const baseClasses = `
    inline-flex items-center font-medium transition-all duration-200
    ${dot ? "rounded-full" : "rounded-full"}
  `
    .replace(/\s+/g, " ")
    .trim();

  const variantClasses = {
    default: "bg-gray-100 text-gray-700 border border-gray-200",
    primary: "bg-brand-primary text-white border border-brand-primary",
    success: "bg-success-light text-green-700 border border-green-200",
    warning: "bg-warning-light text-amber-700 border border-amber-200",
    danger: "bg-error-light text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    outline: "bg-transparent text-text-secondary border border-border",
  };

  const sizeClasses = {
    xs: dot ? "w-2 h-2" : "px-1.5 py-0.5 text-xs min-h-[18px]",
    sm: dot ? "w-2.5 h-2.5" : "px-2 py-0.5 text-xs min-h-[20px]",
    md: dot ? "w-3 h-3" : "px-2.5 py-1 text-sm min-h-[24px]",
    lg: dot ? "w-3.5 h-3.5" : "px-3 py-1.5 text-sm min-h-[28px]",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (dot) {
    return <span className={classes} />;
  }

  return <span className={classes}>{children}</span>;
}
