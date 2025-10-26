"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/msg91-widget";

interface AutoLogoutConfig {
  tableCode?: string;
  customerPhone?: string;
  enabled?: boolean;
  logoutDelayMinutes?: number; // Minutes after session ends to logout
  silentLogout?: boolean; // If true, logout silently without warning
}

interface AutoLogoutState {
  isLoggingOut: boolean;
}

/**
 * Auto-logout hook for guest users
 * - Monitors table session status
 * - Silently logs out user 15 minutes after session ends (billing completed)
 * - No warning, just automatic logout (prevents accidental orders from home)
 */
export function useAutoLogout({
  tableCode,
  customerPhone,
  enabled = true,
  logoutDelayMinutes = 15,
  silentLogout = true, // Default to silent logout for guests
}: AutoLogoutConfig): AutoLogoutState {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!enabled || !tableCode || !customerPhone) return;

    let checkInterval: NodeJS.Timeout;

    const checkSessionStatus = async () => {
      try {
        // Get active or recently completed table session for this customer
        const { data: session, error } = await supabase
          .from("table_sessions")
          .select("id, status, session_ended_at, customer_phone")
          .eq("customer_phone", customerPhone)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error checking session:", error);
          return;
        }

        // No session found - user might be new or session expired
        if (!session) {
          return;
        }

        // If session is completed and has ended timestamp
        if (session.status === "completed" && session.session_ended_at) {
          const endTime = new Date(session.session_ended_at);

          // Calculate time since session ended
          const now = new Date();
          const minutesSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60);

          // If 15 minutes have passed, silently auto-logout
          if (minutesSinceEnd >= logoutDelayMinutes) {
            await handleAutoLogout();
            return;
          }
        }
      } catch (error) {
        console.error("Error in session status check:", error);
      }
    };

    const handleAutoLogout = async () => {
      if (isLoggingOut) return;

      setIsLoggingOut(true);

      try {
        console.log(`[Auto-Logout] Session ended 15+ minutes ago. Logging out silently...`);

        // Sign out user
        await signOut();

        // Clear all cart data
        if (tableCode) {
          localStorage.removeItem(`cart_${tableCode}`);
        }

        // Silently redirect to table scan page
        // User will need to scan QR code again to order
        router.push(`/t/${tableCode}`);
      } catch (error) {
        console.error("Error during auto-logout:", error);
        setIsLoggingOut(false);
      }
    };

    // Check immediately
    checkSessionStatus();

    // Check every 60 seconds (1 minute)
    checkInterval = setInterval(checkSessionStatus, 60000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [enabled, tableCode, customerPhone, logoutDelayMinutes, router, isLoggingOut]);

  return {
    isLoggingOut,
  };
}
