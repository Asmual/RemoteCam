"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All alerts marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  const clearAllNotifications = async () => {
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      setNotifications([]);
      toast.success("Notification history cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Security Alerts &amp; Notifications
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time motion detection events, camera connections, and system alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="md" onClick={markAllAsRead} disabled={notifications.length === 0}>
            Mark All as Read
          </Button>
          <Button variant="outline" size="md" onClick={clearAllNotifications} disabled={notifications.length === 0}>
            Clear History
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#172033]">
            Recent Security Alerts
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Automated notifications dispatched by camera feeds and motion sensors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              Loading security notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94A3B8]">
              No security alerts recorded yet. Motion events and connections will appear here.
            </div>
          ) : (
            notifications.map((item) => {
              const isMotion = item.type === "MOTION_ALERT";

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border border-white/80 transition-all ${
                    item.isRead
                      ? "bg-[#E8EAF0] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]"
                      : "bg-[#E8EAF0] shadow-[5px_5px_12px_rgba(163,177,198,0.45),-5px_-5px_12px_rgba(255,255,255,0.95)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isMotion ? "bg-[#E05A47] animate-pulse" : "bg-[#22A06B]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#172033]">{item.title}</span>
                      {isMotion && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E05A47]/15 text-[#E05A47]">
                          MOTION DETECTED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1.5">{item.message}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
