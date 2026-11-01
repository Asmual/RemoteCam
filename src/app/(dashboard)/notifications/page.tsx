"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState([
    {
      id: "1",
      title: "System Initialization",
      message: "RemoteCam environment and NeonDB PostgreSQL successfully synchronized.",
      createdAt: "Just now",
      isRead: false,
    },
    {
      id: "2",
      title: "Privacy Protocol Active",
      message: "Explicit consent verification enabled for all target devices.",
      createdAt: "10 mins ago",
      isRead: true,
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            System Notifications
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time connection alerts, recording updates, and security events.
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={markAllAsRead}>
          Mark All as Read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#172033]">
            Recent Alerts
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Automated notifications dispatched by active sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border border-white/80 transition-all ${
                item.isRead
                  ? "bg-[#E8EAF0] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]"
                  : "bg-[#E8EAF0] shadow-[5px_5px_12px_rgba(163,177,198,0.45),-5px_-5px_12px_rgba(255,255,255,0.95)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172033]">{item.title}</span>
                <span className="text-[11px] text-[#94A3B8]">{item.createdAt}</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">{item.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
