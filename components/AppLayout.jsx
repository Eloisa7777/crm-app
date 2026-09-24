"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
  isAuthenticated,
  role,
}) {
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  if (isLoginPage || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar role={role} />

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}