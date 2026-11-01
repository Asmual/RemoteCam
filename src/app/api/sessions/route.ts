import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateSecureToken, hashToken } from "@/lib/security/token";
import { createSessionSchema } from "@/lib/validation/schemas";

const PRODUCTION_APP_URL = "https://remote-cam-asmual.vercel.app";

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

    const formattedSessions = sessions.map((s) => ({
      ...s,
      token: s.id,
      joinUrl: `${PRODUCTION_APP_URL}/join/${s.id}`,
    }));

    return NextResponse.json({ sessions: formattedSessions });
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

    const joinUrl = `${PRODUCTION_APP_URL}/join/${rawToken}`;
    const sessionJoinUrl = `${PRODUCTION_APP_URL}/join/${session.id}`;

    return NextResponse.json({
      session: {
        ...session,
        joinUrl: sessionJoinUrl,
        token: rawToken,
      },
      rawToken,
      joinUrl,
      sessionJoinUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
