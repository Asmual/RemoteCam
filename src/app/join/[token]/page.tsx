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
  const [recordingAllowed, setRecordingAllowed] = React.useState(true);
  const [consented, setConsented] = React.useState(false);

  // Media & Streaming states
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<string>("Idle");
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [savedDownloadUrl, setSavedDownloadUrl] = React.useState<string | null>(null);
  const [isBlackScreen, setIsBlackScreen] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const signalingRef = React.useRef<HybridSignalingClient | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // 1. Validate Token on mount
  React.useEffect(() => {
    if (!token) return;
    fetch(`/api/join/${token}/validate`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setSessionData(data);
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

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
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  // 2. Grant Consent & Start Streaming
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
          recordingAllowed,
        }),
      });

      // Browser getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: audioAllowed,
      });

      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setConsented(true);
      setConnectionStatus("Initializing WebRTC...");
      initWebRTC(stream);
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
      channel.onmessage = (e) => handleDataChannelMessage(JSON.parse(e.data));
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
        setConnectionStatus("Streaming live to owner");
      } else if (pc.connectionState === "disconnected") {
        setConnectionStatus("Owner disconnected");
      }
    };
  };

  // 4. Remote & Local Recording Handlers
  const handleDataChannelMessage = (msg: DataChannelMessage) => {
    if (msg.type === "START_RECORDING") {
      if (!recordingAllowed) {
        toast.error("Recording requested by owner, but local consent was not granted.");
        return;
      }
      startRecording();
    } else if (msg.type === "STOP_RECORDING") {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!localStream) return;
    recordedChunksRef.current = [];
    // Configure mimeType to include both video and opus audio
    let options: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
      options = { mimeType: "video/webm;codecs=vp8,opus" };
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      options = { mimeType: "video/webm" };
    }
    const recorder = new MediaRecorder(localStream, options);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = saveRecordingFile;

    recorder.start(1000);
    setIsRecording(true);
    setRecordingSeconds(0);
    toast.info("Target local recording started.");

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      toast.success("Recording stopped. Preparing local file...");
    }
  };

  const saveRecordingFile = async () => {
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const fileName = `remotecam_${Date.now()}.webm`;

    // Attempt File System Access API if supported
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "WebM Video", accept: { "video/webm": [".webm"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success("Video saved directly to your local disk!");
      } catch (err) {
        // User cancelled picker or unsupported, fallback to blob URL
        createDownloadFallback(blob, fileName);
      }
    } else {
      createDownloadFallback(blob, fileName);
    }

    // Save metadata to server
    fetch("/api/recordings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionData?.sessionId,
        fileName,
        fileFormat: "webm",
        fileSizeBytes: blob.size,
        durationSeconds: recordingSeconds,
        startedAt: new Date(Date.now() - recordingSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        saveStatus: "saved_locally",
      }),
    }).catch(console.error);
  };

  const createDownloadFallback = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    setSavedDownloadUrl(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    toast.success("Recording downloaded to device!");
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
        <p className="text-sm text-[#64748B]">Verifying secure connection token...</p>
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
    <div className="min-h-screen bg-[#E8EAF0] text-[#172033] flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#E8EAF0] border border-white/80 shadow-[3px_3px_7px_rgba(163,177,198,0.45),-3px_-3px_7px_rgba(255,255,255,0.95)] flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-[#F28C28]"></span>
          </div>
          <span className="text-lg font-bold tracking-wider text-[#172033]">
            REMOTE<span className="text-[#F28C28]">CAM</span> TARGET
          </span>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#E8EAF0] border border-white/60 shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] font-semibold text-[#64748B]">
          {connectionStatus}
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto w-full">
        {!consented ? (
          /* Explicit Consent Step */
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#172033]">
                Camera Connection Request
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] mt-1">
                Owner <strong>{sessionData?.ownerName}</strong> ({sessionData?.ownerEmail}) is requesting to view this device&apos;s camera.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="p-4 bg-[#E8EAF0] rounded-xl shadow-[inset_3px_3px_6px_rgba(163,177,198,0.35),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] text-xs text-[#64748B] space-y-2">
                <p className="font-semibold text-[#172033]">Transparency Guarantee:</p>
                <p>• No hidden or background camera surveillance.</p>
                <p>• Live preview and recording indicator will remain permanently visible on this screen.</p>
                <p>• You may stop recording or terminate the stream at any time.</p>
              </div>

              {/* Consent Toggles */}
              <div className="space-y-3 text-xs">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cameraAllowed}
                    onChange={(e) => setCameraAllowed(e.target.checked)}
                    className="w-4 h-4 accent-[#F28C28]"
                  />
                  <span className="font-medium text-[#172033]">
                    Allow live video stream to owner (Required)
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioAllowed}
                    onChange={(e) => setAudioAllowed(e.target.checked)}
                    className="w-4 h-4 accent-[#F28C28]"
                  />
                  <span className="text-[#64748B]">Allow audio transmission (Optional)</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordingAllowed}
                    onChange={(e) => setRecordingAllowed(e.target.checked)}
                    className="w-4 h-4 accent-[#F28C28]"
                  />
                  <span className="text-[#64748B]">
                    Allow remote recording commands to be saved to this local device
                  </span>
                </label>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full mt-4"
                onClick={handleStartSession}
              >
                Accept &amp; Start Camera
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Active Camera Feed & Controls */
          <div className="space-y-6">
            {/* Full Black Screen Overlay (Simulates display off while recording continues) */}
            {isBlackScreen && (
              <div
                onClick={() => setIsBlackScreen(false)}
                className="fixed inset-0 bg-black z-[999] flex flex-col items-center justify-between p-8 cursor-pointer select-none"
              >
                <div className="text-[10px] text-zinc-900 tracking-widest font-mono">
                  DISPLAY SLEEP ACTIVE (CLICK ANYWHERE TO WAKE)
                </div>
                <div className="text-[9px] text-zinc-950 font-mono">
                  REMOTE CAM RECORDING ACTIVE
                </div>
              </div>
            )}

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Persistent Recording Indicator Badge */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                  <span>RECORDING: {recordingSeconds}s</span>
                </div>
              )}

              {/* Mic Status Badge */}
              <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-black/60 text-white px-2.5 py-1 rounded-full text-[10px] font-semibold border border-white/20 backdrop-blur-sm">
                <span className={`w-2 h-2 rounded-full ${audioAllowed ? "bg-[#22A06B]" : "bg-[#94A3B8]"}`}></span>
                <span>{audioAllowed ? "MIC ACTIVE" : "MIC MUTED"}</span>
              </div>
            </div>

            {/* Local Device Controls */}
            <div className="p-4 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[6px_6px_14px_rgba(163,177,198,0.4),-6px_-6px_14px_rgba(255,255,255,0.95)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#172033]">Target Controls</p>
                <p className="text-[11px] text-[#64748B]">
                  You have full local override capability
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* OS Display Sleep (Physically powers off laptop screen) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info("Turning off monitor display in 1s. Move mouse or press any key to wake screen.");
                    setTimeout(() => {
                      fetch("/api/system/display-sleep", { method: "POST" }).catch(console.error);
                    }, 1000);
                  }}
                  title="Physically turns off laptop screen backlight while camera continues recording"
                >
                  Turn Off Display (OS Sleep)
                </Button>

                {/* Black Screen / Stealth Display Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBlackScreen(true)}
                  title="Turn screen completely pitch black while keeping camera & audio recording"
                >
                  Black Screen Mode
                </Button>

                {isRecording ? (
                  <Button variant="danger" size="sm" onClick={stopRecording}>
                    Stop Recording
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={startRecording}
                    disabled={!recordingAllowed}
                  >
                    Start Local Record
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>

            {savedDownloadUrl && (
              <div className="p-3 bg-[#22A06B]/15 border border-[#22A06B]/40 rounded-xl flex items-center justify-between text-xs text-[#22A06B]">
                <span>Video recorded successfully!</span>
                <a
                  href={savedDownloadUrl}
                  download="remotecam_recording.webm"
                  className="font-bold underline"
                >
                  Download Again
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#94A3B8] pt-8">
        RemoteCam Verifiable Transparency Protocol &copy; 2026
      </footer>
    </div>
  );
}

export default function DeviceJoinPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4">
          <p className="text-sm text-[#64748B]">Loading connection interface...</p>
        </div>
      }
    >
      <DeviceJoinPageContent />
    </React.Suspense>
  );
}
