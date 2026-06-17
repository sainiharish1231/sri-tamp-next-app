"use client";

export function HelloWave() {
  return (
    <style>{`
      @keyframes wave {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(25deg); }
      }
      .wave {
        display: inline-block;
        font-size: 28px;
        line-height: 32px;
        margin-top: -6px;
        animation: wave 300ms 4 ease-in-out;
      }
    `}</style>
  );
}

export function HelloWaveContent() {
  return <span className="wave">👋</span>;
}
