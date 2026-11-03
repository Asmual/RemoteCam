"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SessionItem {
  id: string;
  token?: string;
  joinUrl?: string;
  status: string;
  expiresAt: string;
  usageLimit: number;
  usageCount: number;
  device?: { deviceName: string } | null;
  createdAt: string;
}

const PRODUCTION_APP_URL = "https://remote-cam-asmual.vercel.app";

export default function SessionsPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expiryMinutes, setExpiryMinutes] = React.useState(60);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err: any) {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSessions();

    // Sync default session expiry from user's saved preferences
    try {
      const cached = localStorage.getItem("remotecam_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.defaultSessionExpiryMinutes) {
          setExpiryMinutes(Number(parsed.defaultSessionExpiryMinutes));
        }
      }
    } catch (e) {
      console.warn("Could not load expiry preference:", e);
    }
  }, []);

  const handleCreateSession = async () => {
    try {
      setIsCreating(true);
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryMinutes }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create session");
        return;
      }

      const token = data.rawToken || data.session?.id || "";
      const liveUrl = `${PRODUCTION_APP_URL}/join/${token}`;
      setGeneratedUrl(liveUrl);
      setGeneratedToken(token);
      toast.success("Live join link generated successfully!");
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}/revoke`, { method: "POST" });
      if (res.ok) {
        toast.success("Session revoked successfully");
        fetchSessions();
      } else {
        toast.error("Failed to revoke session");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this session from the database?")) {
      return;
    }

    try {
      setIsDeleting(id);
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Session permanently deleted from database");
        fetchSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete session");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearInactive = async () => {
    const inactiveSessions = sessions.filter(
      (s) => s.status === "revoked" || new Date(s.expiresAt) < new Date()
    );

    if (inactiveSessions.length === 0) {
      toast.info("No expired or revoked sessions to clear.");
      return;
    }

    if (!confirm(`Delete ${inactiveSessions.length} inactive/expired session(s) permanently?`)) {
      return;
    }

    try {
      let count = 0;
      for (const s of inactiveSessions) {
        const res = await fetch(`/api/sessions/${s.id}`, { method: "DELETE" });
        if (res.ok) count++;
      }
      toast.success(`Cleared ${count} inactive session(s) from database`);
      fetchSessions();
    } catch (err: any) {
      toast.error("Error during batch delete: " + err.message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const inactiveCount = sessions.filter(
    (s) => s.status === "revoked" || new Date(s.expiresAt) < new Date()
  ).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Device Sessions
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Generate secure, expiring join links with explicit target consent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={expiryMinutes}
            onChange={(e) => setExpiryMinutes(Number(e.target.value))}
            className="h-11 rounded-xl bg-[#E8EAF0] border border-white/80 px-3 text-xs font-semibold text-[#172033] shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] focus:outline-none"
          >
            <option value={15}>15 Minutes</option>
            <option value={60}>1 Hour</option>
            <option value={1440}>24 Hours</option>
          </select>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateSession}
            disabled={isCreating}
          >
            {isCreating ? "Generating..." : "Create Join Link"}
          </Button>
        </div>
      </div>

      {/* Generated Link Alert Card */}
      {generatedUrl && (
        <Card className="border-l-4 border-l-[#F28C28]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#172033]">
              Active Live Join Link Ready
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Share this live production link with your iPhone or target camera device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#172033]">
                  Production Join URL:
                </span>
                <div className="flex items-center gap-3">
                  {generatedToken && (
                    <button
                      onClick={() => copyToClipboard(generatedToken, "Token")}
                      className="text-[#64748B] hover:text-[#172033] font-semibold hover:underline"
                    >
                      Copy Token Only
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(generatedUrl, "Join Link")}
                    className="text-[#F28C28] font-bold hover:underline"
                  >
                    Copy Full Link
                  </button>
                </div>
              </div>
              <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[inset_3px_3px_6px_rgba(163,177,198,0.35),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] break-all font-mono text-xs text-[#172033]">
                {generatedUrl}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(generatedUrl, "_blank")}
              >
                Open in New Tab
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setGeneratedUrl(null);
                  setGeneratedToken(null);
                }}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-[#172033]">
              Session History &amp; Join Links
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Manage connection sessions. You can copy active links or permanently delete unwanted sessions from the database.
            </CardDescription>
          </div>

          {inactiveCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearInactive}
              className="text-xs text-red-600 hover:text-red-700"
              title="Delete all expired and revoked sessions at once"
            >
              Clear Expired ({inactiveCount})
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs text-[#64748B]">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              No sessions created yet. Click &ldquo;Create Join Link&rdquo; to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/60 text-[#64748B]">
                    <th className="py-3 px-4 font-semibold">Session ID / Token</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Expires At</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {sessions.map((s) => {
                    const sessionUrl = `${PRODUCTION_APP_URL}/join/${s.id}`;
                    const isRevoked = s.status === "revoked";
                    const isExpired = new Date(s.expiresAt) < new Date();
                    const isDeletingThis = isDeleting === s.id;

                    return (
                      <tr key={s.id} className="hover:bg-white/20">
                        <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                          <div className="flex items-center space-x-2">
                            <span>{s.id.slice(0, 14)}...</span>
                            <button
                              onClick={() => copyToClipboard(s.id, "Session ID")}
                              title="Copy Session ID"
                              className="text-[#64748B] hover:text-[#F28C28]"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isRevoked
                                ? "bg-red-500/20 text-red-600"
                                : isExpired
                                ? "bg-gray-500/20 text-gray-600"
                                : s.status === "connected"
                                ? "bg-[#22A06B]/20 text-[#22A06B]"
                                : "bg-[#F28C28]/20 text-[#F28C28]"
                            }`}
                          >
                            {isRevoked ? "REVOKED" : isExpired ? "EXPIRED" : s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(s.expiresAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Copy Link Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(sessionUrl, "Join Link")}
                              title="Copy Live Join Link for this session"
                            >
                              Copy Link
                            </Button>

                            {/* Open in new tab */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(sessionUrl, "_blank")}
                              title="Open join page in new window"
                            >
                              Open
                            </Button>

                            {/* Revoke button (for active sessions) */}
                            {!isRevoked && !isExpired && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevoke(s.id)}
                                className="text-amber-600 hover:text-amber-700"
                              >
                                Revoke
                              </Button>
                            )}

                            {/* Delete button (Permanently removes from database) */}
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(s.id)}
                              disabled={isDeletingThis}
                              title="Permanently delete this session from database"
                            >
                              {isDeletingThis ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
