"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { DataChannelMessage } from "@/types/webrtc";

interface SessionItem {
  id: string;
  status: string;
  expiresAt: string;
}

export default function LiveMonitoringPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("");
  const [connectionStatus, setConnectionStatus] = React.useState<string>("Disconnected");
  const [isRemoteRecording, setIsRemoteRecording] = React.useState(false);
  const [recordingTimer, setRecordingTimer] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [hasAudioTrack, setHasAudioTrack] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

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
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setConnectionStatus("Disconnected");
    setIsRemoteRecording(false);
  };

  const connectToStream = () => {
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
        toast.success("Live video & audio feed connected!");
        videoRef.current.play().catch(console.error);
      }
    };

    // Dynamic Signaling WebSocket
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${host}:3001`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setConnectionStatus("Signaling connected. Creating offer...");
      ws.send(
        JSON.stringify({
          type: "join-room",
          sessionId: selectedSessionId,
          senderRole: "owner",
        })
      );

      // Create WebRTC Offer
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      ws.send(
        JSON.stringify({
          type: "offer",
          sessionId: selectedSessionId,
          senderRole: "owner",
          payload: offer,
        })
      );
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
      } else if (message.type === "ice-candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(message.payload));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "ice-candidate",
            sessionId: selectedSessionId,
            senderRole: "owner",
            payload: event.candidate,
          })
        );
      }
    };
  };

  const handleStartRemoteRecording = () => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      toast.error("Control channel not ready. Ensure device is connected.");
      return;
    }

    const msg: DataChannelMessage = {
      type: "START_RECORDING",
      timestamp: Date.now(),
    };
    dataChannelRef.current.send(JSON.stringify(msg));
    setIsRemoteRecording(true);
    setRecordingTimer(0);
    toast.info("Remote recording command transmitted.");

    timerRef.current = setInterval(() => {
      setRecordingTimer((prev) => prev + 1);
    }, 1000);
  };

  const handleStopRemoteRecording = () => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") return;

    const msg: DataChannelMessage = {
      type: "STOP_RECORDING",
      timestamp: Date.now(),
    };
    dataChannelRef.current.send(JSON.stringify(msg));
    setIsRemoteRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    toast.success("Remote recording stopped. Saving on target device.");
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Live Camera Monitor
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time peer-to-peer video stream via WebRTC.
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
                Select an active session above and click &ldquo;Connect Stream&rdquo;. Make sure the target device has accepted the camera prompt.
              </p>
            </div>
          )}

          {/* Active Recording Pill */}
          {isRemoteRecording && (
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
              <span>REMOTE RECORDING: {recordingTimer}s</span>
            </div>
          )}
        </div>

        {/* Stream Action Toolbar */}
        <div className="mt-4 p-4 bg-[#E8EAF0] rounded-xl flex flex-wrap items-center justify-between gap-4 border border-white/60">
          <div className="flex items-center space-x-3">
            <span
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "Live Stream Active" ? "bg-[#22A06B]" : "bg-[#94A3B8]"
              }`}
            ></span>
            <span className="text-xs font-semibold text-[#172033]">{connectionStatus}</span>
            {hasAudioTrack && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22A06B]/20 text-[#22A06B]">
                MIC AUDIO LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
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

            {isRemoteRecording ? (
              <Button variant="danger" size="sm" onClick={handleStopRemoteRecording}>
                Stop Remote Recording
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartRemoteRecording}
                disabled={connectionStatus !== "Live Stream Active"}
              >
                Request Remote Recording
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
