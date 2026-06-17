"use client";
import React from "react";

type SkeletonLoaderProps = {
  rows?: number;
  compact?: boolean;
  style?: React.CSSProperties;
};

export default function SkeletonLoader({
  rows = 5,
  compact = false,
  style,
}: SkeletonLoaderProps) {
  return (
    <div style={style} className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-${compact ? 3 : 4} bg-gray-200 rounded animate-pulse`}
        />
      ))}
    </div>
  );
}
