export const WebBrowserPresentationStyle = {
  AUTOMATIC: "automatic"
};

export async function openBrowserAsync(url: string, _options?: any) {
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
