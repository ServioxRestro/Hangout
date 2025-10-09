"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "lg",
}: SidePanelProps) {
  const widthClasses = {
    sm: "w-full sm:w-96",
    md: "w-full sm:w-[500px]",
    lg: "w-full sm:w-[600px] lg:w-[700px]",
    xl: "w-full sm:w-[700px] lg:w-[800px]",
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          fixed z-50 bg-white shadow-2xl
          transition-transform duration-300 ease-in-out
          flex flex-col

          ${widthClasses[width]}

          ${
            /* Mobile: Full screen slide-up */
            "inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh] sm:max-h-none"
          }
          ${
            /* Desktop: Right side slide-in */
            "sm:inset-y-0 sm:right-0 sm:rounded-none"
          }
          ${
            /* Animation */
            isOpen
              ? "translate-y-0 sm:translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full"
          }
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
      >
        {/* Mobile: Drag indicator */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0">
            <h2
              id="side-panel-title"
              className="text-2xl font-bold text-gray-900 truncate"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer (optional sticky actions) */}
        {footer && (
          <div className="border-t p-6 bg-white sticky bottom-0">{footer}</div>
        )}
      </div>
    </>
  );
}
