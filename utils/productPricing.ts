const PIECE_UNITS = ["pc", "pcs", "piece", "pieces", "pic", "unit", "set", "pair"];
const GRAM_UNITS = ["g", "gm", "gram", "grams"];

export type ProductRateInfo = {
  amount: number;
  unit: string;
  source: "rate" | "price" | "product";
};

const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

export const normalizeUnit = (unit: unknown, fallback = "kg") => {
  const text = String(unit ?? "").trim().toLowerCase();
  return text || fallback;
};

export const splitAmountAndUnit = (
  value: unknown,
  fallbackUnit = "",
): { amount: number; value: string; unit: string } => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { amount: 0, value: "", unit: fallbackUnit };
  }

  const cleaned = raw.replace(/,/g, "");
  const amountMatch = cleaned.match(/-?\d+(?:\.\d+)?/);
  const amountText = amountMatch?.[0] || "";
  const unitSearchStart = amountMatch
    ? (amountMatch.index || 0) + amountText.length
    : 0;
  const unitText =
    cleaned.slice(unitSearchStart).match(/[a-zA-Z]+/)?.[0] ||
    cleaned.match(/[a-zA-Z]+/)?.[0] ||
    fallbackUnit;

  return {
    amount: amountText ? Number(amountText) || 0 : 0,
    value: amountText || raw,
    unit: normalizeUnit(unitText, fallbackUnit),
  };
};

export const getProductRateInfo = (product: any): ProductRateInfo => {
  const detail = product?.productDetail || {};

  if (!isEmptyValue(detail.rate)) {
    const parsed = splitAmountAndUnit(detail.rate, detail.rateUnit || "kg");
    return { amount: parsed.amount, unit: parsed.unit || "kg", source: "rate" };
  }

  if (!isEmptyValue(detail.price)) {
    const parsed = splitAmountAndUnit(detail.price, detail.priceUnit || "pcs");
    return {
      amount: parsed.amount,
      unit: parsed.unit || "pcs",
      source: "price",
    };
  }

  const parsed = splitAmountAndUnit(product?.price, "pcs");
  return {
    amount: parsed.amount,
    unit: parsed.unit || "pcs",
    source: "product",
  };
};

export const getProductWeightInfo = (product: any) => {
  const parsed = splitAmountAndUnit(
    product?.productDetail?.weight ?? product?.weight,
    "kg",
  );
  return {
    weight: parsed.amount,
    unit: parsed.unit || "kg",
  };
};

export const calculateProductAmount = (
  quantity: number,
  weightKg: number,
  rate: number,
  rateUnit = "kg",
) => {
  const unit = normalizeUnit(rateUnit, "kg");

  if (PIECE_UNITS.includes(unit)) {
    return quantity * rate;
  }

  if (GRAM_UNITS.includes(unit)) {
    return weightKg * 1000 * rate;
  }

  return weightKg * rate;
};

