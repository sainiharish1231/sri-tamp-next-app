export async function printAsync({ html }: any) {
  if (typeof window !== "undefined") {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
}

export async function printToFileAsync({ html }: any) {
  if (typeof Blob === "undefined" || typeof URL === "undefined") {
    return { uri: "" };
  }
  const blob = new Blob([html], { type: "text/html" });
  return { uri: URL.createObjectURL(blob) };
}
