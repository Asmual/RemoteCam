"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { DataChannelMessage } from "@/types/webrtc";
import { HybridSignalingClient } from "@/lib/webrtc/signaling";
import {
  type RecordingQuality,
  QUALITY_CONFIGS,
  getSupportedVideoMimeType,
  ensureValidVideoBlob,
} from "@/lib/webrtc/quality";

function DeviceJoinPageContent() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = React.useState(true);
  const [sessionData, setSessionData] = React.useState<any>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Theme mode: Default to Dark Mode to eliminate white notch/top borders on mobile OLED displays
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  // Consent states: Audio and Camera enabled by default
  const [cameraAllowed, setCameraAllowed] = React.useState(true);
  const [audioAllowed, setAudioAllowed] = React.useState(true);
  const [consented, setConsented] = React.useState(false);

  // Camera facing mode: "user" (front/selfie camera) or "environment" (back camera)
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("user");

  // Recording Quality: Default to Full HD 1080p
  const [recordingQuality, setRecordingQuality] = React.useState<RecordingQuality>("1080p");

  // Media & Streaming states
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<string>("Idle");
  const [isBlackScreen, setIsBlackScreen] = React.useState(false);
  const [isMicMuted, setIsMicMuted] = React.useState(false);

  // Local MP4 Recording States with Configurable Quality
  const [isMobileRecording, setIsMobileRecording] = React.useState(false);
  const [mobileRecordSeconds, setMobileRecordSeconds] = React.useState(0);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const signalingRef = React.useRef<HybridSignalingClient | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const recordTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const recordStartTimeRef = React.useRef<number>(0);
  const wakeLockRef = React.useRef<any>(null);

  const acquireWakeLock = React.useCallback(async () => {
    if (typeof window !== "undefined" && "wakeLock" in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
        console.log("Screen Wake Lock active: screen will remain awake indefinitely.");
      } catch (err) {
        console.warn("Screen Wake Lock could not be acquired:", err);
      }
    }
  }, []);

  const releaseWakeLock = React.useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {
        console.warn("Error releasing wake lock:", e);
      }
      wakeLockRef.current = null;
    }
  }, []);

  // Keep mobile screen awake indefinitely while CCTV camera or recording is active
  React.useEffect(() => {
    if (consented || isMobileRecording) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && (consented || isMobileRecording)) {
        acquireWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [consented, isMobileRecording, acquireWakeLock, releaseWakeLock]);

  // 1. Validate Token on mount
  React.useEffect(() => {
    if (!token) return;

    fetch(`/api/join/${token}/validate`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Invalid or expired session token");
        }
        return res.json();
      })
      .then((data) => {
        setSessionData(data);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });

    return () => {
      cleanupMedia();
    };
  }, [token]);

  const cleanupMedia = () => {
    stopLocalRecording();
    releaseWakeLock();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (signalingRef.current) {
      signalingRef.current.close();
      signalingRef.current = null;
    }
  };

  // 2. Grant Consent & Start CCTV Camera Streaming
  const handleStartSession = async () => {
    if (!cameraAllowed) {
      toast.error("Camera access must be allowed to stream.");
      return;
    }

    try {
      setConnectionStatus("Requesting camera permission...");

      // Send consent to backend
      await fetch(`/api/join/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraAllowed,
          audioAllowed,
          recordingAllowed: true,
        }),
      });

      const qualityConfig = QUALITY_CONFIGS[recordingQuality];

      // Browser getUserMedia - Front Camera by default with chosen resolution
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: qualityConfig.width, max: 1920 },
          height: { ideal: qualityConfig.height, max: 1080 },
        },
        audio: audioAllowed,
      });

      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setConsented(true);
      setConnectionStatus("Initializing WebRTC stream...");
      initWebRTC(stream);
      toast.success(`Camera started in ${qualityConfig.label}! Feed broadcasting to monitor.`);
    } catch (err: any) {
      toast.error(err.name === "NotAllowedError" ? "Camera permission denied by browser" : err.message);
      setConnectionStatus("Camera access failed");
    }
  };

  // 3. WebRTC Peer Connection & Signaling
  const initWebRTC = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = pc;

    // Add local tracks to WebRTC
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Handle incoming DataChannel from owner
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;
      channel.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          handleDataChannelMessage(msg);
        } catch (err) {
          console.error("DataChannel error", err);
        }
      };
    };

    // Hybrid WebRTC Signaling (Localhost WebSocket or Cloud Database Sync)
    const signaling = new HybridSignalingClient({
      sessionId: sessionData.sessionId,
      role: "target",
      onStatusChange: (status) => setConnectionStatus(status),
      onOffer: async (offer) => {
        try {
          if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerRef.current.createAnswer();
            await peerRef.current.setLocalDescription(answer);
            await signaling.sendSignal("answer", answer);
          }
        } catch (err) {
          console.error("Error responding to offer:", err);
        }
      },
      onIceCandidate: async (candidate) => {
        try {
          if (peerRef.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      },
    });
    signalingRef.current = signaling;

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        signalingRef.current.sendSignal("ice-candidate", event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("Streaming live to monitor");
      } else if (pc.connectionState === "disconnected") {
        setConnectionStatus("Monitor disconnected");
      }
    };
  };

  // 4. Handle remote commands from owner
  const handleDataChannelMessage = (msg: DataChannelMessage) => {
    if (msg.type === "STATUS_PING") {
      const pong: DataChannelMessage = { type: "STATUS_PONG", timestamp: Date.now() };
      dataChannelRef.current?.send(JSON.stringify(pong));
    }
  };

  // 5. Flip Camera (Front vs Back Camera)
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);

    try {
      const qualityConfig = QUALITY_CONFIGS[recordingQuality];
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextMode,
          width: { ideal: qualityConfig.width, max: 1920 },
          height: { ideal: qualityConfig.height, max: 1080 },
        },
        audio: audioAllowed && !isMicMuted,
      });

      // Replace video track in WebRTC peer connection
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old tracks
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => t.stop());
      }

      setLocalStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      toast.success(nextMode === "user" ? "Switched to Front Camera" : "Switched to Back Camera");
    } catch (err: any) {
      toast.error("Could not switch camera: " + err.message);
    }
  };

  // 6. Toggle Microphone Mute
  const toggleMicMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
        toast.info(audioTrack.enabled ? "Microphone active" : "Microphone muted");
      }
    }
  };

  // 7. Local MP4 Recording on Mobile with Configurable Quality
  const startLocalRecording = () => {
    if (!localStream) {
      toast.error("Camera is not active.");
      return;
    }

    const { mimeType: selectedMimeType, fileExtension } = getSupportedVideoMimeType();
    const qualityConfig = QUALITY_CONFIGS[recordingQuality];

    try {
      recordedChunksRef.current = [];

      let recorder: MediaRecorder;
      try {
        const options: MediaRecorderOptions = {};
        if (selectedMimeType) {
          options.mimeType = selectedMimeType;
        }
        if (qualityConfig.videoBitrate) {
          options.videoBitsPerSecond = qualityConfig.videoBitrate;
        }
        options.audioBitsPerSecond = 64000;
        recorder = new MediaRecorder(localStream, options);
      } catch (optErr) {
        console.warn("Falling back to device default MediaRecorder options:", optErr);
        recorder = new MediaRecorder(localStream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event: any) => {
        console.error("Mobile MediaRecorder runtime error:", event);
        toast.error("Recording error: " + (event.error?.name || "Encoder failure"));
      };

      recorder.onstop = async () => {
        const durationMs = Date.now() - recordStartTimeRef.current;
        const actualMime = recorder.mimeType || selectedMimeType || "video/mp4";
        const isMp4 = actualMime.includes("mp4");
        const ext = isMp4 ? "mp4" : "webm";
        let blob = new Blob(recordedChunksRef.current, { type: actualMime });

        // Ensure duration headers are valid so players do not stop playback early
        blob = await ensureValidVideoBlob(blob, durationMs);

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `phone_cctv_${recordingQuality}_${dateStr}_${Date.now()}.${ext}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        const sizeMb = (blob.size / 1024 / 1024).toFixed(1);
        toast.success(`Video saved as ${fileName} (${qualityConfig.shortLabel}, ${sizeMb} MB)`);
      };

      // Start recording continuously without timeslice to prevent Chrome/Safari fMP4 muxer crashes
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordStartTimeRef.current = Date.now();
      setIsMobileRecording(true);
      setMobileRecordSeconds(0);
      toast.info(`Recording started in ${qualityConfig.label}`);

      recordTimerRef.current = setInterval(() => {
        setMobileRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast.error("Recorder error: " + err.message);
    }
  };

  const stopLocalRecording = () => {
    if (mediaRecorderRef.current && isMobileRecording) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsMobileRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDisconnect = () => {
    cleanupMedia();
    setConsented(false);
    setLocalStream(null);
    setConnectionStatus("Session Terminated");
    toast.info("Camera disconnected.");
  };

  const activeQuality = QUALITY_CONFIGS[recordingQuality];

  // Dynamic Theme Styling (Pure OLED Black in Dark Mode, eliminating top white line)
  const isDark = isDarkMode;
  const rootBg = isDark ? "bg-[#000000] text-zinc-100" : "bg-[#E8EAF0] text-[#172033]";
  const cardBg = isDark
    ? "bg-[#0B0E14] border-zinc-800/80 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.85)]"
    : "bg-[#E8EAF0] border-white/80 text-[#172033] shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]";
  const innerCardBg = isDark
    ? "bg-[#121620] text-zinc-300 border border-zinc-800 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.6)]"
    : "bg-[#E8EAF0] text-[#64748B] shadow-[inset_3px_3px_6px_rgba(163,177,198,0.35),inset_-3px_-3px_6px_rgba(255,255,255,0.95)]";
  const selectBg = isDark
    ? "bg-[#121620] border-zinc-700 text-zinc-100 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]"
    : "bg-[#E8EAF0] border-white/80 text-[#172033] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]";
  const videoBorder = isDark ? "border-zinc-900 shadow-[0_4px_24px_rgba(0,0,0,0.95)]" : "border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]";
  const controlsBg = isDark
    ? "bg-[#0B0E14] border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
    : "bg-[#E8EAF0] border-white/80 shadow-[6px_6px_14px_rgba(163,177,198,0.4),-6px_-6px_14px_rgba(255,255,255,0.95)]";

  if (loading) {
    return (
      <div className={`min-h-screen ${rootBg} flex items-center justify-center p-4`}>
        <p className="text-sm font-semibold text-zinc-400">Verifying secure connection token...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={`min-h-screen ${rootBg} flex items-center justify-center p-4`}>
        <Card className="w-full max-w-md border-l-4 border-l-[#E05A47]">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Access Denied</CardTitle>
            <CardDescription className="text-xs text-[#E05A47] mt-1">{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400">
              Please request a new join link from the camera session owner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${rootBg} flex flex-col justify-center p-4 sm:p-8 transition-colors duration-200`}>
      {/* Stealth 100% Pure Pitch-Black Screen Overlay (No text, lights, or timer during sleep mode) */}
      {isBlackScreen && (
        <div
          onClick={() => setIsBlackScreen(false)}
          className="fixed inset-0 bg-black z-[9999] cursor-pointer select-none"
          title="Tap anywhere to wake display"
        />
      )}

      {/* Top Header Toolbar with Dark/Light Mode Switcher */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between mb-4 px-1">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse"></span>
          <span className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-400">
            RemoteCam CCTV
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
            isDark
              ? "bg-[#161B22] border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              : "bg-[#E8EAF0] border-white/80 text-[#172033] shadow-[2px_2px_5px_rgba(163,177,198,0.4),-2px_-2px_5px_rgba(255,255,255,0.95)]"
          }`}
          title="Toggle Dark Mode or Light Mode"
        >
          <span>{isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
        </button>
      </div>

      <main className="max-w-xl mx-auto w-full">
        {!consented ? (
          /* CCTV Camera Connection Card */
          <Card className={`border ${cardBg}`}>
            <CardHeader className="text-center pb-2">
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 border ${
                isDark ? "bg-[#161B22] border-zinc-700" : "bg-[#E8EAF0] border-white/80 shadow-[4px_4px_10px_rgba(163,177,198,0.45),-4px_-4px_10px_rgba(255,255,255,0.95)]"
              }`}>
                <span className="w-4 h-4 rounded-full bg-[#22A06B] animate-pulse"></span>
              </div>
              <CardTitle className="text-xl font-extrabold">
                Connect as CCTV Camera
              </CardTitle>
              <CardDescription className={`text-xs mt-1.5 ${isDark ? "text-zinc-400" : "text-[#64748B]"}`}>
                Connecting to monitor owned by <strong>{sessionData?.ownerName || "Dashboard Owner"}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className={`p-4 rounded-xl text-xs space-y-2 ${innerCardBg}`}>
                <p className="font-semibold text-zinc-100">CCTV Live Streaming Mode:</p>
                <p>• Stream live video &amp; audio directly to your laptop monitor.</p>
                <p>• Default camera: <strong>Front (Selfie) Camera</strong>.</p>
                <p>• Tap &ldquo;Black Screen&rdquo; anytime to dim the display while continuing stream.</p>
              </div>

              {/* Quality Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block">
                  Recording &amp; Stream Quality:
                </label>
                <select
                  value={recordingQuality}
                  onChange={(e) => setRecordingQuality(e.target.value as RecordingQuality)}
                  className={`w-full h-11 rounded-xl border px-3 text-xs font-semibold focus:outline-none ${selectBg}`}
                >
                  <option value="1080p">Full HD (1080p) [Default]</option>
                  <option value="720p">HD (720p) [Balanced]</option>
                  <option value="480p">Medium (480p) [Storage Saver]</option>
                </select>
                <p className="text-[11px] text-zinc-400">
                  {activeQuality.description}
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3 text-xs">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cameraAllowed}
                    onChange={(e) => setCameraAllowed(e.target.checked)}
                    className="w-4 h-4 accent-[#F28C28]"
                  />
                  <span className="font-semibold">
                    Allow Live Camera Streaming (Required)
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioAllowed}
                    onChange={(e) => setAudioAllowed(e.target.checked)}
                    className="w-4 h-4 accent-[#F28C28]"
                  />
                  <span className={isDark ? "text-zinc-400" : "text-[#64748B]"}>
                    Allow Live Audio Microphone (Recommended)
                  </span>
                </label>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full mt-4 text-sm font-bold py-3.5 shadow-[4px_4px_10px_rgba(242,140,40,0.4)]"
                onClick={handleStartSession}
              >
                Start Live CCTV Camera
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Active Camera Feed & Controls */
          <div className="space-y-6">
            <div className={`relative rounded-2xl overflow-hidden bg-black aspect-video border ${videoBorder}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Live Badge */}
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-[#22A06B]/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                <span>LIVE CCTV STREAMING</span>
              </div>

              {/* Mobile Recording Pill */}
              {isMobileRecording && (
                <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span>REC: {formatTimer(mobileRecordSeconds)} ({activeQuality.shortLabel})</span>
                </div>
              )}

              {/* Facing & Quality Badge */}
              <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-semibold border border-white/20 backdrop-blur-sm">
                <span>{facingMode === "user" ? "FRONT CAM" : "BACK CAM"}</span>
                <span>•</span>
                <span>{activeQuality.shortLabel}</span>
              </div>
            </div>

            {/* Quick CCTV Controls */}
            <div className={`p-5 rounded-2xl border space-y-4 ${controlsBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold">CCTV Device Controls</p>
                  <p className="text-[11px] text-zinc-400">
                    Status: <span className="font-semibold text-[#F28C28]">{connectionStatus}</span>
                  </p>
                </div>

                {/* Quality Selector while active */}
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-zinc-400">Quality:</span>
                  <select
                    value={recordingQuality}
                    onChange={(e) => setRecordingQuality(e.target.value as RecordingQuality)}
                    disabled={isMobileRecording}
                    className={`h-8 rounded-lg border px-2 text-[11px] font-semibold focus:outline-none ${selectBg}`}
                  >
                    <option value="1080p">Full HD (1080p) [Default]</option>
                    <option value="720p">HD (720p) [Balanced]</option>
                    <option value="480p">Medium (480p) [Storage Saver]</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Flip Camera */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleCameraFacing}
                  className="w-full text-xs font-semibold"
                  title="Switch between front and back camera"
                >
                  Flip Camera
                </Button>

                {/* Local MP4 Recording */}
                {isMobileRecording ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={stopLocalRecording}
                    className="w-full text-xs font-semibold"
                  >
                    Stop &amp; Save
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startLocalRecording}
                    className="w-full text-xs font-semibold"
                    title={`Record camera feed locally in ${activeQuality.shortLabel} MP4`}
                  >
                    Record ({activeQuality.shortLabel})
                  </Button>
                )}

                {/* Black Screen / Stealth */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBlackScreen(true)}
                  className="w-full text-xs font-semibold"
                  title="Turn screen black while camera and recording continue"
                >
                  Black Screen
                </Button>

                {/* Toggle Mic */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMicMute}
                  className="w-full text-xs font-semibold"
                >
                  {isMicMuted ? "Unmute Mic" : "Mute Mic"}
                </Button>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-xs font-semibold px-4"
                >
                  Disconnect Stream
                </Button>
              </div>

              <div className={`p-3 rounded-xl text-[11px] ${innerCardBg}`}>
                💡 <strong>Record in Black Screen:</strong> You can click <strong>&ldquo;Record&rdquo;</strong> and then click <strong>&ldquo;Black Screen&rdquo;</strong>. The video will keep recording locally in {activeQuality.shortLabel} MP4 while the screen remains completely dark! Tap anywhere on the dark screen to return and save your recording.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DeviceJoinPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <p className="text-sm font-semibold text-zinc-400">Loading secure connection...</p>
        </div>
      }
    >
      <DeviceJoinPageContent />
    </React.Suspense>
  );
}
