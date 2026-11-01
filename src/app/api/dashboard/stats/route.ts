import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [totalDevices, onlineDevices, activeSessions, totalRecordings, recentActivities] =
      await Promise.all([
        prisma.device.count(),
        prisma.device.count({ where: { status: "online" } }),
        prisma.deviceSession.count({ where: { status: "connected" } }),
        prisma.recording.count(),
        prisma.auditLog.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      totalDevices,
      onlineDevices,
      activeSessions,
      totalRecordings,
      recentActivities,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
