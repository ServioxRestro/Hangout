"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface GuestHeaderProps {
  tableCode: string;
  tableNumber?: number;
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
  userEmail?: string | null;
  activeOrdersCount?: number;
  actions?: React.ReactNode;
}

const headerIcons = {
  back: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  ),
  orders: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),
  menu: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  ),
  user: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  sparkle: (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  ),
};

export function GuestHeader({
  tableCode,
  tableNumber,
  showBackButton = false,
  title,
  subtitle,
  userEmail,
  activeOrdersCount = 0,
  actions,
}: GuestHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-40 border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-brand-orange hover:text-brand-orange-dark hover:bg-brand-orange/10 rounded-xl transition-all duration-300"
                leftIcon={headerIcons.back}
              >
                Back
              </Button>
            )}

            <div className="flex items-center gap-3">
              {/* Restaurant icon */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-orange to-brand-orange-light rounded-xl flex items-center justify-center text-white shadow-lg">
                  <span className="text-lg font-bold">H</span>
                </div>
                <div className="absolute -top-1 -right-1 text-brand-yellow animate-pulse">
                  {headerIcons.sparkle}
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  {title ||
                    process.env.NEXT_PUBLIC_RESTAURANT_NAME ||
                    "Hangout Restaurant"}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {tableNumber && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
                      <span className="font-medium">Table {tableNumber}</span>
                    </div>
                  )}
                  {subtitle && (
                    <>
                      {tableNumber && <span className="text-border">•</span>}
                      <span>{subtitle}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            {activeOrdersCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/t/${tableCode}/orders`)}
                className="relative shadow-lg shadow-brand-orange/30 hover:shadow-xl hover:shadow-brand-orange/40 transition-all duration-300"
                leftIcon={headerIcons.orders}
              >
                <span className="font-medium">{activeOrdersCount} Active</span>
                <Badge
                  variant="warning"
                  size="sm"
                  className="ml-2 animate-bounce"
                >
                  {activeOrdersCount}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Quick Navigation Bar */}
        {(userEmail || activeOrdersCount > 0) && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gradient-subtle">
            <div className="flex items-center gap-3">
              {userEmail && (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-border">
                  <div className="text-brand-orange">{headerIcons.user}</div>
                  <span className="text-sm font-medium text-foreground">
                    {userEmail.split("@")[0]}
                  </span>
                  <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                </div>
              )}
              {activeOrdersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/t/${tableCode}/orders`)}
                  className="text-muted-foreground hover:text-foreground hover:bg-surface-variant rounded-xl transition-all duration-300"
                  leftIcon={headerIcons.orders}
                >
                  View My Orders ({activeOrdersCount})
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/t/${tableCode}`)}
                className="text-muted-foreground hover:text-foreground hover:bg-surface-variant rounded-xl transition-all duration-300"
                leftIcon={headerIcons.menu}
              >
                Menu
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-orange/20 to-transparent" />
    </header>
  );
}
