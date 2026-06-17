"use client";

import React from "react";

interface ThemedTextProps {
  lightColor?: string;
  darkColor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  type?: "default" | "title" | "subtitle";
}

export function ThemedText({
  children,
  style,
  className,
}: ThemedTextProps) {
  return (
    <span style={style} className={className}>
      {children}
    </span>
  );
}
