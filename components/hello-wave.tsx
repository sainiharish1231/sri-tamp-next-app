"use client";


export function HelloWave() {
  return (
    <span
      style={webStyle({
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      })}>
      👋
    </span>
  );
}
