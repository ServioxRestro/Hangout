"use client";

import { useState } from "react";
import { sendPhoneOTP, verifyPhoneOTP, resendPhoneOTP } from "@/lib/auth/msg91-widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Smartphone, CheckCircle, AlertCircle } from "lucide-react";
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
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async () => {
    // Validate phone number (must be 10 digits)
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");

    const result = await sendPhoneOTP(phone);

    if (result.success) {
      setStep("otp");
    } else {
      setError(result.message || "Failed to send OTP");
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

    const result = await verifyPhoneOTP(phone, otp);

    if (result.success) {
      // Reset modal state
      setStep("phone");
      setPhone("");
      setOtp("");
      setError("");
      onLoginSuccess();
      onClose();
    } else {
      setError(result.message || "Invalid OTP");
    }

    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError("");

    const result = await resendPhoneOTP(phone);

    if (result.success) {
      setError(""); // Clear any previous errors
    } else {
      setError(result.message || "Failed to resend OTP");
    }

    setLoading(false);
  };

  const resetModal = () => {
    setStep("phone");
    setPhone("");
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
          {step === "phone" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-gray-600">
                  Enter your mobile number to receive OTP
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">
                    +91
                  </span>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    className="text-center pl-14"
                    maxLength={10}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSendOTP}
                  disabled={loading || phone.length !== 10}
                  className="w-full"
                  variant="primary"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
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
                  We've sent a 6-digit OTP to
                </p>
                <p className="font-medium text-gray-900">+91 {phone}</p>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
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
                    onClick={() => setStep("phone")}
                    variant="secondary"
                    className="flex-1"
                  >
                    Change Number
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
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="w-full text-sm text-orange-600 hover:text-orange-800 transition-colors"
                >
                  Didn't receive the OTP? Resend
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}