export async function isAvailableAsync() {
  return typeof navigator !== "undefined" && "share" in navigator;
}

export async function shareAsync(uri: string, options?: any) {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    await (navigator as any).share({ url: uri, title: options?.dialogTitle });
  } else if (typeof window !== "undefined") {
    window.open(uri, "_blank", "noopener,noreferrer");
  }
}
