import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "interactive" | "bordered";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const baseClasses = "rounded-xl transition-all duration-200";

  const variantClasses = {
    default: "bg-white border border-border",
    elevated: "bg-white shadow-lg border border-border-light",
    interactive:
      "bg-white border border-border hover:shadow-md hover:border-gray-300 cursor-pointer active:scale-[0.98]",
    bordered: "bg-white border-2 border-border",
  };

  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`border-b border-border-light pb-3 mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3 className={`text-title font-semibold text-text-primary ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`border-t border-border-light pt-3 mt-4 ${className}`}>
      {children}
    </div>
  );
}
