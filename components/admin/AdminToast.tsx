"use client";

import { useEffect, useState } from "react";
import { X, Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import type { ToastNotification } from "@/types/notification.types";

interface AdminToastProps {
  notification: ToastNotification;
  onClose: (id: string) => void;
}

export function AdminToast({ notification, onClose }: AdminToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 10);

    // Play notification sound if enabled
    if (notification.sound) {
      playNotificationSound();
    }

    // Auto-dismiss if duration is set
    if (notification.duration && notification.duration > 0) {
      const startTime = Date.now();
      const duration = notification.duration;

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining === 0) {
          clearInterval(progressInterval);
        }
      }, 50);

      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [notification.duration, notification.sound]);

  const playNotificationSound = () => {
    // Simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(notification.id);
    }, 300); // Wait for slide-out animation
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
      case "notification":
        return <Bell className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-900",
          subtext: "text-green-700",
          progress: "bg-green-500",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-900",
          subtext: "text-red-700",
          progress: "bg-red-500",
        };
      case "warning":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          text: "text-orange-900",
          subtext: "text-orange-700",
          progress: "bg-orange-500",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-900",
          subtext: "text-blue-700",
          progress: "bg-blue-500",
        };
      case "notification":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          text: "text-purple-900",
          subtext: "text-purple-700",
          progress: "bg-purple-500",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-900",
          subtext: "text-gray-700",
          progress: "bg-gray-500",
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div
      className={`transform transition-all duration-500 ease-out ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "-translate-y-8 opacity-0 scale-95"
      }`}
    >
      <div
        className={`${colors.bg} ${colors.border} border-2 rounded-xl shadow-2xl overflow-hidden min-w-[400px] max-w-2xl`}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${colors.text} text-base mb-1`}>
                {notification.title}
              </p>
              <p className={`text-sm ${colors.subtext} leading-relaxed`}>
                {notification.message}
              </p>
              {notification.action && (
                <button
                  onClick={() => {
                    notification.action!.onClick();
                    handleClose();
                  }}
                  className={`mt-3 px-4 py-2 text-sm font-semibold ${colors.text} bg-white border-2 ${colors.border} rounded-lg hover:bg-opacity-90 transition-all`}
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            <button
              onClick={handleClose}
              className={`flex-shrink-0 w-8 h-8 rounded-lg ${colors.subtext} hover:bg-white hover:bg-opacity-20 transition-colors flex items-center justify-center`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        {notification.duration && notification.duration > 0 && (
          <div className="h-1.5 bg-black bg-opacity-10">
            <div
              className={`h-full ${colors.progress} transition-all ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Toast Container Component
interface AdminToastContainerProps {
  notifications: ToastNotification[];
  onClose: (id: string) => void;
}

export function AdminToastContainer({
  notifications,
  onClose,
}: AdminToastContainerProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {notifications.map((notification) => (
          <AdminToast
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
