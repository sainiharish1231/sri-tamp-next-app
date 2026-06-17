"use client";

import React from "react";

interface ThemedViewProps {
  lightColor?: string;
  darkColor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function ThemedView({
  children,
  style,
  className,
}: ThemedViewProps) {
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
