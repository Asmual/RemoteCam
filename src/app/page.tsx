import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#E8EAF0] text-[#172033] flex flex-col justify-between selection:bg-[#F28C28]/20">
      {/* Sticky Fixed Navbar (Will not disappear on scroll) */}
      <header className="sticky top-0 z-50 border-b border-white/80 bg-[#E8EAF0] px-6 py-3 flex items-center justify-between shadow-[0_4px_12px_rgba(163,177,198,0.25)]">
        <div className="flex items-center space-x-3">
          {/* Neumorphic 3D Logo Icon */}
          <div className="w-8 h-8 rounded-xl bg-[#E8EAF0] border border-white shadow-[3px_3px_7px_rgba(163,177,198,0.45),-3px_-3px_7px_rgba(255,255,255,0.95)] flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-[#F28C28] shadow-[1px_1px_3px_rgba(0,0,0,0.25)]"></span>
          </div>
          <span className="text-lg font-extrabold tracking-wider text-[#172033]">
            REMOTE<span className="text-[#F28C28]">CAM</span>
          </span>
        </div>

        {/* 3D Action Buttons */}
        <div className="flex items-center space-x-3">
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content: Compact Hero & Grid View */}
      <main className="max-w-5xl mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* Soft Inset Badge */}
        <div className="inline-block px-3.5 py-1 mb-4 text-xs font-semibold text-[#F28C28] bg-[#E8EAF0] border border-white/70 rounded-full shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]">
          Secure Consent-Based Camera Monitoring
        </div>

        {/* Compact Title (Optimized for single-screen viewing) */}
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#172033] max-w-2xl mb-3 leading-snug">
          Real-time peer-to-peer monitoring with verifiable privacy.
        </h1>

        <p className="text-sm sm:text-base text-[#64748B] max-w-xl mb-6 font-normal">
          Connect your secondary devices on demand using encrypted WebRTC streaming.
          All remote recordings are explicitly authorized and saved directly to your local hardware.
        </p>

        {/* Hero 3D Buttons */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <Link href="/dashboard">
            <Button variant="primary" size="md">
              Launch Dashboard
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="secondary" size="md">
              View Documentation
            </Button>
          </Link>
        </div>

        {/* Feature Grid with Compact 3D Raised Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left w-full">
          <div className="p-5 bg-[#E8EAF0] border border-white/80 rounded-2xl shadow-[6px_6px_14px_rgba(163,177,198,0.45),-6px_-6px_14px_rgba(255,255,255,0.95)] transition-all">
            <div className="w-7 h-7 rounded-lg bg-[#E8EAF0] shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] flex items-center justify-center mb-3">
              <span className="w-2 h-2 rounded-full bg-[#F28C28]"></span>
            </div>
            <h3 className="text-base font-bold text-[#172033] mb-1">WebRTC Live Stream</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Sub-second latency direct peer-to-peer audio and video transmission without central media relays.
            </p>
          </div>

          <div className="p-5 bg-[#E8EAF0] border border-white/80 rounded-2xl shadow-[6px_6px_14px_rgba(163,177,198,0.45),-6px_-6px_14px_rgba(255,255,255,0.95)] transition-all">
            <div className="w-7 h-7 rounded-lg bg-[#E8EAF0] shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] flex items-center justify-center mb-3">
              <span className="w-2 h-2 rounded-full bg-[#22A06B]"></span>
            </div>
            <h3 className="text-base font-bold text-[#172033] mb-1">Target-Side Consent</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Anti-surveillance by design. Camera activation requires explicit target permission and displays persistent indicators.
            </p>
          </div>

          <div className="p-5 bg-[#E8EAF0] border border-white/80 rounded-2xl shadow-[6px_6px_14px_rgba(163,177,198,0.45),-6px_-6px_14px_rgba(255,255,255,0.95)] transition-all">
            <div className="w-7 h-7 rounded-lg bg-[#E8EAF0] shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] flex items-center justify-center mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
            </div>
            <h3 className="text-base font-bold text-[#172033] mb-1">Local File Storage</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Recordings are captured via MediaRecorder and saved directly into the target device&apos;s physical local disk.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/70 bg-[#E8EAF0] px-6 py-4 text-center text-xs text-[#94A3B8] shadow-[0_-2px_10px_rgba(163,177,198,0.15)]">
        &copy; 2026 RemoteCam Architecture. Soft Neumorphism 3D tactile interface.
      </footer>
    </div>
  );
}
