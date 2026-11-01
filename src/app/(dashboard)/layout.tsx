"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Devices", href: "/devices" },
  { label: "Sessions", href: "/sessions" },
  { label: "Live Monitoring", href: "/live" },
  { label: "Recordings", href: "/recordings" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#E8EAF0] text-[#172033] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#E8EAF0] border-r border-white/80 shadow-[4px_0_14px_rgba(163,177,198,0.25)] flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-6 border-b border-white/60 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#E8EAF0] border border-white/80 shadow-[3px_3px_7px_rgba(163,177,198,0.45),-3px_-3px_7px_rgba(255,255,255,0.95)] flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-[#F28C28]"></span>
            </div>
            <span className="text-lg font-bold tracking-wider text-[#172033]">
              REMOTE<span className="text-[#F28C28]">CAM</span>
            </span>
          </Link>
        </div>

        {/* Text-Only Navigation (Strictly No Decorative Icons) */}
        <nav className="p-4 space-y-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#E8EAF0] text-[#F28C28] font-bold shadow-[inset_3px_3px_6px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] border border-white/60"
                    : "text-[#64748B] hover:text-[#172033] hover:shadow-[3px_3px_8px_rgba(163,177,198,0.3),-3px_-3px_8px_rgba(255,255,255,0.9)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-white/60 space-y-3">
          <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]">
            <p className="text-xs font-semibold text-[#172033] truncate">
              {session?.user?.name || "Account Owner"}
            </p>
            <p className="text-[11px] text-[#64748B] truncate">
              {session?.user?.email || "owner@remotecam.app"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
