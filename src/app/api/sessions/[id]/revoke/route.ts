import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.deviceSession.update({
      where: { id },
      data: {
        status: "revoked",
        revokedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        sessionId: session.id,
        eventType: "SESSION_REVOKED",
        description: `Session revoked by owner.`,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
