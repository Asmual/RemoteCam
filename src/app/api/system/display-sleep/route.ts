import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "turnoff-screen.ps1");
    // Execute powershell script to turn off display
    exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (err) => {
      if (err) {
        console.error("Display sleep execution error:", err);
      }
    });

    return NextResponse.json({ success: true, message: "Display sleep command dispatched" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
