"use client";

export function HapticTab({ onPressIn, ...props }: any) {
  return (
    <button
      {...props}
      onMouseDown={(ev: any) => {
        // Haptic feedback not available on web
        onPressIn?.(ev);
      }}
    />
  );
}
