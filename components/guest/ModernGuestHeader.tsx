"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/admin/Button";
import {
  User,
  LogOut,
  ShoppingBag,
  Bell,
  Menu,
  X,
  MapPin,
  Clock,
  Phone,
} from "lucide-react";
import { RESTAURANT_CONFIG } from "@/lib/constants";

interface ModernGuestHeaderProps {
  tableCode: string;
  tableNumber?: number;
  cartItemCount: number;
  activeOrdersCount: number;
  onCartClick: () => void;
  onOrdersClick: () => void;
}

export default function ModernGuestHeader({
  tableCode,
  tableNumber,
  cartItemCount,
  activeOrdersCount,
  onCartClick,
  onOrdersClick,
}: ModernGuestHeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Restaurant Info */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {RESTAURANT_CONFIG.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {RESTAURANT_CONFIG.name}
                </h1>
                <p className="text-xs text-gray-500">
                  {RESTAURANT_CONFIG.tagline}
                </p>
              </div>
            </div>

            {/* Table Info */}
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Table {tableNumber || "?"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Active Orders */}
              {activeOrdersCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOrdersClick}
                  leftIcon={<Clock className="w-4 h-4" />}
                  className="relative"
                >
                  Orders ({activeOrdersCount})
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                </Button>
              )}

              {/* Cart */}
              <Button
                variant="secondary"
                size="sm"
                onClick={onCartClick}
                leftIcon={<ShoppingBag className="w-4 h-4" />}
                className={`relative ${
                  cartItemCount > 0
                    ? "bg-green-50 text-green-700 border-green-200"
                    : ""
                }`}
              >
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </Button>

              {/* Simplified for OTP-only flow - no persistent auth in header */}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Table */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {RESTAURANT_CONFIG.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">
                  {RESTAURANT_CONFIG.name}
                </h1>
                <div className="flex items-center text-xs text-gray-500">
                  <MapPin className="w-3 h-3 mr-1" />
                  Table {tableNumber || "?"}
                </div>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center space-x-2">
              {/* Cart Button */}
              <button
                onClick={onCartClick}
                className={`relative p-2 rounded-lg ${
                  cartItemCount > 0
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </span>
                )}
              </button>

              {/* Menu Button */}
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 bg-gray-50 text-gray-600 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Simplified for OTP-only flow */}

              {/* Active Orders */}
              {activeOrdersCount > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-orange-900">
                        Active Orders
                      </h3>
                      <p className="text-sm text-orange-600">
                        You have {activeOrdersCount} order
                        {activeOrdersCount !== 1 ? "s" : ""} in progress
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOrdersClick();
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              )}

              {/* Support */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Need Help?
                </h3>
                <div className="space-y-2">
                  <a
                    href={`tel:${RESTAURANT_CONFIG.supportPhone}`}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {RESTAURANT_CONFIG.supportPhone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
