"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const LOCAL_STORAGE_KEY = "remotecam_settings";

export default function SettingsPage() {
  const [videoQuality, setVideoQuality] = React.useState("720p");
  const [defaultAudio, setDefaultAudio] = React.useState(false);
  const [defaultExpiry, setDefaultExpiry] = React.useState(60);
  const [notifyOnConnect, setNotifyOnConnect] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load saved preferences on mount from localStorage (instant) and Database API (sync)
  React.useEffect(() => {
    // 1. Instant load from localStorage
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.defaultVideoQuality) setVideoQuality(parsed.defaultVideoQuality);
        if (typeof parsed.defaultAudioEnabled === "boolean") setDefaultAudio(parsed.defaultAudioEnabled);
        if (parsed.defaultSessionExpiryMinutes) setDefaultExpiry(Number(parsed.defaultSessionExpiryMinutes));
        if (typeof parsed.notifyOnConnect === "boolean") setNotifyOnConnect(parsed.notifyOnConnect);
      }
    } catch (e) {
      console.warn("Failed to load cached settings:", e);
    }

    // 2. Fetch authoritative database settings from /api/settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings;
          setVideoQuality(s.defaultVideoQuality || "720p");
          setDefaultAudio(Boolean(s.defaultAudioEnabled));
          setDefaultExpiry(Number(s.defaultSessionExpiryMinutes || 60));
          setNotifyOnConnect(Boolean(s.notifyOnConnect));

          // Keep localStorage in sync
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              defaultVideoQuality: s.defaultVideoQuality,
              defaultAudioEnabled: s.defaultAudioEnabled,
              defaultSessionExpiryMinutes: s.defaultSessionExpiryMinutes,
              notifyOnConnect: s.notifyOnConnect,
            })
          );
        }
      })
      .catch((err) => console.error("Could not fetch remote settings:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      defaultVideoQuality: videoQuality,
      defaultAudioEnabled: defaultAudio,
      defaultSessionExpiryMinutes: Number(defaultExpiry),
      notifyOnConnect: notifyOnConnect,
    };

    // 1. Immediately cache in localStorage so refresh never loses state
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }

    // 2. Persist to database via API
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings on server");
      }

      toast.success("Settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      // Even if API temporarily fails, localStorage is already updated
      toast.success("Preferences saved locally!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <h1 className="text-2xl font-extrabold text-[#172033]">
          Platform Settings
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Customize your default camera parameters, streaming quality, and link timeouts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Camera & Video Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#172033]">
              Camera &amp; Video Quality
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Configure preferred WebRTC streaming resolution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#172033]">Default Video Quality</label>
              <select
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
                className="h-11 w-full rounded-xl bg-[#E8EAF0] border border-white/80 px-3 text-xs font-semibold text-[#172033] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] focus:outline-none"
              >
                <option value="480p">480p SD (Low Bandwidth - Storage Saver)</option>
                <option value="720p">720p HD (Balanced - Recommended)</option>
                <option value="1080p">1080p Full HD (Crisp High Quality)</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaultAudio}
                  onChange={(e) => setDefaultAudio(e.target.checked)}
                  className="w-4 h-4 accent-[#F28C28]"
                />
                <span className="text-xs text-[#172033] font-medium">
                  Enable microphone audio by default
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Session Security Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#172033]">
              Session Security
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Default timeouts for generated join tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#172033]">Default Link Expiry</label>
              <select
                value={defaultExpiry}
                onChange={(e) => setDefaultExpiry(Number(e.target.value))}
                className="h-11 w-full rounded-xl bg-[#E8EAF0] border border-white/80 px-3 text-xs font-semibold text-[#172033] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] focus:outline-none"
              >
                <option value={15}>15 Minutes (High Security)</option>
                <option value={60}>1 Hour (Standard)</option>
                <option value={1440}>24 Hours (Full Day CCTV)</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnConnect}
                  onChange={(e) => setNotifyOnConnect(e.target.checked)}
                  className="w-4 h-4 accent-[#F28C28]"
                />
                <span className="text-xs text-[#172033] font-medium">
                  Notify me when a device joins or leaves
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </div>
  );
}
