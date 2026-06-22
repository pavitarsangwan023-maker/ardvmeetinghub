import { memo } from "react";
import type { RoomParticipant } from "../types";

interface AvatarProps {
  user?: Partial<RoomParticipant> | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl",
  xl: "h-24 w-24 text-3xl",
};

export const Avatar = memo(function Avatar({ user, size = "md", className = "" }: AvatarProps) {
  const name = user?.name || "Guest";
  const initials = name
    .split(" ")
    .map((p) => p[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const color = user?.avatar_color || "#2563eb"; // default blue

  return (
    <div
      className={`flex items-center justify-center shrink-0 rounded-full font-bold text-white shadow-sm ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
});
