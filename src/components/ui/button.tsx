import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "orange" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C28] disabled:opacity-50 disabled:pointer-events-none rounded-xl select-none cursor-pointer";

    const variantStyles = {
      // Primary: Light 3D tactile surface with orange text as requested
      primary:
        "bg-[#E8EAF0] text-[#F28C28] font-bold border border-white shadow-[5px_5px_12px_rgba(163,177,198,0.5),-5px_-5px_12px_rgba(255,255,255,0.95)] hover:shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)] active:shadow-[inset_3px_3px_6px_rgba(163,177,198,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] active:translate-y-[1px]",
      // Secondary: Raised tactile light button with dark navy text (for Sign In etc.)
      secondary:
        "bg-[#E8EAF0] text-[#172033] font-semibold border border-white shadow-[5px_5px_12px_rgba(163,177,198,0.5),-5px_-5px_12px_rgba(255,255,255,0.95)] hover:shadow-[3px_3px_8px_rgba(163,177,198,0.45),-3px_-3px_8px_rgba(255,255,255,0.95)] active:shadow-[inset_3px_3px_6px_rgba(163,177,198,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] active:translate-y-[1px]",
      // Orange: Solid orange with white text
      orange:
        "bg-[#F28C28] text-white font-bold border border-white/40 shadow-[4px_4px_10px_rgba(242,140,40,0.4),-4px_-4px_10px_rgba(255,255,255,0.9)] hover:bg-[#E07D1E] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25)] active:translate-y-[1px]",
      // Outline: Soft inset border
      outline:
        "bg-[#E8EAF0] text-[#172033] border border-white/90 shadow-[3px_3px_7px_rgba(163,177,198,0.4),-3px_-3px_7px_rgba(255,255,255,0.95)] hover:text-[#F28C28] active:shadow-[inset_2px_2px_5px_rgba(163,177,198,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.95)]",
      // Ghost: Subtly elevated on hover
      ghost:
        "bg-transparent text-[#64748B] hover:text-[#172033] hover:bg-[#E8EAF0] hover:shadow-[3px_3px_8px_rgba(163,177,198,0.35),-3px_-3px_8px_rgba(255,255,255,0.95)]",
      // Danger: Soft red
      danger:
        "bg-[#E05A47] text-white font-semibold shadow-[4px_4px_10px_rgba(224,90,71,0.35),-4px_-4px_10px_rgba(255,255,255,0.9)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25)] border border-white/40",
    };

    const sizeStyles = {
      sm: "h-9 px-4 text-xs rounded-xl",
      md: "h-11 px-5 text-sm rounded-xl",
      lg: "h-12 px-6 text-base rounded-2xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
