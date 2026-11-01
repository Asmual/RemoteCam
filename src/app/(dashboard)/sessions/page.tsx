"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface SessionItem {
  id: string;
  status: string;
  expiresAt: string;
  usageLimit: number;
  usageCount: number;
  device?: { deviceName: string } | null;
  createdAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expiryMinutes, setExpiryMinutes] = React.useState(60);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

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

      setGeneratedUrl(data.joinUrl);
      toast.success("Join link created!");
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
        toast.success("Session revoked");
        fetchSessions();
      } else {
        toast.error("Failed to revoke session");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyToClipboard = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast.success("Join URL copied to clipboard!");
    }
  };

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
              Active Join Link Ready
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Share this link with your secondary camera device. The recipient must grant camera permission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-[#E8EAF0] rounded-xl shadow-[inset_3px_3px_6px_rgba(163,177,198,0.35),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] break-all font-mono text-xs text-[#172033]">
              {generatedUrl}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setGeneratedUrl(null)}>
                Dismiss
              </Button>
              <Button variant="primary" size="sm" onClick={copyToClipboard}>
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#172033]">
            Session History
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            All active, expired, and revoked connection sessions
          </CardDescription>
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
                    <th className="py-3 px-4 font-semibold">Session ID</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Expires At</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/20">
                      <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                        {s.id.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === "connected"
                              ? "bg-[#22A06B]/20 text-[#22A06B]"
                              : s.status === "pending"
                              ? "bg-[#F28C28]/20 text-[#F28C28]"
                              : "bg-[#94A3B8]/20 text-[#64748B]"
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(s.expiresAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {s.status !== "revoked" && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevoke(s.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
