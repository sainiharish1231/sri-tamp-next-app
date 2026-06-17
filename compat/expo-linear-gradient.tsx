import React from "react";
import { webStyle } from "./react-native";

export function LinearGradient({
  colors = [],
  style,
  className,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  locations,
  children,
  ...props
}: any) {
  // Calculate angle from start and end points
  const getAngle = (start: any, end: any) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const angle = getAngle(start, end);

  // Build gradient with locations if provided
  let gradientStops = '';
  if (Array.isArray(colors) && colors.length) {
    if (locations && locations.length === colors.length) {
      gradientStops = colors.map((color, idx) => 
        `${color} ${locations[idx] * 100}%`
      ).join(', ');
    } else {
      gradientStops = colors.map((color, idx) => {
        const pos = (idx / (colors.length - 1)) * 100;
        return `${color} ${pos}%`;
      }).join(', ');
    }
  }

  const gradient = gradientStops ? `linear-gradient(${angle}deg, ${gradientStops})` : undefined;

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

export default LinearGradient;
