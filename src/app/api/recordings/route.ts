import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { recordingMetadataSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const recordings = await prisma.recording.findMany({
      include: {
        device: true,
        session: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Format BigInt to number for JSON serialization
    const serialized = recordings.map((r) => ({
      ...r,
      fileSizeBytes: Number(r.fileSizeBytes),
    }));

    return NextResponse.json({ recordings: serialized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = recordingMetadataSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const owner = await prisma.user.findFirst();
    if (!owner) {
      return NextResponse.json({ error: "Owner account required" }, { status: 400 });
    }

    const recording = await prisma.recording.create({
      data: {
        userId: owner.id,
        deviceId: parsed.data.deviceId || null,
        sessionId: parsed.data.sessionId || null,
        fileName: parsed.data.fileName,
        fileFormat: parsed.data.fileFormat,
        fileSizeBytes: BigInt(parsed.data.fileSizeBytes),
        durationSeconds: parsed.data.durationSeconds,
        startedAt: new Date(parsed.data.startedAt),
        endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
        saveStatus: parsed.data.saveStatus,
        saveLocationDescription: parsed.data.saveLocationDescription || "Target Local Hardware",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: owner.id,
        sessionId: parsed.data.sessionId,
        eventType: "RECORDING_SAVED",
        description: `Recording ${recording.fileName} saved locally (${recording.durationSeconds}s).`,
      },
    });

    return NextResponse.json({
      success: true,
      recording: { ...recording, fileSizeBytes: Number(recording.fileSizeBytes) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
