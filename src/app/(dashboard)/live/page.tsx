"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HybridSignalingClient } from "@/lib/webrtc/signaling";

interface SessionItem {
  id: string;
  status: string;
  expiresAt: string;
}

export default function LiveMonitoringPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("");
  const [connectionStatus, setConnectionStatus] = React.useState<string>("Disconnected");
  const [isMuted, setIsMuted] = React.useState(false);
  const [hasAudioTrack, setHasAudioTrack] = React.useState(false);

  // Monitor-side Local MP4 Recording States (Medium Quality - Storage Saver)
  const [isRecordingStream, setIsRecordingStream] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const signalingRef = React.useRef<HybridSignalingClient | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = React.useRef<number>(0);

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

    return () => {
      disconnectStream();
    };
  }, []);

  const disconnectStream = () => {
    stopStreamRecording();

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

    // Hybrid WebRTC Signaling (Localhost WebSocket or Cloud Database Sync)
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

  // Start Monitor Stream Recording in MP4 Medium Quality (Storage Saver)
  const startStreamRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      toast.error("No active video feed to record. Connect to camera first.");
      return;
    }

    const stream = videoRef.current.srcObject as MediaStream;
    if (stream.getTracks().length === 0) {
      toast.error("Camera stream is not active.");
      return;
    }

    // Determine optimal MP4 format supported by browser
    let selectedMimeType = "video/webm";
    let fileExtension = "mp4";

    if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
      selectedMimeType = "video/mp4;codecs=avc1";
      fileExtension = "mp4";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      selectedMimeType = "video/mp4";
      fileExtension = "mp4";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
      selectedMimeType = "video/webm;codecs=h264";
      fileExtension = "mp4";
    }

    try {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 1000000, // Medium Quality (1 Mbps) - saves ~80% storage
        audioBitsPerSecond: 64000, // 64 kbps clear speech
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const durationSec = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        const mime = selectedMimeType.includes("mp4") ? "video/mp4" : "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `cctv_record_${dateStr}_${Date.now()}.${fileExtension}`;

        // Auto download to PC
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        // Save metadata to database
        try {
          await fetch("/api/recordings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: selectedSessionId || undefined,
              fileName,
              fileFormat: fileExtension,
              fileSizeBytes: blob.size,
              durationSeconds: durationSec,
              startedAt: new Date(recordingStartTimeRef.current).toISOString(),
              endedAt: new Date().toISOString(),
              saveStatus: "downloaded",
              saveLocationDescription: `Saved locally as optimized MP4 (${(blob.size / 1024 / 1024).toFixed(1)} MB)`,
            }),
          });
        } catch (e) {
          console.error("Failed to save metadata", e);
        }

        toast.success(`Recording saved as ${fileName} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecordingStream(true);
      setRecordingSeconds(0);
      toast.info(`Recording started in MP4 Medium Quality (Storage Saver Mode)`);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast.error("Failed to start recorder: " + err.message);
    }
  };

  const stopStreamRecording = () => {
    if (mediaRecorderRef.current && isRecordingStream) {
      mediaRecorderRef.current.stop();
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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Live CCTV Monitor
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time peer-to-peer CCTV camera stream with MP4 recording.
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
                Select an active session above and click &ldquo;Connect Stream&rdquo;. Make sure your mobile device has started the camera stream.
              </p>
            </div>
          )}

          {/* Active Recording Pill */}
          {isRecordingStream && (
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 text-white px-3.5 py-1.5 rounded-full text-xs font-bold animate-pulse shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
              <span>REC: {formatTimer(recordingSeconds)} (MP4 Medium)</span>
            </div>
          )}

          {/* CCTV Quality Tag */}
          {connectionStatus === "Live Stream Active" && (
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-semibold border border-white/20 backdrop-blur-sm">
              <span>CCTV LIVE (720p / MP4 OPTIMIZED)</span>
            </div>
          )}
        </div>

        {/* Stream Action Toolbar */}
        <div className="mt-4 p-4 bg-[#E8EAF0] rounded-xl flex flex-wrap items-center justify-between gap-4 border border-white/60 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.2)]">
          <div className="flex items-center space-x-3">
            <span
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "Live Stream Active" ? "bg-[#22A06B]" : "bg-[#94A3B8]"
              }`}
            ></span>
            <span className="text-xs font-semibold text-[#172033]">{connectionStatus}</span>
            {hasAudioTrack && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#22A06B]/20 text-[#22A06B]">
                MIC AUDIO LIVE
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
            >
              {isMuted ? "Unmute Audio" : "Mute Audio"}
            </Button>

            {/* MP4 Medium Quality Recording Button */}
            {isRecordingStream ? (
              <Button variant="danger" size="sm" onClick={stopStreamRecording}>
                Stop &amp; Save Recording
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={startStreamRecording}
                disabled={connectionStatus !== "Live Stream Active"}
                title="Records stream in optimized MP4 format to save storage"
              >
                Start Recording (MP4 Medium)
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              Fullscreen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
