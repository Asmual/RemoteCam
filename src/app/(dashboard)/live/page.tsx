"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HybridSignalingClient } from "@/lib/webrtc/signaling";
import {
  type RecordingQuality,
  QUALITY_CONFIGS,
  getSupportedVideoMimeType,
  ensureValidVideoBlob,
} from "@/lib/webrtc/quality";

interface SessionItem {
  id: string;
  status: string;
  expiresAt: string;
}

export interface MotionEvent {
  id: string;
  timestamp: string;
  time: Date;
  snapshotUrl: string;
  motionScore: number;
}

export default function LiveMonitoringPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("");
  const [connectionStatus, setConnectionStatus] = React.useState<string>("Disconnected");
  const [isMuted, setIsMuted] = React.useState(false);
  const [hasAudioTrack, setHasAudioTrack] = React.useState(false);

  // Monitor-side Local MP4 Recording States with Quality Selection
  const [recordingQuality, setRecordingQuality] = React.useState<RecordingQuality>("1080p");
  const [isRecordingStream, setIsRecordingStream] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);

  // AI Motion Detection & Security Alert States
  const [isMotionDetectionEnabled, setIsMotionDetectionEnabled] = React.useState(true);
  const [motionSensitivity, setMotionSensitivity] = React.useState<"high" | "medium" | "low">("medium");
  const [isSoundAlertEnabled, setIsSoundAlertEnabled] = React.useState(true);
  const [isAutoRecordOnMotion, setIsAutoRecordOnMotion] = React.useState(false);
  const [currentMotionScore, setCurrentMotionScore] = React.useState(0);
  const [isMotionAlertActive, setIsMotionAlertActive] = React.useState(false);
  const [motionEvents, setMotionEvents] = React.useState<MotionEvent[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<MotionEvent | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const signalingRef = React.useRef<HybridSignalingClient | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = React.useRef<number>(0);

  // Motion Detection References
  const motionLoopTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevFrameRef = React.useRef<Uint8ClampedArray | null>(null);
  const lastAlertTimeRef = React.useRef<number>(0);
  const autoRecordStopTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const alertResetTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Synthesized Web Audio Security Alert Chime (880Hz -> 1175Hz)
  const playSecurityChime = React.useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // First Tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second Tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }, []);

  // Fetch active sessions
  React.useEffect(() => {
    fetch("/api/sessions")
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            setSelectedSessionId(data.sessions[0].id);
          }
        }
      })
      .catch(console.error);

    // Request desktop notification permission for background intruder alerts
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    return () => {
      disconnectStream();
    };
  }, []);

  const disconnectStream = () => {
    stopStreamRecording();

    if (motionLoopTimerRef.current) {
      clearInterval(motionLoopTimerRef.current);
      motionLoopTimerRef.current = null;
    }
    prevFrameRef.current = null;
    setCurrentMotionScore(0);
    setIsMotionAlertActive(false);

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (signalingRef.current) {
      signalingRef.current.close();
      signalingRef.current = null;
    }
    setConnectionStatus("Disconnected");
    setHasAudioTrack(false);
  };

  const connectToStream = async () => {
    if (!selectedSessionId) {
      toast.error("Please select an active session");
      return;
    }

    disconnectStream();
    setConnectionStatus("Connecting to signaling...");

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = pc;

    // Create DataChannel for remote commands
    const dataChannel = pc.createDataChannel("remotecam-control");
    dataChannelRef.current = dataChannel;
    dataChannel.onopen = () => console.log("Control DataChannel opened");

    // Handle incoming video and audio tracks
    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        const audioTracks = event.streams[0].getAudioTracks();
        if (audioTracks.length > 0) {
          setHasAudioTrack(true);
        }
        setConnectionStatus("Live Stream Active");
        toast.success("Live CCTV video & audio feed connected!");
        videoRef.current.play().catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("Live Stream Active");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setConnectionStatus("Device Disconnected");
      }
    };

    // Hybrid WebRTC Signaling
    const signaling = new HybridSignalingClient({
      sessionId: selectedSessionId,
      role: "owner",
      onStatusChange: (status) => setConnectionStatus(status),
      onUserJoined: async () => {
        try {
          if (peerRef.current) {
            const offer = await peerRef.current.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
            await peerRef.current.setLocalDescription(offer);
            await signaling.sendSignal("offer", offer);
          }
        } catch (err) {
          console.error("Error re-sending offer on user-joined:", err);
        }
      },
      onAnswer: async (answer) => {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
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

    // Create and send WebRTC Offer
    try {
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await signaling.sendSignal("offer", offer);
    } catch (err) {
      console.error("Error creating offer:", err);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        signalingRef.current.sendSignal("ice-candidate", event.candidate);
      }
    };
  };

  // High-Resolution Snapshot Capture
  const captureSnapshot = React.useCallback((): string | null => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (e) {
      console.warn("Snapshot capture error:", e);
      return null;
    }
  }, []);

  // Manual Photo Snapshot Trigger
  const handleManualSnapshot = () => {
    const dataUrl = captureSnapshot();
    if (!dataUrl) {
      toast.error("Video stream is not ready for capture.");
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const newEvent: MotionEvent = {
      id: `manual_${Date.now()}`,
      timestamp,
      time: new Date(),
      snapshotUrl: dataUrl,
      motionScore: 0,
    };

    setMotionEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    toast.success("Snapshot photo captured successfully!");
  };

  // AI Motion Detection Trigger Event Handler
  const handleMotionTriggered = React.useCallback(
    (score: number) => {
      setIsMotionAlertActive(true);

      if (alertResetTimerRef.current) clearTimeout(alertResetTimerRef.current);
      alertResetTimerRef.current = setTimeout(() => {
        setIsMotionAlertActive(false);
      }, 3500);

      // 1. Audio Security Chime
      if (isSoundAlertEnabled) {
        playSecurityChime();
      }

      // 2. Capture Evidence Snapshot
      const snapshot = captureSnapshot();
      const timeStr = new Date().toLocaleTimeString();
      if (snapshot) {
        const newEvent: MotionEvent = {
          id: `motion_${Date.now()}`,
          timestamp: timeStr,
          time: new Date(),
          snapshotUrl: snapshot,
          motionScore: score,
        };
        setMotionEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
      }

      toast.warning(`🚨 Motion Detected! (${score}% movement) Evidence photo captured.`);

      // 3. Desktop Background Notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("🚨 Motion Alert - RemoteCam", {
            body: `Movement detected (${score}%) on live camera feed at ${timeStr}.`,
            icon: "/favicon.ico",
          });
        } catch {}
      }

      // 4. Save to Database Notifications
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MOTION_ALERT",
          title: "Intrusion / Motion Detected",
          message: `Movement detected (${score}% optical motion) at ${timeStr}. Evidence snapshot saved.`,
        }),
      }).catch(console.error);

      // 5. Auto-Record on Motion
      if (isAutoRecordOnMotion) {
        if (!isRecordingStream) {
          startStreamRecording();
        }

        // Reset 10-second auto-stop timer
        if (autoRecordStopTimerRef.current) {
          clearTimeout(autoRecordStopTimerRef.current);
        }
        autoRecordStopTimerRef.current = setTimeout(() => {
          stopStreamRecording();
          toast.info("Auto-recording stopped (no motion detected for 10s).");
        }, 10000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [captureSnapshot, isAutoRecordOnMotion, isRecordingStream, isSoundAlertEnabled, playSecurityChime]
  );

  // Optical Frame-Diff Computer Vision Motion Detection Loop
  React.useEffect(() => {
    if (connectionStatus !== "Live Stream Active" || !isMotionDetectionEnabled) {
      if (motionLoopTimerRef.current) {
        clearInterval(motionLoopTimerRef.current);
        motionLoopTimerRef.current = null;
      }
      prevFrameRef.current = null;
      setCurrentMotionScore(0);
      setIsMotionAlertActive(false);
      return;
    }

    const sampleWidth = 64;
    const sampleHeight = 48;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    const sensitivityThresholds = {
      high: 3,
      medium: 7,
      low: 14,
    };

    motionLoopTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !sampleCtx) return;

      try {
        sampleCtx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
        const currentData = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;

        if (prevFrameRef.current && prevFrameRef.current.length === currentData.length) {
          let diffPixels = 0;
          const totalPixels = sampleWidth * sampleHeight;
          const threshold = 28; // RGB per-pixel threshold

          for (let i = 0; i < currentData.length; i += 4) {
            const diff =
              (Math.abs(currentData[i] - prevFrameRef.current[i]) +
                Math.abs(currentData[i + 1] - prevFrameRef.current[i + 1]) +
                Math.abs(currentData[i + 2] - prevFrameRef.current[i + 2])) /
              3;

            if (diff > threshold) {
              diffPixels++;
            }
          }

          const score = Math.round((diffPixels / totalPixels) * 100);
          setCurrentMotionScore(score);

          const triggerLevel = sensitivityThresholds[motionSensitivity];
          if (score >= triggerLevel) {
            const now = Date.now();
            // Debounce trigger by at least 4.5 seconds
            if (now - lastAlertTimeRef.current > 4500) {
              lastAlertTimeRef.current = now;
              handleMotionTriggered(score);
            }
          }
        }

        prevFrameRef.current = currentData;
      } catch (err) {
        console.warn("Motion detection loop tick error:", err);
      }
    }, 250); // 4 checks per second (Ultra-low CPU usage ~0.2%)

    return () => {
      if (motionLoopTimerRef.current) {
        clearInterval(motionLoopTimerRef.current);
        motionLoopTimerRef.current = null;
      }
    };
  }, [connectionStatus, isMotionDetectionEnabled, motionSensitivity, handleMotionTriggered]);

  // Video Recording Logic
  const startStreamRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      toast.error("Camera stream is not active.");
      return;
    }

    const stream = videoRef.current.srcObject as MediaStream;
    if (stream.getTracks().length === 0) {
      toast.error("Camera stream is not active.");
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
        recorder = new MediaRecorder(stream, options);
      } catch (optErr) {
        console.warn("Falling back to browser default recorder for live stream:", optErr);
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event: any) => {
        console.error("Live MediaRecorder error:", event);
        toast.error("Recording error: " + (event.error?.name || "Encoder failure"));
      };

      recorder.onstop = async () => {
        const durationMs = Date.now() - recordingStartTimeRef.current;
        const durationSec = Math.max(1, Math.round(durationMs / 1000));
        const actualMime = recorder.mimeType || selectedMimeType || "video/mp4";
        const isMp4 = actualMime.includes("mp4");
        const ext = isMp4 ? "mp4" : "webm";
        let blob = new Blob(recordedChunksRef.current, { type: actualMime });

        // Ensure duration headers are valid so players do not stop playback early
        blob = await ensureValidVideoBlob(blob, durationMs);

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `cctv_${recordingQuality}_${dateStr}_${Date.now()}.${ext}`;

        // Auto download to PC
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        // Save metadata to database
        try {
          await fetch("/api/recordings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: selectedSessionId || undefined,
              fileName,
              fileFormat: ext,
              fileSizeBytes: blob.size,
              durationSeconds: durationSec,
              startedAt: new Date(recordingStartTimeRef.current).toISOString(),
              endedAt: new Date().toISOString(),
              saveStatus: "downloaded",
              saveLocationDescription: `Saved locally as ${qualityConfig.shortLabel} ${ext.toUpperCase()} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`,
            }),
          });
        } catch (e) {
          console.error("Failed to save metadata", e);
        }

        toast.success(`Recording saved as ${fileName} (${qualityConfig.shortLabel}, ${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
      };

      // Start recording continuously without timeslice
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecordingStream(true);
      setRecordingSeconds(0);
      toast.info(`Recording started in ${qualityConfig.label}`);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast.error("Failed to start recorder: " + err.message);
    }
  };

  const stopStreamRecording = () => {
    if (mediaRecorderRef.current && isRecordingStream) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingStream(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().catch(console.error);
      } else {
        document.exitFullscreen().catch(console.error);
      }
    }
  };

  const downloadSnapshot = (event: MotionEvent) => {
    const a = document.createElement("a");
    a.href = event.snapshotUrl;
    a.download = `cctv_snapshot_${event.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activeQualityConfig = QUALITY_CONFIGS[recordingQuality];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Live CCTV Monitor
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time peer-to-peer CCTV camera stream with AI Motion Detection &amp; Security Alerts.
          </p>
        </div>

        {/* Session Selector & Connect */}
        <div className="flex items-center gap-3">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="h-11 rounded-xl bg-[#E8EAF0] border border-white/80 px-3 text-xs font-semibold text-[#172033] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] focus:outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session: {s.id.slice(0, 10)}... ({s.status})
              </option>
            ))}
          </select>
          <Button variant="primary" size="md" onClick={connectToStream}>
            Connect Stream
          </Button>
          <Button variant="outline" size="md" onClick={disconnectStream}>
            Disconnect
          </Button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <Card className="p-4 overflow-hidden">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/80 shadow-[inset_4px_4px_10px_rgba(0,0,0,0.6)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain"
          />

          {connectionStatus !== "Live Stream Active" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#E8EAF0]/90 text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#E8EAF0] border border-white/80 shadow-[4px_4px_10px_rgba(163,177,198,0.45),-4px_-4px_10px_rgba(255,255,255,0.95)] flex items-center justify-center mb-3">
                <span className="w-4 h-4 rounded-full bg-[#94A3B8]"></span>
              </div>
              <p className="text-sm font-bold text-[#172033]">{connectionStatus}</p>
              <p className="text-xs text-[#64748B] max-w-sm mt-1">
                Select an active session above and click &ldquo;Connect Stream&rdquo;. Make sure your camera device is streaming.
              </p>
            </div>
          )}

          {/* Real-time Motion Alert Pulsing Banner */}
          {isMotionAlertActive && (
            <div className="absolute top-4 inset-x-0 mx-auto w-max z-30 flex items-center space-x-2 bg-red-600/95 text-white px-5 py-2 rounded-full text-xs font-black tracking-wider animate-bounce shadow-2xl border border-white/40">
              <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
              <span>🚨 MOTION DETECTED ({currentMotionScore}%)</span>
            </div>
          )}

          {/* Active Recording Pill */}
          {isRecordingStream && (
            <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-red-600/90 text-white px-3.5 py-1.5 rounded-full text-xs font-bold animate-pulse shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
              <span>REC: {formatTimer(recordingSeconds)} ({activeQualityConfig.shortLabel})</span>
            </div>
          )}

          {/* Motion HUD Intensity Gauge */}
          {connectionStatus === "Live Stream Active" && isMotionDetectionEnabled && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2.5 bg-black/70 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isMotionAlertActive ? "bg-red-500 animate-ping" : "bg-[#22A06B]"
                }`}
              />
              <span className="font-mono text-[11px]">Motion: {currentMotionScore}%</span>
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    currentMotionScore >= (motionSensitivity === "high" ? 3 : motionSensitivity === "medium" ? 7 : 14)
                      ? "bg-red-500"
                      : "bg-[#22A06B]"
                  }`}
                  style={{ width: `${Math.min(currentMotionScore * 3, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* CCTV Quality Tag */}
          {connectionStatus === "Live Stream Active" && (
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-semibold border border-white/20 backdrop-blur-sm">
              <span>CCTV LIVE ({activeQualityConfig.shortLabel})</span>
            </div>
          )}
        </div>

        {/* AI Motion Detection Settings & Quick Controls */}
        <div className="mt-4 p-4 bg-[#E8EAF0] rounded-xl flex flex-wrap items-center justify-between gap-4 border border-white/60 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.2)]">
          {/* Left: Motion Engine Switches */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Motion Detection Master Toggle */}
            <Button
              variant={isMotionDetectionEnabled ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setIsMotionDetectionEnabled(!isMotionDetectionEnabled);
                toast.info(isMotionDetectionEnabled ? "AI Motion Detection paused" : "AI Motion Detection activated");
              }}
              className="text-xs font-bold"
            >
              {isMotionDetectionEnabled ? "🛡️ Motion Guard: ACTIVE" : "🛡️ Motion Guard: OFF"}
            </Button>

            {/* Sensitivity Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Sensitivity:</span>
              <select
                value={motionSensitivity}
                onChange={(e) => setMotionSensitivity(e.target.value as any)}
                disabled={!isMotionDetectionEnabled}
                className="h-8 rounded-lg bg-[#E8EAF0] border border-white/80 px-2 text-xs font-semibold text-[#172033] shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] focus:outline-none"
              >
                <option value="high">High (3% move)</option>
                <option value="medium">Medium (7% move)</option>
                <option value="low">Low (14% move)</option>
              </select>
            </div>

            {/* Audio Alarm Sound Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSoundAlertEnabled(!isSoundAlertEnabled);
                toast.info(!isSoundAlertEnabled ? "Sound Alert Alarm enabled" : "Sound Alert Alarm muted");
              }}
              title="Plays an alert chime when motion is detected"
              className="text-xs"
            >
              {isSoundAlertEnabled ? "🔔 Alarm: Sound ON" : "🔕 Alarm: Muted"}
            </Button>

            {/* Auto Record on Motion Toggle */}
            <Button
              variant={isAutoRecordOnMotion ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setIsAutoRecordOnMotion(!isAutoRecordOnMotion);
                toast.info(!isAutoRecordOnMotion ? "Auto-Record on Motion enabled" : "Auto-Record on Motion disabled");
              }}
              title="Automatically starts video recording when intruder/motion is detected"
              className="text-xs"
            >
              {isAutoRecordOnMotion ? "🎥 Auto-Rec: ON" : "🎥 Auto-Rec: OFF"}
            </Button>
          </div>

          {/* Right: Manual Snapshot, Mic Audio & Recording Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Manual Snapshot Photo Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSnapshot}
              disabled={connectionStatus !== "Live Stream Active"}
              className="text-xs font-semibold"
              title="Takes an instant high-resolution security snapshot photo"
            >
              📸 Capture Snapshot
            </Button>

            {/* Recording Quality Dropdown Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Quality:</span>
              <select
                value={recordingQuality}
                onChange={(e) => setRecordingQuality(e.target.value as RecordingQuality)}
                disabled={isRecordingStream}
                className="h-8 rounded-lg bg-[#E8EAF0] border border-white/80 px-2 text-xs font-semibold text-[#172033] shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] focus:outline-none"
              >
                <option value="1080p">1080p Full HD</option>
                <option value="720p">720p HD</option>
                <option value="480p">480p Medium</option>
              </select>
            </div>

            {/* Audio Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                  if (isMuted) {
                    videoRef.current.play().catch(console.error);
                  }
                }
              }}
              disabled={connectionStatus !== "Live Stream Active"}
              className="text-xs"
            >
              {isMuted ? "Unmute Mic" : "Mute Mic"}
            </Button>

            {/* MP4 Recording Button */}
            {isRecordingStream ? (
              <Button variant="danger" size="sm" onClick={stopStreamRecording} className="text-xs font-bold">
                Stop &amp; Save Video
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={startStreamRecording}
                disabled={connectionStatus !== "Live Stream Active"}
                className="text-xs font-semibold"
              >
                Record Video
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={toggleFullscreen} className="text-xs">
              Fullscreen
            </Button>
          </div>
        </div>
      </Card>

      {/* Security Motion Events & Evidence Photo Gallery */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/60">
          <div>
            <h2 className="text-lg font-bold text-[#172033] flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E05A47]"></span>
              <span>Security Motion Events &amp; Evidence Snapshots</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Automatic photo captures triggered by movement on camera feed. Click any photo to view or download.
            </p>
          </div>

          {motionEvents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMotionEvents([])}
              className="text-xs"
            >
              Clear Snapshots ({motionEvents.length})
            </Button>
          )}
        </div>

        {motionEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#94A3B8]">
            <p className="text-sm font-semibold text-[#64748B]">No motion events captured yet.</p>
            <p className="mt-1">
              When someone walks into frame or movement is detected, photos will automatically be saved here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4">
            {motionEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedSnapshot(evt)}
                className="group relative cursor-pointer bg-[#E8EAF0] rounded-xl overflow-hidden border border-white/80 shadow-[4px_4px_10px_rgba(163,177,198,0.4),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:shadow-[2px_2px_6px_rgba(163,177,198,0.45)] transition-all"
              >
                {/* Snapshot Image */}
                <div className="aspect-video bg-black relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evt.snapshotUrl}
                    alt="Motion Evidence"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {evt.motionScore > 0 ? (
                    <span className="absolute top-1.5 left-1.5 bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      {evt.motionScore}% Motion
                    </span>
                  ) : (
                    <span className="absolute top-1.5 left-1.5 bg-[#22A06B]/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      Manual Photo
                    </span>
                  )}
                </div>

                {/* Footer Info */}
                <div className="p-2.5 flex items-center justify-between text-[11px] text-[#172033]">
                  <span className="font-mono font-semibold">{evt.timestamp}</span>
                  <span className="text-[#F28C28] font-bold group-hover:underline">View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Snapshot Fullscreen Evidence Viewer Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#E8EAF0] rounded-2xl border border-white/80 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-zinc-300">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E05A47]"></span>
                <h3 className="text-sm font-bold text-[#172033]">
                  Evidence Photo Details • {selectedSnapshot.timestamp}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-zinc-500 hover:text-zinc-800 p-1 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Photo Viewport */}
            <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/80 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSnapshot.snapshotUrl}
                alt="Enlarged Evidence"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Metadata and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-[#64748B]">
                <p>
                  Captured at: <strong className="text-[#172033]">{selectedSnapshot.time.toLocaleString()}</strong>
                </p>
                <p>
                  Motion Intensity:{" "}
                  <strong className="text-[#E05A47]">
                    {selectedSnapshot.motionScore > 0 ? `${selectedSnapshot.motionScore}% Optical Movement` : "Manual Snapshot"}
                  </strong>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => downloadSnapshot(selectedSnapshot)}
                  className="text-xs font-bold"
                >
                  ⬇️ Download Evidence Photo
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSnapshot(null)}
                  className="text-xs font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
