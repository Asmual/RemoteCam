import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken, isExpired } from "@/lib/security/token";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Missing join token" }, { status: 400 });
    }

    const hashed = hashToken(token);
    const joinToken = await prisma.joinToken.findUnique({
      where: { hashedToken: hashed },
      include: {
        session: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!joinToken) {
      return NextResponse.json({ error: "Invalid or unrecognized join link" }, { status: 404 });
    }

    if (joinToken.session.status === "revoked") {
      return NextResponse.json({ error: "This session has been revoked by the owner" }, { status: 403 });
    }

    if (isExpired(joinToken.expiresAt)) {
      return NextResponse.json({ error: "This join link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      sessionId: joinToken.session.id,
      ownerName: joinToken.session.user.name,
      ownerEmail: joinToken.session.user.email,
      expiresAt: joinToken.expiresAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
