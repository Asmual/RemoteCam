import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    // Delete session from database
    await prisma.deviceSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Session permanently deleted from database" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
