const COMMON_ARRAY_KEYS = [
  "items",
  "results",
  "rows",
  "records",
  "transactions",
  "materialTransactions",
  "financialTransactions",
  "orders",
  "parties",
  "products",
  "users",
  "employees",
  "attendances",
  "employeeAttendances",
  "employeeTransactions",
  "data",
];

const isObject = (value: any): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const toCursorString = (cursor: any): string | null => {
  if (cursor === undefined || cursor === null || cursor === false) return null;
  if (typeof cursor === "string" || typeof cursor === "number") {
    const text = String(cursor).trim();
    return text || null;
  }

  if (!isObject(cursor)) return null;

  const directId = cursor.id || cursor._id || cursor.docId;
  if (directId) return String(directId);

  const pathSegments =
    cursor?._ref?._path?.segments ||
    cursor?.ref?._path?.segments ||
    cursor?._path?.segments;
  if (Array.isArray(pathSegments) && pathSegments.length > 0) {
    return String(pathSegments[pathSegments.length - 1]);
  }

  if (typeof cursor.path === "string") {
    const parts = cursor.path.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }

  return null;
};

const getCandidateRoots = (response: any) => [
  response?.data?.data,
  response?.data,
  response,
];

export const extractArrayPayload = <T = any>(
  response: any,
  preferredKeys: string[] = [],
): T[] => {
  const visited = new Set<any>();
  const queue = getCandidateRoots(response);
  const keys = [...preferredKeys, ...COMMON_ARRAY_KEYS];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      return current as T[];
    }

    if (typeof current !== "object") continue;

    for (const key of keys) {
      if (Array.isArray(current[key])) {
        return current[key] as T[];
      }
    }

    for (const key of keys) {
      if (current[key] && typeof current[key] === "object") {
        queue.push(current[key]);
      }
    }
  }

  return [];
};

export const extractEntityPayload = <T = any>(response: any): T | null => {
  const candidates = getCandidateRoots(response);

  for (const candidate of candidates) {
    if (candidate && !Array.isArray(candidate) && typeof candidate === "object") {
      if (Array.isArray(candidate.data)) continue;
      return candidate as T;
    }
  }

  return null;
};

export const extractPagePayload = <T = any>(
  response: any,
  preferredKeys: string[] = [],
) => {
  const visited = new Set<any>();
  const queue = [response?.data, response, response?.data?.data];
  const keys = [...preferredKeys, ...COMMON_ARRAY_KEYS];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      return {
        data: current as T[],
        nextCursor: null,
        hasMore: false,
      };
    }

    if (!isObject(current)) continue;

    for (const key of keys) {
      if (Array.isArray(current[key])) {
        return {
          data: current[key] as T[],
          nextCursor: toCursorString(current.nextCursor),
          hasMore:
            typeof current.hasMore === "boolean"
              ? current.hasMore
              : Boolean(toCursorString(current.nextCursor)),
        };
      }
    }

    for (const key of keys) {
      if (isObject(current[key])) {
        queue.push(current[key]);
      }
    }
  }

  return {
    data: [] as T[],
    nextCursor: null,
    hasMore: false,
  };
};

export const extractCountPayload = (response: any): number => {
  for (const candidate of getCandidateRoots(response)) {
    if (!isObject(candidate)) continue;
    const count = Number(candidate.count ?? candidate.total ?? candidate.totalCount);
    if (Number.isFinite(count)) return count;
  }

  return 0;
};
