"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export type NotificationType = "order" | "kot" | "ready" | "billing" | "payment" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  playSound: boolean;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function NotificationProvider({ children, enabled = true }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [playSound, setPlaySound] = useState(true);

  // Play notification sound
  const playNotificationSound = useCallback((type: NotificationType) => {
    if (!playSound) return;

    try {
      // Different sounds for different notification types
      const soundMap: Record<NotificationType, number> = {
        order: 800,    // High pitch for new orders
        kot: 600,      // Medium pitch for KOT
        ready: 500,    // Lower pitch for ready
        billing: 700,  // Billing notification
        payment: 900,  // Success sound for payment
        info: 400,     // Low pitch for info
      };

      const frequency = soundMap[type] || 600;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, [playSound]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    playNotificationSound(notification.type);

    // Browser notification if permission granted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/icon.png",
        badge: "/badge.png",
        tag: notification.type,
      });
    }
  }, [playNotificationSound]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleSound = useCallback(() => {
    setPlaySound((prev) => !prev);
    localStorage.setItem("notification_sound", (!playSound).toString());
  }, [playSound]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Load sound preference
    const savedSound = localStorage.getItem("notification_sound");
    if (savedSound !== null) {
      setPlaySound(savedSound === "true");
    }
  }, []);

  // Polling-based notification system using Supabase queries
  useEffect(() => {
    if (!enabled) return;

    let lastOrderCheck = new Date();
    let lastKotCheck = new Date();
    let lastBillCheck = new Date();
    let lastServedCheck = new Date();

    const checkForNewData = async () => {
      try {
        // Check for new orders (created in last 10 seconds)
        const { data: newOrders } = await supabase
          .from("orders")
          .select("id, order_type, created_at")
          .gte("created_at", lastOrderCheck.toISOString())
          .order("created_at", { ascending: false });

        if (newOrders && newOrders.length > 0) {
          newOrders.forEach((order) => {
            addNotification({
              type: "order",
              title: "New Order Received",
              message: `Order #${order.id.slice(0, 8)} has been placed${order.order_type === "takeaway" ? " (Takeaway)" : ""}`,
              data: order,
            });
          });
          lastOrderCheck = new Date();
        }

        // Check for ready KOTs (items that became ready recently)
        const { data: readyKots } = await supabase
          .from("order_items")
          .select("kot_number, created_at")
          .eq("status", "ready")
          .gte("created_at", lastKotCheck.toISOString())
          .order("created_at", { ascending: false });

        if (readyKots && readyKots.length > 0) {
          // Group by KOT number to avoid duplicate notifications
          const uniqueKots = Array.from(new Set(readyKots.map((k) => k.kot_number)));
          uniqueKots.forEach((kotNumber) => {
            addNotification({
              type: "ready",
              title: "Order Ready to Serve",
              message: `KOT #${kotNumber} is ready for serving`,
              data: { kot_number: kotNumber },
            });
          });
          lastKotCheck = new Date();
        }

        // Check for served orders (ready for billing)
        const { data: servedOrders } = await supabase
          .from("orders")
          .select("id, updated_at")
          .eq("status", "served")
          .gte("updated_at", lastServedCheck.toISOString())
          .order("updated_at", { ascending: false });

        if (servedOrders && servedOrders.length > 0) {
          servedOrders.forEach((order) => {
            addNotification({
              type: "billing",
              title: "Ready for Billing",
              message: `Order #${order.id.slice(0, 8)} is ready for payment processing`,
              data: order,
            });
          });
          lastServedCheck = new Date();
        }

        // Check for new bills/payments
        const { data: newBills } = await supabase
          .from("bills")
          .select("bill_number, final_amount, created_at")
          .gte("created_at", lastBillCheck.toISOString())
          .order("created_at", { ascending: false });

        if (newBills && newBills.length > 0) {
          newBills.forEach((bill) => {
            addNotification({
              type: "payment",
              title: "Payment Received",
              message: `Bill #${bill.bill_number} - ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(bill.final_amount)}`,
              data: bill,
            });
          });
          lastBillCheck = new Date();
        }
      } catch (error) {
        console.error("Error checking for notifications:", error);
      }
    };

    // Poll every 5 seconds
    const pollInterval = setInterval(checkForNewData, 5000);

    // Initial check
    checkForNewData();

    return () => {
      clearInterval(pollInterval);
    };
  }, [enabled, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        playSound,
        toggleSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
