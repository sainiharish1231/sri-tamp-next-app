export async function generateText(options: any) {
  const messages = options?.messages || [];
  const last = messages[messages.length - 1];
  const content = typeof last?.content === "string" ? last.content : "";
  const quoted = content.match(/"([\s\S]*)"/);
  return quoted?.[1] || content;
}
