"use client";

import React, { useEffect, useState } from "react";

type ToastPayload = {
  type?: "success" | "error" | "info";
  text1?: string;
  text2?: string;
  visibilityTime?: number;
  [key: string]: any;
};

const EVENT_NAME = "sanraj-toast";

function emitToast(payload: ToastPayload) {
  if (typeof window === "undefined") {
    console.log(payload.text1 || payload.text2 || "Toast");
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
}

function ToastContainer(_props: any) {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      const payload = (event as CustomEvent<ToastPayload>).detail;
      setToast(payload);
      window.setTimeout(() => setToast(null), payload.visibilityTime || 3500);
    };
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, []);

  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : toast.type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`fixed left-1/2 top-5 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border px-4 py-3 shadow-lg ${tone}`}>
      {toast.text1 ? <div className="text-sm font-bold">{toast.text1}</div> : null}
      {toast.text2 ? <div className="mt-1 text-xs opacity-80">{toast.text2}</div> : null}
    </div>
  );
}

const Toast = Object.assign(ToastContainer, {
  show: emitToast,
  hide: () => emitToast({ visibilityTime: 1 })
});

export default Toast;
