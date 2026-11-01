import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {startIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#64748B]">
            {startIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/70 bg-[#E8EAF0] px-4 py-2 text-sm text-[#172033] placeholder:text-[#94A3B8] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.35),inset_-4px_-4px_8px_rgba(255,255,255,0.95)] focus:border-[#F28C28] focus:outline-none transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
            startIcon && "pl-11",
            endIcon && "pr-11",
            className
          )}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3.5 flex items-center text-[#64748B]">
            {endIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
