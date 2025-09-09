"use client";

import { useState, useEffect } from "react";
import {
  sendEmailOTP,
  verifyEmailOTP,
  getCurrentUser,
  signOut,
} from "@/lib/auth/email-auth";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface GuestAuthProps {
  onAuthChange?: (user: any) => void;
  compact?: boolean;
}

const authIcons = {
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
  login: (
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
        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
      />
    </svg>
  ),
  logout: (
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
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  ),
  email: (
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
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  shield: (
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
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
};

export function GuestAuth({ onAuthChange, compact = false }: GuestAuthProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [authStep, setAuthStep] = useState<"none" | "email" | "otp">("none");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    checkCurrentUser();

    // Listen for Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setEmail(session.user.email || "");
        onAuthChange?.(session.user);
      } else {
        setCurrentUser(null);
        setEmail("");
        onAuthChange?.(null);
      }
      setInitialLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array to run only once on mount

  const checkCurrentUser = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setEmail(user.email || "");
        onAuthChange?.(user);
      }
    } catch (error) {
      console.error("Error checking current user:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
    setAuthStep("email");
    setError("");
    setOtp("");
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const result = await signOut();
      if (result.success) {
        setCurrentUser(null);
        setEmail("");
        setAuthStep("none");
        onAuthChange?.(null);
      } else {
        setError(result.error || "Failed to sign out");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await sendEmailOTP(email);
      if (result.success) {
        setAuthStep("otp");
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await verifyEmailOTP(email, otp);
      if (result.success) {
        setCurrentUser(result.user);
        setAuthStep("none");
        setShowAuthModal(false);
        setOtp("");
        onAuthChange?.(result.user);
      } else {
        setError(result.error || "Invalid OTP");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowAuthModal(false);
    setAuthStep("none");
    setError("");
    setOtp("");
  };

  // Show loading state during initial check
  if (initialLoading) {
    return (
      <div className="flex items-center">
        <LoadingSpinner size="sm" variant="subtle" center={false} />
      </div>
    );
  }

  if (currentUser) {
    // User is logged in - show user info and logout button
    const displayName = currentUser.email?.split("@")[0] || "User";

    return (
      <div className="flex items-center gap-2">
        {!compact && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-success-light text-green-800 rounded-full text-sm font-medium">
            {authIcons.user}
            <span>{displayName}</span>
          </div>
        )}
        <Button
          variant="outline"
          size={compact ? "xs" : "sm"}
          onClick={handleLogout}
          disabled={loading}
          className="text-text-secondary hover:text-error hover:border-error"
          leftIcon={!compact ? authIcons.logout : undefined}
        >
          {loading ? (
            <LoadingSpinner size="xs" center={false} />
          ) : compact ? (
            "Out"
          ) : (
            "Logout"
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Login Button */}
      <Button
        variant="primary"
        size={compact ? "xs" : "sm"}
        onClick={handleLogin}
        leftIcon={!compact ? authIcons.login : undefined}
        className="shadow-md"
      >
        {compact ? "Login" : "Sign In"}
      </Button>

      {/* Auth Modal */}
      <Modal
        isOpen={showAuthModal}
        onClose={closeModal}
        title={authStep === "email" ? "Welcome Back" : "Verify Your Email"}
        size="sm"
      >
        {authStep === "email" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-brand-primary-light rounded-full flex items-center justify-center mb-4">
                {authIcons.email}
              </div>
              <p className="text-text-secondary">
                Enter your email address to receive a verification code
              </p>
            </div>

            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              error={error}
              fullWidth
              leftIcon={authIcons.email}
              onKeyPress={(e) => e.key === "Enter" && sendOTP()}
            />

            <ModalFooter>
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={sendOTP}
                disabled={loading || !email.includes("@")}
                isLoading={loading}
              >
                Send Code
              </Button>
            </ModalFooter>
          </div>
        )}

        {authStep === "otp" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-success-light rounded-full flex items-center justify-center mb-4">
                {authIcons.shield}
              </div>
              <p className="text-text-secondary">
                We've sent a 6-digit verification code to
              </p>
              <p className="font-medium text-text-primary">{email}</p>
            </div>

            <Input
              type="text"
              label="Verification Code"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter 6-digit code"
              error={error}
              fullWidth
              className="text-center text-lg tracking-widest"
              maxLength={6}
              onKeyPress={(e) => e.key === "Enter" && verifyOTP()}
            />

            <ModalFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setAuthStep("email");
                  setOtp("");
                  setError("");
                }}
                disabled={loading}
              >
                Change Email
              </Button>
              <Button
                variant="primary"
                onClick={verifyOTP}
                disabled={loading || otp.length !== 6}
                isLoading={loading}
              >
                Verify & Sign In
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </>
  );
}
