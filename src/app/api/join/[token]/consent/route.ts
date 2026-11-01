import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/security/token";
import { consentSchema } from "@/lib/validation/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = consentSchema.safeParse({ ...body, token });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const hashed = hashToken(token);
    const joinToken = await prisma.joinToken.findUnique({
      where: { hashedToken: hashed },
      include: { session: true },
    });

    if (!joinToken) {
      return NextResponse.json({ error: "Session token not found" }, { status: 404 });
    }

    // Save consent record
    const consent = await prisma.consent.create({
      data: {
        sessionId: joinToken.sessionId,
        cameraAllowed: parsed.data.cameraAllowed,
        audioAllowed: parsed.data.audioAllowed,
        recordingAllowed: parsed.data.recordingAllowed,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    // Update session status to connected
    await prisma.deviceSession.update({
      where: { id: joinToken.sessionId },
      data: { status: "connected", usageCount: { increment: 1 } },
    });

    await prisma.auditLog.create({
      data: {
        sessionId: joinToken.sessionId,
        eventType: "CONSENT_GRANTED",
        description: `Target device granted consent: Camera=${parsed.data.cameraAllowed}, Audio=${parsed.data.audioAllowed}, Recording=${parsed.data.recordingAllowed}`,
      },
    });

    return NextResponse.json({ success: true, consentId: consent.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
