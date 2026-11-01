"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface RecordingItem {
  id: string;
  fileName: string;
  fileFormat: string;
  fileSizeBytes: number;
  durationSeconds: number;
  startedAt: string;
  saveStatus: string;
  saveLocationDescription: string | null;
  createdAt: string;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = React.useState<RecordingItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recordings");
      const data = await res.json();
      if (data.recordings) {
        setRecordings(data.recordings);
      }
    } catch (err: any) {
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRecordings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recording log? Note: This only deletes metadata. Local file remains on target device.")) return;
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Recording metadata deleted");
        fetchRecordings();
      } else {
        toast.error("Failed to delete record");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Recording History
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Audit logs and metadata of captured camera sessions.
          </p>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 bg-[#E8EAF0] rounded-xl border border-white/80 shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)] text-xs text-[#64748B] leading-relaxed">
        <strong>Privacy Architecture Note:</strong> Recorded video files are saved directly onto the target device&apos;s physical local hardware using the File System Access API. Videos are never uploaded to the cloud without explicit opt-in.
      </div>

      {/* Recordings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#172033]">
            Captured Videos Metadata
          </CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            All recording sessions authorized by target devices
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs text-[#64748B]">
              Loading recording logs...
            </div>
          ) : recordings.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94A3B8]">
              No recordings captured yet. Use &ldquo;Live Monitoring&rdquo; to command a recording.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/60 text-[#64748B]">
                    <th className="py-3 px-4 font-semibold">File Name</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold">Size</th>
                    <th className="py-3 px-4 font-semibold">Captured At</th>
                    <th className="py-3 px-4 font-semibold">Location</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {recordings.map((r) => (
                    <tr key={r.id} className="hover:bg-white/20">
                      <td className="py-3 px-4 font-mono font-medium text-[#172033]">
                        {r.fileName}
                      </td>
                      <td className="py-3 px-4 text-[#172033] font-semibold">
                        {r.durationSeconds}s
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {formatFileSize(r.fileSizeBytes)}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(r.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22A06B]/20 text-[#22A06B]">
                          Local Device
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete Log
                        </Button>
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
