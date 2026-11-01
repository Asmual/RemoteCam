import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createDeviceSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ devices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Default to the first user in database or mock owner if no session
    const owner = await prisma.user.findFirst();
    if (!owner) {
      return NextResponse.json({ error: "No owner account found. Please register first." }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: {
        userId: owner.id,
        deviceName: parsed.data.deviceName,
        browserInfo: parsed.data.browserInfo || "Chrome / Windows",
        osInfo: parsed.data.osInfo || "Desktop",
        status: "offline",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: owner.id,
        eventType: "DEVICE_REGISTERED",
        description: `Device '${device.deviceName}' registered.`,
      },
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
