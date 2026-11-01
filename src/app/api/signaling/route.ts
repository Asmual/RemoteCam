import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, role, type, payload } = body;

    if (!sessionId || !role || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const eventType = `SIGNAL_${type.toUpperCase()}_${role.toUpperCase()}`;

    const log = await prisma.auditLog.create({
      data: {
        sessionId,
        eventType,
        description: JSON.stringify(payload || {}),
      },
    });

    return NextResponse.json({ success: true, id: log.id, createdAt: log.createdAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const role = searchParams.get("role"); // "owner" or "target"
    const since = searchParams.get("since");

    if (!sessionId || !role) {
      return NextResponse.json({ error: "Missing sessionId or role" }, { status: 400 });
    }

    const oppositeRole = role === "owner" ? "TARGET" : "OWNER";
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 60000);

    const logs = await prisma.auditLog.findMany({
      where: {
        sessionId,
        eventType: {
          startsWith: "SIGNAL_",
          endsWith: `_${oppositeRole}`,
        },
        createdAt: {
          gt: sinceDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 50,
    });

    const messages = logs.map((log) => {
      // e.g. SIGNAL_OFFER_OWNER -> type = "offer"
      const parts = log.eventType.split("_");
      const type = parts.slice(1, -1).join("_").toLowerCase();
      let payload = null;
      try {
        payload = JSON.parse(log.description);
      } catch {
        payload = log.description;
      }
      return {
        id: log.id,
        type,
        role: parts[parts.length - 1].toLowerCase(),
        payload,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
