/**
 * RemoteCam Soft Neumorphic / Premium 3D UI Color Tokens
 * Aesthetic: Clean white/light gray background, soft 3D raised and recessed elements, subtle orange accent (#F28C28).
 * Strictly solid colors, no gradients.
 */
export const THEME_COLORS = {
  background: {
    main: "#E8EAF0",
    secondary: "#F0F1F5",
    card: "#E8EAF0",
    elevated: "#F5F6FA",
  },
  accent: {
    primary: "#F28C28",
    secondary: "#D97706",
    subtle: "#FDEEDC",
  },
  text: {
    primary: "#172033",
    secondary: "#64748B",
    muted: "#94A3B8",
  },
  border: {
    default: "#FFFFFF",
    subtle: "#E2E5EC",
  },
  status: {
    success: "#22A06B",
    error: "#E05A47",
    warning: "#D97706",
  },
  shadows: {
    raised: "8px 8px 16px rgba(163, 177, 198, 0.45), -8px -8px 16px rgba(255, 255, 255, 0.95)",
    raisedSm: "4px 4px 10px rgba(163, 177, 198, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.95)",
    inset: "inset 4px 4px 8px rgba(163, 177, 198, 0.35), inset -4px -4px 8px rgba(255, 255, 255, 0.95)",
    insetSm: "inset 2px 2px 5px rgba(163, 177, 198, 0.35), inset -2px -2px 5px rgba(255, 255, 255, 0.95)",
  },
} as const;
