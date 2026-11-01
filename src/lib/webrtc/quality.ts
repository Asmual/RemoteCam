export type RecordingQuality = "1080p" | "720p" | "480p";

export interface QualityConfig {
  id: RecordingQuality;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  videoBitrate: number;
  description: string;
}

export const QUALITY_CONFIGS: Record<RecordingQuality, QualityConfig> = {
  "1080p": {
    id: "1080p",
    label: "Full HD (1080p) [Default]",
    shortLabel: "1080p Full HD",
    width: 1920,
    height: 1080,
    videoBitrate: 2500000, // 2.5 Mbps - Stable for 1 hour+ continuous hardware recording
    description: "Crisp Full HD video (Default)",
  },
  "720p": {
    id: "720p",
    label: "HD (720p) [Balanced]",
    shortLabel: "720p HD",
    width: 1280,
    height: 720,
    videoBitrate: 1500000, // 1.5 Mbps
    description: "Balanced quality and smaller file size",
  },
  "480p": {
    id: "480p",
    label: "Medium (480p) [Storage Saver]",
    shortLabel: "480p Medium",
    width: 854,
    height: 480,
    videoBitrate: 800000, // 800 kbps - High efficiency for multi-hour CCTV recording
    description: "Storage saver mode (saves ~80% space)",
  },
};

export function getSupportedVideoMimeType(): { mimeType: string; fileExtension: string } {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "video/mp4", fileExtension: "mp4" };
  }

  const formats = [
    // Standard MP4 with H.264 / AVC1 + AAC audio
    { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', fileExtension: "mp4" },
    { mimeType: 'video/mp4;codecs="avc1,mp4a.40.2"', fileExtension: "mp4" },
    { mimeType: "video/mp4;codecs=avc1", fileExtension: "mp4" },
    { mimeType: "video/mp4", fileExtension: "mp4" },
    // Highly compatible WebM formats
    { mimeType: "video/webm;codecs=vp9,opus", fileExtension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", fileExtension: "webm" },
    { mimeType: "video/webm;codecs=h264,opus", fileExtension: "webm" },
    { mimeType: "video/webm", fileExtension: "webm" },
  ];

  for (const fmt of formats) {
    try {
      if (MediaRecorder.isTypeSupported(fmt.mimeType)) {
        return fmt;
      }
    } catch {
      // Continue to next format
    }
  }

  return { mimeType: "", fileExtension: "mp4" };
}

export async function ensureValidVideoBlob(blob: Blob, durationMs: number): Promise<Blob> {
  if (blob.type.includes("webm") && durationMs > 0) {
    try {
      const fixWebmDurationMod = await import("fix-webm-duration");
      const fixWebmDuration = (fixWebmDurationMod as any).default || fixWebmDurationMod;
      return await fixWebmDuration(blob, durationMs);
    } catch (e) {
      console.warn("Could not patch WebM duration header:", e);
      return blob;
    }
  }
  return blob;
}
