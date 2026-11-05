import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type = "MOTION_ALERT", title, message } = body;

    const owner = await prisma.user.findFirst();
    if (!owner) {
      return NextResponse.json({ error: "Owner user required" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: owner.id,
        type,
        title: title || "Security Alert",
        message: message || "Event triggered on camera stream",
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.id) {
      await prisma.notification.update({
        where: { id: body.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.notification.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
