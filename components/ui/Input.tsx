import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  variant?: "default" | "filled" | "outlined";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      variant = "default",
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
    appearance-none rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1
    disabled:opacity-60 disabled:cursor-not-allowed
    placeholder:text-text-tertiary
  `
      .replace(/\s+/g, " ")
      .trim();

    const variantClasses = {
      default: `
      border border-border bg-white hover:border-gray-400 
      focus:border-brand-primary text-text-primary
    `,
      filled: `
      border border-transparent bg-surface hover:bg-gray-100
      focus:bg-white focus:border-brand-primary text-text-primary
    `,
      outlined: `
      border-2 border-border bg-transparent hover:border-gray-400
      focus:border-brand-primary text-text-primary
    `,
    };

    const sizeClasses = "px-3 py-2.5 text-sm min-h-[44px]";
    const paddingWithIcons =
      leftIcon && rightIcon
        ? "pl-10 pr-10"
        : leftIcon
        ? "pl-10"
        : rightIcon
        ? "pr-10"
        : "";
    const widthClass = fullWidth ? "w-full" : "";

    const inputClasses = `
    ${baseClasses} ${variantClasses[variant]} ${sizeClasses} 
    ${paddingWithIcons} ${widthClass} ${className}
    ${error ? "border-error focus:ring-error focus:border-error" : ""}
  `
      .replace(/\s+/g, " ")
      .trim();

    const wrapperClasses = fullWidth ? "w-full" : "";

    return (
      <div className={wrapperClasses}>
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={inputClasses}
            disabled={disabled}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <div className="mt-1.5">
            {error && <p className="text-sm text-error">{error}</p>}
            {!error && helperText && (
              <p className="text-sm text-text-tertiary">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
