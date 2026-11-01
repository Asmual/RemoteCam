"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DocsPage() {
  const [activeTab, setActiveTab] = React.useState<"bn" | "en">("bn");

  return (
    <div className="min-h-screen bg-[#E8EAF0] text-[#172033] flex flex-col justify-between">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-white/80 bg-[#E8EAF0] px-6 py-3 flex items-center justify-between shadow-[0_4px_12px_rgba(163,177,198,0.25)]">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#E8EAF0] border border-white shadow-[3px_3px_7px_rgba(163,177,198,0.45),-3px_-3px_7px_rgba(255,255,255,0.95)] flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-[#F28C28]"></span>
            </div>
            <span className="text-lg font-extrabold tracking-wider text-[#172033]">
              REMOTE<span className="text-[#F28C28]">CAM</span>
            </span>
          </Link>
          <span className="text-xs font-bold text-[#64748B] ml-2 hidden sm:inline">
            / Documentation
          </span>
        </div>

        {/* Language Switcher 3D Tabs */}
        <div className="flex items-center space-x-2 bg-[#E8EAF0] p-1 rounded-xl border border-white/70 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]">
          <button
            onClick={() => setActiveTab("bn")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === "bn"
                ? "bg-[#E8EAF0] text-[#F28C28] shadow-[3px_3px_6px_rgba(163,177,198,0.45),-3px_-3px_6px_rgba(255,255,255,0.95)] border border-white"
                : "text-[#64748B] hover:text-[#172033]"
            }`}
          >
            বাংলা
          </button>
          <button
            onClick={() => setActiveTab("en")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === "en"
                ? "bg-[#E8EAF0] text-[#F28C28] shadow-[3px_3px_6px_rgba(163,177,198,0.45),-3px_-3px_6px_rgba(255,255,255,0.95)] border border-white"
                : "text-[#64748B] hover:text-[#172033]"
            }`}
          >
            English
          </button>
        </div>
      </header>

      {/* Main Documentation Area */}
      <main className="max-w-4xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {activeTab === "bn" ? (
          /* বাংলা ডকুমেন্টেশন */
          <div className="space-y-6">
            <div className="p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
              <h1 className="text-2xl font-extrabold text-[#172033]">
                রিমোটক্যাম ব্যবহার নির্দেশিকা
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                নিরাপদ ও সম্মতিভিত্তিক ক্যামেরা মনিটরিং এবং লোকাল রেকর্ডিংয়ের পূর্ণাঙ্গ গাইডলাইন।
              </p>
            </div>

            {/* ধাপ ১ */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  ধাপ ১: ওনার অ্যাকাউন্ট তৈরি ও লগইন
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  সিস্টেমের প্রধান ড্যাশবোর্ডে প্রবেশ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  ১. প্রথমে <strong>রেজিস্ট্রেশন</strong> পেজে গিয়ে আপনার নাম, ইমেইল এবং পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করুন।
                </p>
                <p>
                  ২. অথবা <strong>লগইন</strong> পেজ থেকে আপনার বিদ্যমান অ্যাকাউন্টে প্রবেশ করুন। আপনার সেশন ও ডেটা স্বয়ংক্রিয়ভাবে NeonDB PostgreSQL ক্লাউডে সুরক্ষিত থাকবে।
                </p>
                <div className="pt-2">
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      রেজিস্ট্রেশন করুন
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* ধাপ ২ */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  ধাপ ২: সুরক্ষিত সেশন ও জয়েন লিংক তৈরি
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  টার্গেট ক্যামেরার জন্য এক্সপায়ারিং সিকিউর লিংক
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  ১. ড্যাশবোর্ডের <strong>সেশন</strong> মেন্যুতে যান।
                </p>
                <p>
                  ২. সেশনের মেয়াদ নির্ধারণ করুন (যেমন: ১৫ মিনিট, ১ ঘণ্টা বা ২৪ ঘণ্টা)।
                </p>
                <p>
                  ৩. <strong>&ldquo;Create Join Link&rdquo;</strong> বাটনে চাপ দিন। সিস্টেম তাৎক্ষণিক একটি ক্রিপ্টোগ্রাফিক SHA-256 টোকেনসহ ওয়ান-টাইম লিংক জেনারেট করবে।
                </p>
                <p>
                  ৪. লিংকটি কপি করে আপনার দ্বিতীয় ফোন বা ল্যাপটপে পাঠান। ওনার চাইলে যেকোনো সময় ড্যাশবোর্ড থেকে তাৎক্ষণিক সেশন বাতিল করতে পারেন।
                </p>
                <div className="pt-2">
                  <Link href="/sessions">
                    <Button variant="primary" size="sm">
                      সেশন তৈরি করুন
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* ধাপ ৩ */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  ধাপ ৩: টার্গেট ডিভাইসে সম্মতি ও ক্যামেরা অন করা
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  স্বচ্ছতা ও দ্বৈত সম্মতি (Double Consent) নীতি
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  ১. টার্গেট ফোনের ব্রাউজারে জয়েন লিংকটি ওপেন করুন।
                </p>
                <p>
                  ২. স্ক্রিনে কে ক্যামেরা দেখতে চাচ্ছে তা স্পষ্ট দেখতে পাবেন।
                </p>
                <p>
                  ৩. <strong>&ldquo;লাইভ ক্যামেরা অনুমোদন&rdquo;</strong> ও <strong>&ldquo;লোকাল রেকর্ডিং অনুমোদন&rdquo;</strong> চেকবক্সে টিক দিন এবং <strong>&ldquo;Accept &amp; Start Camera&rdquo;</strong>-এ চাপ দিন।
                </p>
                <p>
                  ৪. ব্রাউজার ক্যামেরা পারমিশন চাইলে <strong>Allow</strong> করুন। টার্গেট স্ক্রিনে সাথে সাথে লাইভ প্রিভিউ এবং স্থায়ী লাল রঙের রেকর্ডিং ইন্ডিকেটর দেখা যাবে। টার্গেট ইউজার চাইলে যেকোনো মুহূর্তে <strong>Disconnect</strong> বাটনে চেপে ক্যামেরা বন্ধ করতে পারে।
                </p>
              </CardContent>
            </Card>

            {/* ধাপ ৪ */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  ধাপ ৪: লাইভ মনিটরিং ও রিমোট রেকর্ডিং
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  WebRTC পিয়ার-টু-পিয়ার স্ট্রিমিং ও DataChannel কমান্ড
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  ১. ওনার ড্যাশবোর্ডে <strong>লাইভ মনিটর</strong> পেজে যান।
                </p>
                <p>
                  ২. সক্রিয় সেশন সিলেক্ট করে <strong>&ldquo;Connect Stream&rdquo;</strong> চাপুন। কয়েক মিলিসেকেন্ডের মধ্যে কোনো মিডিয়া সার্ভার ছাড়াই পিয়ার-টু-পিয়ার লাইভ ভিডিও ফিড চলে আসবে।
                </p>
                <p>
                  ৩. ড্যাশবোর্ড থেকে <strong>&ldquo;Request Remote Recording&rdquo;</strong> কমান্ড পাঠালে টার্গেট ডিভাইসে MediaRecorder সক্রিয় হয়ে সরাসরি রেকর্ড শুরু করবে।
                </p>
                <p>
                  ৪. <strong>&ldquo;Stop Remote Recording&rdquo;</strong> চাপলে টার্গেট ডিভাইসের লোকাল মেমরিতে ভিডিও ফাইলটি (.webm) স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।
                </p>
                <div className="pt-2">
                  <Link href="/live">
                    <Button variant="primary" size="sm">
                      লাইভ মনিটরে যান
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* ধাপ ৫ */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  ধাপ ৫: লোকাল ফাইল প্রটেকশন ও প্রাইভেসি নিশ্চয়তা
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  কোনো ভিডিও অনুমতি ছাড়া ক্লাউডে যায় না
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-[#64748B] leading-relaxed">
                <p>
                  • সব রেকর্ডিং ফাইল টার্গেট ডিভাইসের নিজস্ব ফোল্ডারে (File System Access API বা ডাউনলোড ফোল্ডার) সেভ হয়।
                </p>
                <p>
                  • ড্যাশবোর্ডের <strong>রেকর্ডিং হিস্ট্রি</strong> পেজে শুধুমাত্র ফাইলের নাম, সাইজ এবং সময়কালের মেটাডাটা দেখা যায়।
                </p>
                <p>
                  • হিডেন সার্ভিল্যান্স বা গোপন নজরদারি সম্পূর্ণভাবে প্রতিহত করতে সিস্টেমটিতে সবসময় ভিজ্যুয়াল স্টেট প্রদর্শিত থাকে।
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* English Documentation */
          <div className="space-y-6">
            <div className="p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
              <h1 className="text-2xl font-extrabold text-[#172033]">
                RemoteCam Architecture &amp; User Manual
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                Comprehensive step-by-step documentation for consent-based WebRTC monitoring.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  Step 1: Owner Authentication
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Access your central dashboard via Better Auth &amp; NeonDB
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  Create an account on the <strong>Register</strong> page or sign in with your email and password.
                  All user credentials, device mappings, and session logs are safely encrypted in Neon Serverless PostgreSQL.
                </p>
                <div className="pt-2">
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      Go to Registration
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  Step 2: Generate Expiring Session Links
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Cryptographically secure SHA-256 join tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  Navigate to <strong>Sessions</strong>, select link expiration (15m, 1h, 24h), and generate a unique join URL.
                  Raw tokens are never stored plaintext in the database. Owners can revoke links instantly with one click.
                </p>
                <div className="pt-2">
                  <Link href="/sessions">
                    <Button variant="primary" size="sm">
                      Manage Sessions
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  Step 3: Target Device Consent &amp; Streaming
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Double consent barrier and persistent recording indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-[#64748B] leading-relaxed">
                <p>
                  Open the join link on the target smartphone or laptop. The target user explicitly approves camera and local recording permissions before hardware access is granted.
                  A permanent preview and pulsating red recording indicator remain visible at all times.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#172033]">
                  Step 4: WebRTC P2P Monitoring &amp; DataChannel Commands
                </CardTitle>
                <CardDescription className="text-xs text-[#64748B]">
                  Sub-second latency direct video relay
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-[#64748B] leading-relaxed">
                <p>
                  Connect to the stream from <strong>Live Monitoring</strong>. Remote recording commands travel securely over authenticated WebRTC DataChannels.
                  Video files are written directly into the target device&apos;s physical storage.
                </p>
                <div className="pt-2">
                  <Link href="/live">
                    <Button variant="primary" size="sm">
                      Open Live Monitor
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/70 bg-[#E8EAF0] px-6 py-4 text-center text-xs text-[#94A3B8] shadow-[0_-2px_10px_rgba(163,177,198,0.15)]">
        &copy; 2026 RemoteCam Architecture. Bilingual Documentation System.
      </footer>
    </div>
  );
}
