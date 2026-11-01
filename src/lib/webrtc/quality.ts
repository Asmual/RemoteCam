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
    videoBitrate: 4500000, // 4.5 Mbps
    description: "Crisp Full HD video (Default)",
  },
  "720p": {
    id: "720p",
    label: "HD (720p) [Balanced]",
    shortLabel: "720p HD",
    width: 1280,
    height: 720,
    videoBitrate: 2000000, // 2 Mbps
    description: "Balanced quality and smaller file size",
  },
  "480p": {
    id: "480p",
    label: "Medium (480p) [Storage Saver]",
    shortLabel: "480p Medium",
    width: 854,
    height: 480,
    videoBitrate: 900000, // 900 kbps
    description: "Storage saver mode (saves ~80% space)",
  },
};

export function getSupportedVideoMimeType(): { mimeType: string; fileExtension: string } {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "video/mp4", fileExtension: "mp4" };
  }

  const formats = [
    { mimeType: "video/mp4;codecs=avc1", fileExtension: "mp4" },
    { mimeType: "video/mp4", fileExtension: "mp4" },
    { mimeType: "video/webm;codecs=h264", fileExtension: "mp4" },
    { mimeType: "video/webm;codecs=vp8,opus", fileExtension: "webm" },
    { mimeType: "video/webm", fileExtension: "webm" },
  ];

  for (const fmt of formats) {
    if (MediaRecorder.isTypeSupported(fmt.mimeType)) {
      return fmt;
    }
  }

  return { mimeType: "video/webm", fileExtension: "webm" };
}
