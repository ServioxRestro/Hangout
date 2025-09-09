"use client";

import { usePathname } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't apply AdminLayout to login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
