"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface DayActivity {
  day: string;
  date: string;
  sessionsCount: number;
  recordingsCount: number;
  streamMinutes: number;
  activityLevel: number;
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState({
    totalSessions: 0,
    activeSessions: 0,
    liveStreams: 0,
    totalRecordings: 0,
    dailyActivity: [] as DayActivity[],
  });
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"sessions" | "recordings">("sessions");

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

  const activities = stats.dailyActivity || [];
  const maxVal = Math.max(
    ...activities.map((a) => (activeTab === "sessions" ? a.sessionsCount : a.recordingsCount)),
    5
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            CCTV Monitoring Dashboard
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time peer-to-peer camera connections, live feeds, and local video storage.
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
              Active Join Links
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#F28C28]">
              {loading ? "..." : stats.activeSessions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">Ready for device connection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Live Camera Feeds
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#22A06B]">
              {loading ? "..." : stats.liveStreams}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#22A06B] font-medium flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse"></span>
              <span>Online P2P streams</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Sessions Created
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#172033]">
              {loading ? "..." : stats.totalSessions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">Lifetime authorized sessions</p>
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
            <p className="text-xs text-[#64748B]">Local target MP4 files</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Activity Graph & Quick Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Graph */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-[#172033]">
                Weekly Activity &amp; Traffic Graph
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] mt-0.5">
                Daily connection sessions and local video recordings
              </CardDescription>
            </div>

            {/* Toggle Graph Data Mode */}
            <div className="flex items-center space-x-1 bg-[#E8EAF0] p-1 rounded-xl shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)]">
              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all outline-none focus:outline-none ${
                  activeTab === "sessions"
                    ? "bg-[#E8EAF0] text-[#F28C28] shadow-[2px_2px_5px_rgba(163,177,198,0.4),-2px_-2px_5px_rgba(255,255,255,0.95)]"
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                Sessions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recordings")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all outline-none focus:outline-none ${
                  activeTab === "recordings"
                    ? "bg-[#E8EAF0] text-[#F28C28] shadow-[2px_2px_5px_rgba(163,177,198,0.4),-2px_-2px_5px_rgba(255,255,255,0.95)]"
                    : "text-[#64748B] hover:text-[#172033]"
                }`}
              >
                Recordings
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Visual Bar / Chart Grid */}
            <div className="p-5 bg-[#E8EAF0] rounded-2xl shadow-[inset_3px_3px_7px_rgba(163,177,198,0.35),inset_-3px_-3px_7px_rgba(255,255,255,0.95)]">
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
                {activities.map((item, idx) => {
                  const val = activeTab === "sessions" ? item.sessionsCount : item.recordingsCount;
                  const heightPercent = Math.max(12, Math.round((val / maxVal) * 100));

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-[#172033] text-white text-[11px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg z-20 font-mono">
                        {item.date}: {val} {activeTab}
                      </div>

                      {/* Bar Value Indicator */}
                      <span className="text-[10px] font-bold text-[#64748B] mb-1 font-mono">
                        {val > 0 ? val : ""}
                      </span>

                      {/* Neumorphic Tactile Bar */}
                      <div
                        className="w-full max-w-[42px] bg-[#E8EAF0] rounded-xl relative overflow-hidden transition-all duration-300 shadow-[inset_2px_2px_4px_rgba(163,177,198,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] flex items-end"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div
                          className={`w-full rounded-xl transition-all duration-300 ${
                            val > 0
                              ? "bg-gradient-to-t from-[#F28C28] to-[#FFA74D] shadow-[2px_0_8px_rgba(242,140,40,0.5)]"
                              : "bg-[#D8DCE6]"
                          }`}
                          style={{ height: val > 0 ? "100%" : "6px" }}
                        />
                      </div>

                      {/* Day Label */}
                      <span className="text-xs font-semibold text-[#172033] mt-2">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub-Metric Summary Badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[3px_3px_7px_rgba(163,177,198,0.35),-3px_-3px_7px_rgba(255,255,255,0.95)]">
                <p className="text-[10px] uppercase font-bold text-[#64748B]">Total Captured</p>
                <p className="text-sm font-extrabold text-[#172033] mt-0.5">
                  {stats.totalRecordings} Videos
                </p>
              </div>

              <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[3px_3px_7px_rgba(163,177,198,0.35),-3px_-3px_7px_rgba(255,255,255,0.95)]">
                <p className="text-[10px] uppercase font-bold text-[#64748B]">Quality Profile</p>
                <p className="text-sm font-extrabold text-[#F28C28] mt-0.5">
                  1080p Full HD
                </p>
              </div>

              <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[3px_3px_7px_rgba(163,177,198,0.35),-3px_-3px_7px_rgba(255,255,255,0.95)]">
                <p className="text-[10px] uppercase font-bold text-[#64748B]">P2P Stream Encryption</p>
                <p className="text-sm font-extrabold text-[#22A06B] mt-0.5">
                  DTLS-SRTP Active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Launch & Monitoring Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#172033]">
              Quick CCTV Setup
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Connect any iPhone, Android, or laptop camera
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#E8EAF0] rounded-xl shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] text-xs text-[#64748B] leading-relaxed space-y-2">
              <p>
                <strong>1. Create Session:</strong> Generate a 24-hour or custom join link.
              </p>
              <p>
                <strong>2. Open on Phone:</strong> Tap the link on your camera device.
              </p>
              <p>
                <strong>3. Stealth / Black Screen:</strong> Turn screen 100% black to save battery.
              </p>
              <p>
                <strong>4. Watch &amp; Save:</strong> Monitor live stream and save directly to iPhone Files/Photos.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Link href="/sessions" className="block">
                <Button variant="primary" size="md" className="w-full">
                  Create Session Link
                </Button>
              </Link>
              <Link href="/live" className="block">
                <Button variant="secondary" size="md" className="w-full">
                  View Live Monitor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
