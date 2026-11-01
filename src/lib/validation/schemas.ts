import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createDeviceSchema = z.object({
  deviceName: z.string().min(2, "Device name must be at least 2 characters").max(50),
  browserInfo: z.string().optional(),
  osInfo: z.string().optional(),
});

export const createSessionSchema = z.object({
  deviceId: z.string().optional(),
  expiryMinutes: z.number().int().min(5).max(1440).default(60), // 5 min to 24 hours
  usageLimit: z.number().int().min(1).max(10).default(1),
});

export const consentSchema = z.object({
  token: z.string().min(32, "Invalid token format"),
  cameraAllowed: z.boolean(),
  audioAllowed: z.boolean().default(false),
  recordingAllowed: z.boolean().default(false),
});

export const recordingMetadataSchema = z.object({
  deviceId: z.string().optional(),
  sessionId: z.string().optional(),
  fileName: z.string().min(1),
  fileFormat: z.string().default("webm"),
  fileSizeBytes: z.number().nonnegative().default(0),
  durationSeconds: z.number().int().nonnegative().default(0),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  saveStatus: z.enum(["saved_locally", "downloaded", "failed"]).default("saved_locally"),
  saveLocationDescription: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
export type RecordingMetadataInput = z.infer<typeof recordingMetadataSchema>;
