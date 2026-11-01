import crypto from "crypto";

/**
 * Generates a cryptographically secure random join token.
 * 32 bytes hex encoded (64 characters).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a token using SHA-256 for secure database storage.
 * The raw token is sent only in the join link and never stored directly in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Checks if a given timestamp is expired.
 */
export function isExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}
