type DateCandidate = unknown;

const toMillis = (value: DateCandidate): number => {
  if (!value) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }

  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  if (typeof value === "object") {
    const timestamp = value as {
      _seconds?: number;
      seconds?: number;
      toDate?: () => Date;
    };

    if (typeof timestamp.toDate === "function") {
      return toMillis(timestamp.toDate());
    }

    const seconds = timestamp._seconds ?? timestamp.seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return seconds * 1000;
    }
  }

  return 0;
};

export const getRecordTimestamp = <T extends Record<string, any>>(
  record: T,
  dateKeys: readonly string[],
) => {
  for (const key of dateKeys) {
    const time = toMillis(record?.[key]);
    if (time > 0) return time;
  }

  return 0;
};

export const isCompletedOrderStatus = (status?: unknown) =>
  String(status || "").toLowerCase() === "completed";

export const sortRecordsNewestFirst = <T extends Record<string, any>>(
  records: T[],
  dateKeys: readonly string[],
) =>
  [...records]
    .map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const dateDiff =
        getRecordTimestamp(b.record, dateKeys) -
        getRecordTimestamp(a.record, dateKeys);
      return dateDiff || a.index - b.index;
    })
    .map(({ record }) => record);

export const sortOrdersNewestFirstWithCompletedLast = <
  T extends Record<string, any>,
>(
  orders: T[],
  dateKeys: readonly string[],
) =>
  [...orders]
    .map((order, index) => ({ order, index }))
    .sort((a, b) => {
      const aCompleted = isCompletedOrderStatus(a.order.status);
      const bCompleted = isCompletedOrderStatus(b.order.status);

      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

      const dateDiff =
        getRecordTimestamp(b.order, dateKeys) -
        getRecordTimestamp(a.order, dateKeys);
      return dateDiff || a.index - b.index;
    })
    .map(({ order }) => order);
