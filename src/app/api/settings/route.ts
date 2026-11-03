import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const owner = await prisma.user.findFirst();
    if (!owner) {
      return NextResponse.json({
        settings: {
          defaultVideoQuality: "720p",
          defaultAudioEnabled: false,
          defaultSessionExpiryMinutes: 60,
          notifyOnConnect: true,
          notifyOnRecord: true,
        },
      });
    }

    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: owner.id },
    });

    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          userId: owner.id,
          defaultVideoQuality: "720p",
          defaultAudioEnabled: false,
          defaultSessionExpiryMinutes: 60,
          notifyOnConnect: true,
          notifyOnRecord: true,
        },
      });
    }

    return NextResponse.json({ settings: userSettings });
  } catch (error: any) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const owner = await prisma.user.findFirst();
    if (!owner) {
      return NextResponse.json({ error: "Owner account required" }, { status: 400 });
    }

    const {
      defaultVideoQuality = "720p",
      defaultAudioEnabled = false,
      defaultSessionExpiryMinutes = 60,
      notifyOnConnect = true,
      notifyOnRecord = true,
    } = body;

    const updated = await prisma.userSettings.upsert({
      where: { userId: owner.id },
      update: {
        defaultVideoQuality,
        defaultAudioEnabled: Boolean(defaultAudioEnabled),
        defaultSessionExpiryMinutes: Number(defaultSessionExpiryMinutes),
        notifyOnConnect: Boolean(notifyOnConnect),
        notifyOnRecord: Boolean(notifyOnRecord),
      },
      create: {
        userId: owner.id,
        defaultVideoQuality,
        defaultAudioEnabled: Boolean(defaultAudioEnabled),
        defaultSessionExpiryMinutes: Number(defaultSessionExpiryMinutes),
        notifyOnConnect: Boolean(notifyOnConnect),
        notifyOnRecord: Boolean(notifyOnRecord),
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
