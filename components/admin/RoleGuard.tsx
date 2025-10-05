"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessRoute, UserRole, AuthUser } from "@/lib/auth";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoute: string;
  fallback?: React.ReactNode;
}

export default function RoleGuard({
  children,
  requiredRoute,
  fallback
}: RoleGuardProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/admin/verify', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        } else {
          router.push('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
        router.push('/admin/login');
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser || !canAccessRoute(currentUser.role, requiredRoute)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}