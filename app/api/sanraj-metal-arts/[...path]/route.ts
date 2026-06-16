const REMOTE_API_ROOT = process.env.SANRAJ_API_URL || "https://www.sanraaj.com";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "origin",
  "referer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function buildTargetUrl(path: string[] = [], requestUrl: string) {
  const sourceUrl = new URL(requestUrl);
  const target = new URL(
    `${REMOTE_API_ROOT.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}`,
  );
  target.search = sourceUrl.search;
  return target;
}

function buildRequestHeaders(request: Request) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxy(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(path, request.url);
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const upstream = await fetch(targetUrl, {
    method,
    headers: buildRequestHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildResponseHeaders(upstream),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
