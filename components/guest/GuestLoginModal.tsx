"use client";

import { useState } from "react";
import { sendEmailOTP, verifyEmailOTP } from "@/lib/auth/email-auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { guestColors } from "@/lib/guest-colors";

interface GuestLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function GuestLoginModal({
  isOpen,
  onClose,
  onLoginSuccess
}: GuestLoginModalProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    const result = await sendEmailOTP(email);

    if (result.success) {
      setStep("otp");
    } else {
      setError(result.error || "Failed to send OTP");
    }

    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    const result = await verifyEmailOTP(email, otp);

    if (result.success) {
      // Reset modal state
      setStep("email");
      setEmail("");
      setOtp("");
      setError("");
      onLoginSuccess();
      onClose();
    } else {
      setError(result.error || "Invalid OTP");
    }

    setLoading(false);
  };

  const resetModal = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Guest Login</h2>
          <button
            onClick={resetModal}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "email" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-gray-600">
                  Enter your email address to receive a login code
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                  className="text-center"
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSendOTP}
                  disabled={loading || !email}
                  className="w-full"
                  variant="primary"
                >
                  {loading ? "Sending..." : "Send Login Code"}
                </Button>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-gray-600 mb-2">
                  We've sent a 6-digit code to
                </p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep("email")}
                    variant="secondary"
                    className="flex-1"
                  >
                    Change Email
                  </Button>
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                    className="flex-1"
                    variant="primary"
                  >
                    {loading ? "Verifying..." : "Verify & Login"}
                  </Button>
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full text-sm text-orange-600 hover:text-orange-800 transition-colors"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}