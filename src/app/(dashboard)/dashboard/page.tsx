"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const [stats, setStats] = React.useState({
    totalDevices: 0,
    onlineDevices: 0,
    activeSessions: 0,
    totalRecordings: 0,
    recentActivities: [] as any[],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Camera Monitoring Overview
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time peer-to-peer camera connections and target storage records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sessions">
            <Button variant="primary" size="md">
              Create Session Link
            </Button>
          </Link>
          <Link href="/live">
            <Button variant="secondary" size="md">
              Live Monitor
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Devices
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#172033]">
              {loading ? "..." : stats.totalDevices}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#22A06B] font-medium">Registered hardware</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Online Now
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#22A06B]">
              {loading ? "..." : stats.onlineDevices}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">Active WebRTC peers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Active Sessions
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#F28C28]">
              {loading ? "..." : stats.activeSessions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">Authorized join links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Saved Recordings
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#172033]">
              {loading ? "..." : stats.totalRecordings}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">Local storage metadata</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#172033]">
              Recent Activity Audit
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Immutable audit trail of camera permissions, sessions, and connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">
                No recent activity logged yet. Connect a target device to view events.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-[#E8EAF0] rounded-xl shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#172033] mr-2">
                        {act.eventType}
                      </span>
                      <span className="text-[#64748B]">{act.description}</span>
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">
                      {new Date(act.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Launch Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#172033]">
              Quick Setup
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Connect a secondary smartphone or laptop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#E8EAF0] rounded-xl shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] text-xs text-[#64748B] leading-relaxed">
              1. Generate an expiring join link under <strong>Sessions</strong>.
              <br />
              2. Open the link on your camera device.
              <br />
              3. Grant explicit camera consent on target.
              <br />
              4. Watch live feed on <strong>Live Monitoring</strong>.
            </div>
            <Link href="/sessions">
              <Button variant="primary" size="md" className="w-full">
                New Join Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
