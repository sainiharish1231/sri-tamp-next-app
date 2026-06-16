import React from "react";
import { Circle } from "lucide-react";

export type SymbolWeight = "ultralight" | "thin" | "light" | "regular" | "medium" | "semibold" | "bold" | "heavy" | "black";
export type SymbolViewProps = any;

export function SymbolView({ tintColor, size = 20, style }: any) {
  return <Circle color={tintColor || "currentColor"} size={size} style={style} />;
}
