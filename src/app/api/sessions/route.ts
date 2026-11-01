import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateSecureToken, hashToken } from "@/lib/security/token";
import { createSessionSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const sessions = await prisma.deviceSession.findMany({
      include: {
        device: true,
        joinTokens: {
          select: {
            id: true,
            expiresAt: true,
            isUsed: true,
            usedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const owner = await prisma.user.findFirst();
    if (!owner) {
      return NextResponse.json({ error: "Owner account required" }, { status: 400 });
    }

    const rawToken = generateSecureToken();
    const hashed = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + parsed.data.expiryMinutes * 60 * 1000);

    const session = await prisma.deviceSession.create({
      data: {
        userId: owner.id,
        deviceId: parsed.data.deviceId || null,
        expiresAt,
        usageLimit: parsed.data.usageLimit,
        status: "pending",
        joinTokens: {
          create: {
            hashedToken: hashed,
            expiresAt,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: owner.id,
        sessionId: session.id,
        eventType: "SESSION_CREATED",
        description: `Join session created (expires in ${parsed.data.expiryMinutes}m)`,
      },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const joinUrl = `${protocol}://${host}/join/${rawToken}`;

    // Calculate Wi-Fi local network IP for mobile device access
    let localIp = "localhost";
    const os = await import("os");
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          localIp = net.address;
          break;
        }
      }
    }
    const mobileJoinUrl = `${protocol}://${localIp}:3000/join/${rawToken}`;

    return NextResponse.json({
      session,
      rawToken,
      joinUrl,
      mobileJoinUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
