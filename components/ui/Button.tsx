import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "ghost"
    | "outline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none
    active:scale-95 transform-gpu
  `
      .replace(/\s+/g, " ")
      .trim();

    const variantClasses = {
      primary: `
      bg-brand-primary hover:bg-brand-primary-dark text-white 
      shadow-md hover:shadow-lg focus:ring-orange-500
      border border-transparent
    `,
      secondary: `
      bg-surface hover:bg-interactive-hover text-text-primary
      border border-border hover:border-border shadow-sm hover:shadow-md
      focus:ring-gray-500
    `,
      success: `
      bg-success hover:bg-green-600 text-white
      shadow-md hover:shadow-lg focus:ring-green-500
      border border-transparent
    `,
      warning: `
      bg-warning hover:bg-amber-600 text-white
      shadow-md hover:shadow-lg focus:ring-amber-500
      border border-transparent
    `,
      danger: `
      bg-error hover:bg-red-600 text-white
      shadow-md hover:shadow-lg focus:ring-red-500
      border border-transparent
    `,
      ghost: `
      bg-transparent hover:bg-interactive-hover text-text-primary
      border border-transparent focus:ring-gray-500
    `,
      outline: `
      bg-transparent hover:bg-interactive-hover text-text-primary
      border border-border hover:border-gray-400 focus:ring-gray-500
    `,
    };

    const sizeClasses = {
      xs: "px-2.5 py-1.5 text-xs min-h-[28px] gap-1",
      sm: "px-3 py-2 text-sm min-h-[32px] gap-1.5",
      md: "px-4 py-2.5 text-sm min-h-[40px] gap-2",
      lg: "px-5 py-3 text-base min-h-[44px] gap-2.5",
      xl: "px-6 py-3.5 text-lg min-h-[48px] gap-3",
    };

    const widthClass = fullWidth ? "w-full" : "";

    const classes = `
    ${baseClasses} 
    ${variantClasses[variant]} 
    ${sizeClasses[size]} 
    ${widthClass} 
    ${className}
  `
      .replace(/\s+/g, " ")
      .trim();

    const iconSize = {
      xs: "w-3 h-3",
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-5 h-5",
    }[size];

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size === "xs" || size === "sm" ? "sm" : "md"} />
        ) : (
          leftIcon && (
            <span className={`flex-shrink-0 ${iconSize}`}>{leftIcon}</span>
          )
        )}

        <span className="flex-1">{children}</span>

        {!isLoading && rightIcon && (
          <span className={`flex-shrink-0 ${iconSize}`}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
