import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [totalSessions, activeSessions, liveStreams, totalRecordings, recordingsList, sessionsList] =
      await Promise.all([
        prisma.deviceSession.count(),
        prisma.deviceSession.count({ where: { status: { in: ["connected", "pending"] } } }),
        prisma.deviceSession.count({ where: { status: "connected" } }),
        prisma.recording.count(),
        prisma.recording.findMany({
          take: 50,
          select: { createdAt: true, fileSizeBytes: true, durationSeconds: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.deviceSession.findMany({
          take: 50,
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Build 7-day activity timeline
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyActivity = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = days[d.getDay()];

      const sessionsCount = sessionsList.filter(
        (s) => s.createdAt.toISOString().slice(0, 10) === dateStr
      ).length;

      const dayRecordings = recordingsList.filter(
        (r) => r.createdAt.toISOString().slice(0, 10) === dateStr
      );

      const recordingsCount = dayRecordings.length;
      const streamMinutes = Math.round(
        dayRecordings.reduce((sum, r) => sum + (r.durationSeconds || 0), 0) / 60
      );

      dailyActivity.push({
        day: dayName,
        date: dateStr,
        sessionsCount,
        recordingsCount,
        streamMinutes,
        activityLevel: Math.max(sessionsCount * 2 + recordingsCount * 3, 0),
      });
    }

    return NextResponse.json({
      totalSessions,
      activeSessions,
      liveStreams,
      totalRecordings,
      dailyActivity,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
