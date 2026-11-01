export type SignalingMessageType =
  | "join-room"
  | "room-joined"
  | "user-joined"
  | "user-left"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "error";

export interface SignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  senderRole: "owner" | "target";
  payload?: any;
}

export type DataChannelCommandType =
  | "START_RECORDING"
  | "STOP_RECORDING"
  | "RECORDING_STARTED"
  | "RECORDING_STOPPED"
  | "RECORDING_SAVED"
  | "RECORDING_FAILED"
  | "STATUS_PING"
  | "STATUS_PONG";

export interface DataChannelMessage {
  type: DataChannelCommandType;
  timestamp: number;
  payload?: {
    recordingId?: string;
    fileName?: string;
    fileSize?: number;
    durationSeconds?: number;
    error?: string;
  };
}

export interface WebRTCConnectionState {
  signalingStatus: "disconnected" | "connecting" | "connected" | "failed";
  peerConnectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  isStreaming: boolean;
  isRecording: boolean;
  activeRecordingDuration: number;
}
