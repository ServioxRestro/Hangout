"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/msg91-widget";

interface AutoLogoutConfig {
  tableCode?: string;
  qrCode?: string;
  customerPhone?: string;
  enabled?: boolean;
  logoutDelayMinutes?: number; // Minutes after session/order ends to logout
  silentLogout?: boolean; // If true, logout silently without warning
  isTakeaway?: boolean; // If true, monitors takeaway orders instead of table sessions
}

interface AutoLogoutState {
  isLoggingOut: boolean;
}

/**
 * Auto-logout hook for guest users
 * - Dine-in: Monitors table session status, logs out 15 min after session ends
 * - Takeaway: Monitors latest order status, logs out 15 min after order is paid
 * - Silently logs out to prevent accidental orders
 */
export function useAutoLogout({
  tableCode,
  qrCode,
  customerPhone,
  enabled = true,
  logoutDelayMinutes = 15,
  silentLogout = true,
  isTakeaway = false,
}: AutoLogoutConfig): AutoLogoutState {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!enabled || !customerPhone) return;
    if (!isTakeaway && !tableCode) return;
    if (isTakeaway && !qrCode) return;

    let checkInterval: NodeJS.Timeout;

    const checkSessionStatus = async () => {
      try {
        if (isTakeaway) {
          // For takeaway: Check latest order status
          // Normalize phone to both formats for comparison
          const normalizedPhone = customerPhone.replace(/\D/g, '');
          const phoneWithoutCode = normalizedPhone.length === 12 && normalizedPhone.startsWith('91')
            ? normalizedPhone.substring(2)
            : normalizedPhone;
          const phoneWithCode = normalizedPhone.length === 10
            ? `91${normalizedPhone}`
            : normalizedPhone;

          const { data: latestOrder, error } = await supabase
            .from("orders")
            .select("id, status, updated_at")
            .eq("order_type", "takeaway")
            .in("customer_phone", [phoneWithoutCode, phoneWithCode])
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("Error checking takeaway order:", error);
            return;
          }

          // No order found - user might be new
          if (!latestOrder) {
            return;
          }

          // If latest order is paid and enough time has passed
          if (latestOrder.status === "paid" && latestOrder.updated_at) {
            const paidTime = new Date(latestOrder.updated_at);
            const now = new Date();
            const minutesSincePaid = (now.getTime() - paidTime.getTime()) / (1000 * 60);

            // If configured minutes have passed, silently auto-logout
            if (minutesSincePaid >= logoutDelayMinutes) {
              await handleAutoLogout();
              return;
            }
          }
        } else {
          // For dine-in: Check table session status
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

            // If configured minutes have passed, silently auto-logout
            if (minutesSinceEnd >= logoutDelayMinutes) {
              await handleAutoLogout();
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error in session/order status check:", error);
      }
    };

    const handleAutoLogout = async () => {
      if (isLoggingOut) return;

      setIsLoggingOut(true);

      try {
        if (isTakeaway) {
          console.log(`[Auto-Logout] Takeaway order paid ${logoutDelayMinutes}+ minutes ago. Logging out silently...`);

          // Sign out user
          await signOut();

          // Clear takeaway cart data
          if (qrCode) {
            localStorage.removeItem(`takeaway_cart_${qrCode}`);
          }

          // Silently redirect to takeaway menu page
          router.push(`/takeaway/${qrCode}`);
        } else {
          console.log(`[Auto-Logout] Dine-in session ended ${logoutDelayMinutes}+ minutes ago. Logging out silently...`);

          // Sign out user
          await signOut();

          // Clear dine-in cart data
          if (tableCode) {
            localStorage.removeItem(`cart_${tableCode}`);
          }

          // Silently redirect to table scan page
          router.push(`/t/${tableCode}`);
        }
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
  }, [enabled, tableCode, qrCode, customerPhone, logoutDelayMinutes, router, isLoggingOut, isTakeaway]);

  return {
    isLoggingOut,
  };
}
