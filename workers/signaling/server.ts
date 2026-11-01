import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.SIGNALING_PORT) || 3001;

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  role: "owner" | "target";
}

const rooms = new Map<string, Map<WebSocket, ClientConnection>>();

const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`[RemoteCam Signaling] WebSocket server running on port ${PORT}`);
});

wss.on("connection", (ws: WebSocket) => {
  let currentRoom: string | null = null;

  ws.on("message", (rawMessage: string) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, sessionId, senderRole, payload } = data;

      if (type === "join-room" && sessionId && senderRole) {
        currentRoom = sessionId;
        if (!rooms.has(sessionId)) {
          rooms.set(sessionId, new Map());
        }
        const room = rooms.get(sessionId)!;
        room.set(ws, { ws, sessionId, role: senderRole });

        ws.send(JSON.stringify({ type: "room-joined", sessionId, role: senderRole }));

        // Notify other peer in the room
        for (const [peerWs, client] of room.entries()) {
          if (peerWs !== ws && peerWs.readyState === WebSocket.OPEN) {
            peerWs.send(JSON.stringify({ type: "user-joined", role: senderRole }));
          }
        }
        return;
      }

      // Relay signaling messages (offer, answer, ice-candidate) to the opposite peer
      if (sessionId && rooms.has(sessionId)) {
        const room = rooms.get(sessionId)!;
        for (const [peerWs] of room.entries()) {
          if (peerWs !== ws && peerWs.readyState === WebSocket.OPEN) {
            peerWs.send(
              JSON.stringify({
                type,
                sessionId,
                senderRole,
                payload,
              })
            );
          }
        }
      }
    } catch (err) {
      console.error("[RemoteCam Signaling Error]", err);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom)!;
      const leavingClient = room.get(ws);
      room.delete(ws);

      for (const [peerWs] of room.entries()) {
        if (peerWs.readyState === WebSocket.OPEN) {
          peerWs.send(JSON.stringify({ type: "user-left", role: leavingClient?.role }));
        }
      }

      if (room.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});
