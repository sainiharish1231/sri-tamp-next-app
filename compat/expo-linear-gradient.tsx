import React from "react";
import { webStyle } from "./react-native";

export function LinearGradient({
  colors = [],
  style,
  className,
  children,
  ...props
}: any) {
  const gradient =
    Array.isArray(colors) && colors.length
      ? `linear-gradient(135deg, ${colors.join(", ")})`
      : undefined;

  return (
    <div
      {...props}
      className={["rn-gradient", className].filter(Boolean).join(" ") || undefined}
      style={webStyle([gradient ? { backgroundImage: gradient } : null, style])}
    >
      {children}
    </div>
  );
}
