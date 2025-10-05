"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Receipt, History, CreditCard } from "lucide-react";

interface BillingLayoutProps {
  children: React.ReactNode;
}

export default function BillingLayout({ children }: BillingLayoutProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Active Billing",
      href: "/admin/billing",
      icon: Receipt,
      current: pathname === "/admin/billing",
    },
    {
      name: "Payment History",
      href: "/admin/billing/history",
      icon: History,
      current: pathname === "/admin/billing/history",
    },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.name}
                href={tab.href}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  tab.current
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon
                  className={`mr-2 h-5 w-5 ${
                    tab.current
                      ? "text-blue-500"
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                {tab.name}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}