import React from "react";
import { webStyle } from "./react-native";

export function SafeAreaView({ children, className, style, ...props }: any) {
  return (
    <div
      className={["rn-safe-area", className].filter(Boolean).join(" ") || undefined}
      style={webStyle([{ minHeight: "100%" }, style])}
      {...props}
    >
      {children}
    </div>
  );
}

export const SafeAreaProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;
export const useSafeAreaInsets = () => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});
