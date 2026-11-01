"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface Device {
  id: string;
  deviceName: string;
  browserInfo: string | null;
  osInfo: string | null;
  status: string;
  createdAt: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [deviceName, setDeviceName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/devices");
      const data = await res.json();
      if (data.devices) {
        setDevices(data.devices);
      }
    } catch (err: any) {
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName,
          browserInfo: navigator.userAgent.includes("Chrome") ? "Chrome" : "Browser",
          osInfo: navigator.platform || "Device OS",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to register device");
        return;
      }

      toast.success("Device registered successfully");
      setDeviceName("");
      setShowAddModal(false);
      fetchDevices();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("Are you sure you want to remove this device?")) return;
    try {
      const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Device removed");
        fetchDevices();
      } else {
        toast.error("Failed to delete device");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#E8EAF0] rounded-2xl border border-white/80 shadow-[8px_8px_16px_rgba(163,177,198,0.45),-8px_-8px_16px_rgba(255,255,255,0.95)]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Device Inventory
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage your authenticated hardware cameras and target receivers.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowAddModal(true)}
        >
          Add Device
        </Button>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#172033]">
              Register New Camera Device
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B]">
              Enter a recognizable label for this device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#172033]">Device Name</label>
                <Input
                  placeholder="e.g. Office Laptop Cam, Living Room Phone"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Device"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Devices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-[#64748B]">
            Loading device inventory...
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-[#94A3B8] bg-[#E8EAF0] rounded-2xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.35),inset_-4px_-4px_8px_rgba(255,255,255,0.95)]">
            No devices registered yet. Click &ldquo;Add Device&rdquo; to register one.
          </div>
        ) : (
          devices.map((device) => (
            <Card key={device.id} className="relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/60">
                  <span className="font-bold text-base text-[#172033]">
                    {device.deviceName}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      device.status === "online"
                        ? "bg-[#22A06B]/20 text-[#22A06B]"
                        : "bg-[#94A3B8]/20 text-[#64748B]"
                    }`}
                  >
                    {device.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-[#64748B]">
                  <p>
                    <strong>Browser:</strong> {device.browserInfo || "Standard Browser"}
                  </p>
                  <p>
                    <strong>Platform:</strong> {device.osInfo || "Generic OS"}
                  </p>
                  <p>
                    <strong>Added:</strong> {new Date(device.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-white/60 flex items-center justify-between">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteDevice(device.id)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
