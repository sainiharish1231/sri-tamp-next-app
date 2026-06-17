import { Dimensions } from "react-native";

const tailwindConfig: any = require("../tailwind.config");

type ResponsiveScale = {
  xs: number;
  sm: number;
  base: number;
  md: number;
};

export type ResponsiveMetrics = {
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  space: number;
  cardPadding: number;
  radius: number;
  font: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  icon: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
};

export type DeviceMetrics = ResponsiveMetrics & {
  width: number;
  height: number;
};

const responsiveConfig = tailwindConfig.theme?.extend?.responsive || {};

const breakpoints = {
  xs: 340,
  sm: 420,
  md: 768,
  ...(responsiveConfig.breakpoints || {}),
};

const readScale = (
  section: string,
  fallback: ResponsiveScale,
): ResponsiveScale => ({
  ...fallback,
  ...(responsiveConfig[section] || {}),
});

const pick = (
  scale: ResponsiveScale,
  flags: Pick<ResponsiveMetrics, "isXs" | "isSm" | "isMd">,
) => {
  if (flags.isMd) return scale.md;
  if (flags.isXs) return scale.xs;
  if (flags.isSm) return scale.sm;
  return scale.base;
};

const space = readScale("space", { xs: 10, sm: 12, base: 16, md: 24 });
const cardPadding = readScale("cardPadding", {
  xs: 12,
  sm: 14,
  base: 18,
  md: 24,
});
const radius = readScale("radius", { xs: 8, sm: 12, base: 12, md: 16 });

const fontConfig = responsiveConfig.font || {};
const iconConfig = responsiveConfig.icon || {};

const fontScales = {
  xs: { xs: 10, sm: 11, base: 11, md: 11, ...(fontConfig.xs || {}) },
  sm: { xs: 11, sm: 12, base: 12, md: 12, ...(fontConfig.sm || {}) },
  md: { xs: 12, sm: 13, base: 14, md: 14, ...(fontConfig.md || {}) },
  lg: { xs: 14, sm: 15, base: 16, md: 16, ...(fontConfig.lg || {}) },
  xl: { xs: 17, sm: 19, base: 22, md: 22, ...(fontConfig.xl || {}) },
  xxl: { xs: 20, sm: 22, base: 24, md: 24, ...(fontConfig.xxl || {}) },
};

const iconScales = {
  sm: { xs: 12, sm: 14, base: 14, md: 14, ...(iconConfig.sm || {}) },
  md: { xs: 16, sm: 18, base: 18, md: 18, ...(iconConfig.md || {}) },
  lg: { xs: 24, sm: 28, base: 32, md: 32, ...(iconConfig.lg || {}) },
  xl: { xs: 48, sm: 56, base: 64, md: 64, ...(iconConfig.xl || {}) },
};

export const getResponsiveMetrics = (width: number): ResponsiveMetrics => {
  const flags = {
    isXs: width <= breakpoints.xs,
    isSm: width <= breakpoints.sm,
    isMd: width >= breakpoints.md,
  };

  return {
    ...flags,
    space: pick(space, flags),
    cardPadding: pick(cardPadding, flags),
    radius: pick(radius, flags),
    font: {
      xs: pick(fontScales.xs, flags),
      sm: pick(fontScales.sm, flags),
      md: pick(fontScales.md, flags),
      lg: pick(fontScales.lg, flags),
      xl: pick(fontScales.xl, flags),
      xxl: pick(fontScales.xxl, flags),
    },
    icon: {
      sm: pick(iconScales.sm, flags),
      md: pick(iconScales.md, flags),
      lg: pick(iconScales.lg, flags),
      xl: pick(iconScales.xl, flags),
    },
  };
};

export const getDeviceMetrics = (): DeviceMetrics => {
  const { width, height } = Dimensions.get("window");

  return {
    width,
    height,
    ...getResponsiveMetrics(width),
  };
};
