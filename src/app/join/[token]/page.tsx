"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { DataChannelMessage } from "@/types/webrtc";
import { HybridSignalingClient } from "@/lib/webrtc/signaling";

function DeviceJoinPageContent() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = React.useState(true);
  const [sessionData, setSessionData] = React.useState<any>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Consent states: Audio and Camera enabled by default
  const [cameraAllowed, setCameraAllowed] = React.useState(true);
  const [audioAllowed, setAudioAllowed] = React.useState(true);
  const [consented, setConsented] = React.useState(false);

  // Camera facing mode: "user" (front/selfie camera) or "environment" (back camera)
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("user");

  // Media & Streaming states
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<string>("Idle");
  const [isBlackScreen, setIsBlackScreen] = React.useState(false);
  const [isMicMuted, setIsMicMuted] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const signalingRef = React.useRef<HybridSignalingClient | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);

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

      // Browser getUserMedia - Front Camera by default
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
      toast.success("Camera started! Live feed broadcasting to monitor.");
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
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

  const handleDisconnect = () => {
    cleanupMedia();
    setConsented(false);
    setLocalStream(null);
    setConnectionStatus("Session Terminated");
    toast.info("Camera disconnected.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4">
        <p className="text-sm font-semibold text-[#64748B]">Verifying secure connection token...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-l-4 border-l-[#E05A47]">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#172033]">Access Denied</CardTitle>
            <CardDescription className="text-xs text-[#E05A47] mt-1">{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">
              Please request a new join link from the camera session owner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8EAF0] text-[#172033] flex flex-col justify-center p-4 sm:p-8">
      {/* Stealth Black Screen Overlay */}
      {isBlackScreen && (
        <div
          onClick={() => setIsBlackScreen(false)}
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-between p-8 cursor-pointer select-none"
        >
          <div className="text-[11px] text-zinc-800 tracking-widest font-mono text-center">
            STEALTH DISPLAY SLEEP (CLICK ANYWHERE TO WAKE)
          </div>
          <div className="w-2 h-2 rounded-full bg-red-950/40 animate-ping"></div>
          <div className="text-[10px] text-zinc-900 font-mono text-center">
            LIVE CCTV STREAM ACTIVE
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto w-full">
        {!consented ? (
          /* CCTV Camera Connection Card */
          <Card className="border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8EAF0] border border-white/80 shadow-[4px_4px_10px_rgba(163,177,198,0.45),-4px_-4px_10px_rgba(255,255,255,0.95)] flex items-center justify-center mb-3">
                <span className="w-4 h-4 rounded-full bg-[#22A06B] animate-pulse"></span>
              </div>
              <CardTitle className="text-xl font-extrabold text-[#172033]">
                Connect as CCTV Camera
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] mt-1.5">
                Connecting to monitor owned by <strong>{sessionData?.ownerName || "Dashboard Owner"}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="p-4 bg-[#E8EAF0] rounded-xl shadow-[inset_3px_3px_6px_rgba(163,177,198,0.35),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] text-xs text-[#64748B] space-y-2">
                <p className="font-semibold text-[#172033]">CCTV Live Streaming Mode:</p>
                <p>• Your device&apos;s camera will stream live video &amp; audio directly to the monitor.</p>
                <p>• Default camera: <strong>Front (Selfie) Camera</strong>.</p>
                <p>• You can flip to the back camera or turn on Black Screen mode anytime.</p>
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
                  <span className="font-semibold text-[#172033]">
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
                  <span className="text-[#64748B]">
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
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
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

              {/* Facing Mode Badge */}
              <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-semibold border border-white/20 backdrop-blur-sm">
                <span>{facingMode === "user" ? "FRONT CAM" : "BACK CAM"}</span>
              </div>
            </div>

            {/* Quick CCTV Controls */}
            <div className="p-5 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[6px_6px_14px_rgba(163,177,198,0.4),-6px_-6px_14px_rgba(255,255,255,0.95)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#172033]">CCTV Device Controls</p>
                  <p className="text-[11px] text-[#64748B]">
                    Status: <span className="font-semibold text-[#F28C28]">{connectionStatus}</span>
                  </p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-ping"></span>
                  <span className="text-[10px] font-bold text-[#22A06B]">BROADCASTING</span>
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

                {/* Black Screen / Stealth */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBlackScreen(true)}
                  className="w-full text-xs font-semibold"
                  title="Turn screen black while camera continues streaming"
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

                {/* Disconnect */}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDisconnect}
                  className="w-full text-xs font-semibold"
                >
                  Disconnect
                </Button>
              </div>

              <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] text-[11px] text-[#64748B]">
                💡 <strong>Tip:</strong> You can click <strong>&ldquo;Black Screen&rdquo;</strong> to dim the phone screen completely black. The live camera and microphone will continue broadcasting to your laptop monitor!
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
        <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4">
          <p className="text-sm font-semibold text-[#64748B]">Loading secure connection...</p>
        </div>
      }
    >
      <DeviceJoinPageContent />
    </React.Suspense>
  );
}
