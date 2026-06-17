import React from "react";

const fallbackWindow = { width: 390, height: 844, scale: 1, fontScale: 1 };
let canReadLiveWindowDimensions = false;

const buttonResetStyle: React.CSSProperties = {
  appearance: "none",
  backgroundColor: "transparent",
  boxSizing: "border-box",
  color: "inherit",
  fontFamily: "inherit",
  fontSize: "inherit",
  fontWeight: "inherit",
  lineHeight: "inherit",
  margin: 0,
  padding: 0,
  textAlign: "inherit",
  touchAction: "manipulation",
};

const isObject = (value: any): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const resolveAnimatedValue = (value: any) => {
  if (value && typeof value.__getValue === "function") {
    try {
      return value.__getValue();
    } catch {
      return value;
    }
  }

  return value;
};

const flattenStyle = (style: any): Record<string, any> => {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce(
      (acc, item) => ({ ...acc, ...flattenStyle(item) }),
      {} as Record<string, any>,
    );
  }
  if (typeof style === "function") {
    return flattenStyle(
      style({ focused: false, hovered: false, pressed: false }),
    );
  }
  if (!isObject(style)) return {};
  return style;
};

const cssLength = (value: any) => {
  const resolved = resolveAnimatedValue(value);
  return typeof resolved === "number" ? `${resolved}px` : String(resolved);
};

const cssTransformValue = (key: string, value: any) => {
  const resolved = resolveAnimatedValue(value);
  if (key === "scale" || key === "scaleX" || key === "scaleY") {
    return `${key}(${resolved})`;
  }
  if (
    key === "rotate" ||
    key === "rotateX" ||
    key === "rotateY" ||
    key === "rotateZ"
  ) {
    return `${key}(${typeof resolved === "number" ? `${resolved}deg` : resolved})`;
  }
  return `${key}(${cssLength(resolved)})`;
};

const normalizeTransform = (transform: any) => {
  if (!Array.isArray(transform)) return transform;
  return transform
    .flatMap((entry) =>
      Object.entries(entry || {}).map(([key, value]) =>
        cssTransformValue(key, value),
      ),
    )
    .join(" ");
};

const normalizeBoxShadow = (style: Record<string, any>) => {
  if (style.boxShadow || (!style.elevation && !style.shadowColor))
    return undefined;
  const elevation = Number(style.elevation || 0);
  const offset = style.shadowOffset || {};
  const y = Number(offset.height ?? Math.max(2, elevation / 2));
  const x = Number(offset.width ?? 0);
  const blur = Number(style.shadowRadius ?? Math.max(8, elevation * 2));
  const opacity = Number(style.shadowOpacity ?? (elevation ? 0.16 : 0.12));
  return `${x}px ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`;
};

const flexLayoutKeys = [
  "alignContent",
  "alignItems",
  "flexDirection",
  "flexWrap",
  "gap",
  "justifyContent",
  "rowGap",
  "columnGap",
];

const blockTextKeys = [
  "color",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textDecorationLine",
  "textTransform",
];

const hasAnyStyleKey = (style: Record<string, any>, keys: string[]) =>
  keys.some((key) => style[key] !== undefined && style[key] !== null);

const mergeClassName = (
  ...classNames: Array<string | undefined | null | false>
) => classNames.filter(Boolean).join(" ") || undefined;

const webTheme = {
  ink: "#111827",
  body: "#374151",
  muted: "#6B7280",
  subtle: "#9CA3AF",
  line: "#E5E7EB",
  panel: "#FFFFFF",
  canvas: "#F8FAFC",
  primary: "#7C3AED",
  primarySoft: "#EDE9FE",
  danger: "#EF4444",
};

const colorValue = (value: any) =>
  String(resolveAnimatedValue(value) ?? "").toLowerCase();

const isLightSurfaceColor = (value: any) => {
  const color = colorValue(value).replace(/\s/g, "");
  return (
    color === "#fff" ||
    color === "#ffffff" ||
    color === "white" ||
    color === "rgb(255,255,255)" ||
    color === "rgba(255,255,255,1)" ||
    color === "#f8fafc" ||
    color === "#f9fafb" ||
    color === "#f1f5f9" ||
    color === "#f3f4f6"
  );
};

const isPrimaryColor = (value: any) => {
  const color = colorValue(value).replace(/\s/g, "");
  return (
    color.startsWith("#6c04c8") ||
    color.startsWith("#7c3aed") ||
    color.startsWith("#8b5cf6") ||
    color.startsWith("#8805fa") ||
    color.startsWith("#4f46e5") ||
    color.startsWith("#3b82f6") ||
    color.startsWith("#2563eb") ||
    color.includes("124,58,237") ||
    color.includes("139,92,246") ||
    color.includes("79,70,229")
  );
};

const isOpaqueColor = (value: any) => {
  const color = colorValue(value).replace(/\s/g, "");
  const hexAlphaMatch = color.match(/^#[0-9a-f]{8}$/i);
  if (hexAlphaMatch) {
    return Number.parseInt(color.slice(7, 9), 16) >= 220;
  }

  const rgbaAlphaMatch = color.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/i);
  if (rgbaAlphaMatch) {
    const alpha = Number.parseFloat(rgbaAlphaMatch[1]);
    return !Number.isFinite(alpha) || alpha >= 0.86;
  }

  return true;
};

const isOpaquePrimaryColor = (value: any) =>
  isPrimaryColor(value) && isOpaqueColor(value);

const isDangerColor = (value: any) => {
  const color = colorValue(value).replace(/\s/g, "");
  return (
    color.startsWith("#ef4444") ||
    color.startsWith("#dc2626") ||
    color.includes("239,68,68")
  );
};

const isWhiteColor = (value: any) => {
  const color = colorValue(value).replace(/\s/g, "");
  return (
    color === "#fff" ||
    color === "#ffffff" ||
    color === "white" ||
    color === "rgb(255,255,255)" ||
    color === "rgba(255,255,255,1)"
  );
};

const numericStyleValue = (value: any) => {
  const resolved = resolveAnimatedValue(value);
  if (typeof resolved === "number") return resolved;
  if (typeof resolved !== "string") return undefined;
  const parsed = Number.parseFloat(resolved);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const maxStyleValue = (style: Record<string, any>, keys: string[]) =>
  keys.reduce(
    (max, key) => Math.max(max, numericStyleValue(style[key]) ?? 0),
    0,
  );

const hasAnyBorder = (style: Record<string, any>) =>
  [
    "borderWidth",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
  ].some((key) => style[key] !== undefined && style[key] !== null);

const hasAnyPadding = (style: Record<string, any>) =>
  [
    "padding",
    "paddingHorizontal",
    "paddingVertical",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ].some((key) => style[key] !== undefined && style[key] !== null);

const hasAnyShadow = (style: Record<string, any>) =>
  style.elevation ||
  style.shadowColor ||
  style.shadowOpacity ||
  style.shadowRadius ||
  style.boxShadow;

const radiusValue = (style: Record<string, any>) =>
  maxStyleValue(style, [
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ]);

const isTinyAdornment = (style: Record<string, any>) => {
  const width = numericStyleValue(style.width);
  const height = numericStyleValue(style.height);
  if (!width || !height) return false;
  return (
    width <= 64 &&
    height <= 64 &&
    maxStyleValue(style, ["padding", "paddingHorizontal", "paddingVertical"]) <=
      8
  );
};

const isCompactChip = (style: Record<string, any>) => {
  const height =
    numericStyleValue(style.height) ?? numericStyleValue(style.minHeight);
  return (
    !!height &&
    height <= 38 &&
    maxStyleValue(style, [
      "paddingHorizontal",
      "paddingLeft",
      "paddingRight",
    ]) <= 14
  );
};

const setAllBorderWidths = (style: Record<string, any>, width: number) => {
  style.borderTopWidth = width;
  style.borderRightWidth = width;
  style.borderBottomWidth = width;
  style.borderLeftWidth = width;
  style.borderTopStyle = style.borderTopStyle || "solid";
  style.borderRightStyle = style.borderRightStyle || "solid";
  style.borderBottomStyle = style.borderBottomStyle || "solid";
  style.borderLeftStyle = style.borderLeftStyle || "solid";
};

const setAllBorderColors = (style: Record<string, any>, color: string) => {
  style.borderTopColor = color;
  style.borderRightColor = color;
  style.borderBottomColor = color;
  style.borderLeftColor = color;
};

const setRadius = (style: Record<string, any>, radius: number | string) => {
  style.borderTopLeftRadius = radius;
  style.borderTopRightRadius = radius;
  style.borderBottomRightRadius = radius;
  style.borderBottomLeftRadius = radius;
};

const setPadding = (style: Record<string, any>, padding: number) => {
  style.paddingTop = padding;
  style.paddingRight = padding;
  style.paddingBottom = padding;
  style.paddingLeft = padding;
};

const isLightSurface = (style: Record<string, any>) =>
  isLightSurfaceColor(style.backgroundColor) ||
  isLightSurfaceColor(style.background);

const looksLikeSurfaceCard = (style: Record<string, any>) =>
  isLightSurface(style) &&
  radiusValue(style) >= 8 &&
  (hasAnyBorder(style) || hasAnyShadow(style) || hasAnyPadding(style)) &&
  !isTinyAdornment(style) &&
  !isCompactChip(style);

const looksLikePageHeader = (style: Record<string, any>) =>
  style.borderBottomWidth !== undefined &&
  style.flexDirection === "row" &&
  (style.paddingHorizontal !== undefined ||
    style.paddingLeft !== undefined ||
    style.paddingRight !== undefined);

const looksLikePrimaryPanel = (style: Record<string, any>) =>
  isOpaquePrimaryColor(style.backgroundColor) &&
  !isTinyAdornment(style) &&
  style.flexDirection === "row" &&
  style.alignItems === "center" &&
  style.justifyContent === "space-between";

const looksLikePrimaryAction = (style: Record<string, any>) =>
  isOpaquePrimaryColor(style.backgroundColor) &&
  !looksLikePrimaryPanel(style) &&
  !isTinyAdornment(style) &&
  (hasAnyPadding(style) ||
    numericStyleValue(style.height) !== undefined ||
    numericStyleValue(style.minHeight) !== undefined);

const looksLikeDangerAction = (style: Record<string, any>) =>
  isDangerColor(style.backgroundColor) &&
  isOpaqueColor(style.backgroundColor) &&
  !isTinyAdornment(style);

const normalizedFontSize = (fontSize?: number, fontWeight?: number) => {
  if (fontSize !== undefined) {
    if (fontSize >= 28) return 28;
    if (fontSize >= 22) return 22;
    if (fontSize >= 18) return 18;
    if (fontSize >= 16) return 16;
    if (fontSize <= 11) return 11;
    if (fontSize <= 13) return 12;
    return 14;
  }

  if (!fontWeight) return undefined;
  if (fontWeight >= 800) return 18;
  if (fontWeight >= 700) return 16;
  return 14;
};

const normalizedLineHeight = (fontSize?: number) => {
  if (!fontSize) return undefined;
  if (fontSize >= 24) return 1.18;
  if (fontSize >= 18) return 1.25;
  return 1.45;
};

const applyTextScale = (
  next: Record<string, any>,
  sourceStyle: Record<string, any>,
) => {
  if (!hasAnyStyleKey(sourceStyle, blockTextKeys)) return;

  const fontSize = numericStyleValue(sourceStyle.fontSize);
  const fontWeight =
    Number.parseInt(String(sourceStyle.fontWeight ?? "0"), 10) || undefined;
  const nextSize = normalizedFontSize(fontSize, fontWeight);

  if (nextSize) {
    next.fontSize = nextSize;
    next.lineHeight = normalizedLineHeight(nextSize);
  }

  if ((fontWeight ?? 0) >= 800) {
    next.fontWeight = "700";
  } else if ((fontWeight ?? 0) >= 700) {
    next.fontWeight = "700";
  } else if ((fontWeight ?? 0) >= 600) {
    next.fontWeight = "600";
  }

  if (isWhiteColor(sourceStyle.color)) {
    next.color = "#FFFFFF";
  } else if (isDangerColor(sourceStyle.color)) {
    next.color = webTheme.danger;
  } else if (isPrimaryColor(sourceStyle.color)) {
    next.color = webTheme.primary;
  } else if ((fontWeight ?? 0) >= 700 || (fontSize ?? 0) >= 16) {
    next.color = webTheme.ink;
  } else if ((fontSize ?? 0) <= 12) {
    next.color = webTheme.muted;
  } else if (sourceStyle.color !== undefined) {
    next.color = webTheme.body;
  }

  next.letterSpacing = 0;
};

const applyWebAppDesign = (
  next: Record<string, any>,
  sourceStyle: Record<string, any>,
): React.CSSProperties => {
  if (looksLikePageHeader(sourceStyle)) {
    next.backgroundColor = webTheme.panel;
    next.borderBottomColor = "#D1D5DB";
    next.boxShadow = "none";
  }

  if (looksLikeSurfaceCard(sourceStyle)) {
    next.backgroundColor = webTheme.panel;
    setAllBorderWidths(next, hasAnyBorder(sourceStyle) ? 2 : 1);
    setAllBorderColors(next, webTheme.line);
    setRadius(next, 24);
    if (!isCompactChip(sourceStyle)) {
      setPadding(
        next,
        Math.max(
          16,
          maxStyleValue(sourceStyle, [
            "padding",
            "paddingHorizontal",
            "paddingVertical",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
          ]),
        ),
      );
    }
    if (
      next.display === "flex" &&
      next.gap === undefined &&
      next.rowGap === undefined &&
      next.columnGap === undefined
    ) {
      next.gap = 14;
    }
    next.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
  }

  if (looksLikePrimaryPanel(sourceStyle)) {
    next.backgroundColor = webTheme.primary;
    next.backgroundImage = "linear-gradient(90deg, #4F46E5, #9333EA)";
    next.boxShadow = "0 14px 30px rgba(124, 58, 237, 0.18)";
  }

  if (looksLikePrimaryAction(sourceStyle)) {
    next.backgroundColor = webTheme.primary;
    next.backgroundImage = "linear-gradient(90deg, #4F46E5, #9333EA)";
    setRadius(next, 24);
    next.boxShadow = "0 12px 24px rgba(124, 58, 237, 0.18)";
  }

  if (looksLikeDangerAction(sourceStyle)) {
    next.backgroundColor = webTheme.danger;
    next.backgroundImage = "linear-gradient(90deg, #EF4444, #DC2626)";
    setRadius(next, 24);
    next.boxShadow = "0 12px 24px rgba(239, 68, 68, 0.16)";
  }

  applyTextScale(next, sourceStyle);

  return next as React.CSSProperties;
};

const styleIntentClasses = (style: any, className?: string) => {
  const flattened = flattenStyle(style);
  const classes: string[] = [];
  const names = className || "";

  if (looksLikeSurfaceCard(flattened)) classes.push("rn-dk-card");
  if (looksLikePageHeader(flattened)) classes.push("rn-dk-page-header");
  if (looksLikePrimaryAction(flattened)) classes.push("rn-dk-primary-action");
  if (looksLikeDangerAction(flattened)) classes.push("rn-dk-danger-action");

  if (
    names.includes("rn-pressable") &&
    hasAnyBorder(flattened) &&
    !looksLikePrimaryAction(flattened)
  ) {
    classes.push("rn-dk-soft-action");
  }

  if (names.includes("rn-text")) {
    const fontSize = numericStyleValue(flattened.fontSize) ?? 0;
    const fontWeight = Number.parseInt(String(flattened.fontWeight ?? "0"), 10);
    if (fontSize > 0 && fontSize <= 13 && fontWeight >= 600) {
      classes.push("rn-dk-label-text");
    } else if (fontSize >= 18 || (fontSize === 0 && fontWeight >= 700)) {
      classes.push("rn-dk-heading-text");
    }
    if (fontSize > 13 && fontSize < 18 && fontWeight < 700)
      classes.push("rn-dk-body-text");
    if (isPrimaryColor(flattened.color)) classes.push("rn-dk-primary-text");
    if (isDangerColor(flattened.color)) classes.push("rn-dk-danger-text");
    if (isWhiteColor(flattened.color)) classes.push("rn-dk-inverse-text");
  }

  return classes;
};

const readLiveWindowDimensions = () => {
  if (typeof window === "undefined") return fallbackWindow;
  return {
    width: window.innerWidth || fallbackWindow.width,
    height: window.innerHeight || fallbackWindow.height,
    scale: window.devicePixelRatio || 1,
    fontScale: 1,
  };
};

const expandStyle = (style: Record<string, any>): React.CSSProperties => {
  const next: Record<string, any> = {};

  for (const [key, rawValue] of Object.entries(style)) {
    if (rawValue === undefined || rawValue === null) continue;
    const value = resolveAnimatedValue(rawValue);

    if (key === "paddingHorizontal") {
      next.paddingLeft = value;
      next.paddingRight = value;
      continue;
    }
    if (key === "padding") {
      next.paddingTop = value;
      next.paddingRight = value;
      next.paddingBottom = value;
      next.paddingLeft = value;
      continue;
    }
    if (key === "paddingVertical") {
      next.paddingTop = value;
      next.paddingBottom = value;
      continue;
    }
    if (key === "marginHorizontal") {
      next.marginLeft = value;
      next.marginRight = value;
      continue;
    }
    if (key === "margin") {
      next.marginTop = value;
      next.marginRight = value;
      next.marginBottom = value;
      next.marginLeft = value;
      continue;
    }
    if (key === "marginVertical") {
      next.marginTop = value;
      next.marginBottom = value;
      continue;
    }
    if (key === "borderWidth") {
      next.borderTopWidth = value;
      next.borderRightWidth = value;
      next.borderBottomWidth = value;
      next.borderLeftWidth = value;
      next.borderTopStyle = next.borderTopStyle || "solid";
      next.borderRightStyle = next.borderRightStyle || "solid";
      next.borderBottomStyle = next.borderBottomStyle || "solid";
      next.borderLeftStyle = next.borderLeftStyle || "solid";
      continue;
    }
    if (key === "borderColor") {
      next.borderTopColor = value;
      next.borderRightColor = value;
      next.borderBottomColor = value;
      next.borderLeftColor = value;
      continue;
    }
    if (key === "borderStyle") {
      next.borderTopStyle = value;
      next.borderRightStyle = value;
      next.borderBottomStyle = value;
      next.borderLeftStyle = value;
      continue;
    }
    if (key === "borderRadius") {
      next.borderTopLeftRadius = value;
      next.borderTopRightRadius = value;
      next.borderBottomRightRadius = value;
      next.borderBottomLeftRadius = value;
      continue;
    }
    if (key === "borderTopWidth") {
      next.borderTopWidth = value;
      next.borderTopStyle = next.borderTopStyle || "solid";
      continue;
    }
    if (key === "borderRightWidth") {
      next.borderRightWidth = value;
      next.borderRightStyle = next.borderRightStyle || "solid";
      continue;
    }
    if (key === "borderBottomWidth") {
      next.borderBottomWidth = value;
      next.borderBottomStyle = next.borderBottomStyle || "solid";
      continue;
    }
    if (key === "borderLeftWidth") {
      next.borderLeftWidth = value;
      next.borderLeftStyle = next.borderLeftStyle || "solid";
      continue;
    }
    if (
      key === "shadowColor" ||
      key === "shadowOffset" ||
      key === "shadowOpacity" ||
      key === "shadowRadius" ||
      key === "elevation"
    ) {
      continue;
    }
    if (key === "resizeMode") {
      next.objectFit =
        value === "cover" || value === "contain" ? value : "cover";
      continue;
    }
    if (key === "transform") {
      next.transform = normalizeTransform(value);
      continue;
    }
    if (key === "textAlignVertical" || key === "includeFontPadding") {
      continue;
    }

    next[key] = value;
  }

  const boxShadow = normalizeBoxShadow(style);
  if (boxShadow) next.boxShadow = boxShadow;

  if (
    next.flex !== undefined ||
    next.flexGrow !== undefined ||
    next.flexShrink !== undefined
  ) {
    next.minWidth = next.minWidth ?? 0;
    next.minHeight = next.minHeight ?? 0;
  }

  if (next.display === undefined) {
    if (hasAnyStyleKey(style, flexLayoutKeys)) {
      next.display = "flex";
      next.flexDirection = next.flexDirection ?? "column";
    } else if (hasAnyStyleKey(style, blockTextKeys)) {
      next.display = "block";
    }
  }

  return applyWebAppDesign(next, style);
};

const normalizeStyle = (style: any): React.CSSProperties | undefined => {
  const flattened = flattenStyle(style);
  if (Object.keys(flattened).length === 0) return undefined;
  return expandStyle(flattened);
};

export const webStyle = normalizeStyle;

const normalizeImageSource = (source: any) => {
  if (!source) return "";
  if (typeof source === "string") return source;
  return source.uri || source.src || "";
};

const normalizeNativeChild = (child: any): any => {
  if (typeof child === "string") {
    const trimmed = child.trim();
    if (!trimmed || trimmed === ".") return null;
    return <span>{child}</span>;
  }

  if (typeof child === "number") {
    return <span>{child}</span>;
  }

  return child;
};

const normalizeViewChildren = (children: any): any => {
  const normalizedChildren = React.Children.map(children, normalizeNativeChild);

  if (Array.isArray(normalizedChildren) && normalizedChildren.length === 1) {
    return normalizedChildren[0];
  }

  return normalizedChildren;
};

const toDomProps = (props: any = {}) => {
  const {
    accessibilityLabel,
    accessibilityRole,
    accessible,
    activeOpacity,
    alwaysBounceHorizontal,
    alwaysBounceVertical,
    automaticallyAdjustKeyboardInsets,
    behavior,
    bounces,
    className,
    collapsable,
    contentContainerStyle,
    data,
    delayLongPress,
    delayPressIn,
    delayPressOut,
    hitSlop,
    horizontal,
    importantForAutofill,
    keyboardDismissMode,
    keyboardShouldPersistTaps,
    keyboardVerticalOffset,
    keyExtractor,
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    nativeID,
    numberOfLines,
    needsOffscreenAlphaCompositing,
    numColumns,
    onEndReached,
    onEndReachedThreshold,
    onContentSizeChange,
    onLayout,
    onLongPress,
    onHoverIn,
    onHoverOut,
    onPress,
    onPressIn,
    onPressOut,
    onRequestClose,
    overScrollMode,
    pagingEnabled,
    pointerEvents,
    placeholderTextColor,
    refreshControl,
    removeClippedSubviews,
    renderItem,
    renderToHardwareTextureAndroid,
    returnKeyType,
    scrollEnabled,
    scrollEventThrottle,
    showsHorizontalScrollIndicator,
    showsVerticalScrollIndicator,
    nestedScrollEnabled,
    style,
    testID,
    textContentType,
    underlayColor,
    adjustsFontSizeToFit,
    allowFontScaling,
    ellipsizeMode,
    maxFontSizeMultiplier,
    minimumFontScale,
    selectable,
    selectionColor,
    suppressHighlighting,
    ...rest
  } = props;
  const normalizedStyle = normalizeStyle(style);

  return {
    ...rest,
    className: mergeClassName(
      className,
      ...styleIntentClasses(style, className),
    ),
    ...(accessibilityLabel ? { "aria-label": accessibilityLabel } : {}),
    ...(accessibilityRole ? { role: accessibilityRole } : {}),
    ...(nativeID ? { id: nativeID } : {}),
    ...(testID ? { "data-testid": testID } : {}),
    onClick: rest.onClick || onPress,
    style: {
      ...normalizedStyle,
      ...(pointerEvents ? { pointerEvents } : {}),
    },
  };
};

const createDomComponent = <T extends HTMLElement>(
  tagName: keyof React.JSX.IntrinsicElements,
) =>
  React.forwardRef<T, any>(function DomComponent(
    { children, className, ...props },
    ref,
  ) {
    return React.createElement(
      tagName,
      {
        ref,
        ...toDomProps({
          ...props,
          className: mergeClassName(
            tagName === "div" ? "rn-view" : "rn-dom",
            className,
          ),
        }),
      },
      normalizeViewChildren(children),
    );
  });

export const View = createDomComponent<HTMLDivElement>("div");

export const Text = React.forwardRef<HTMLSpanElement, any>(function Text(
  {
    children,
    className,
    numberOfLines,
    ellipsizeMode,
    selectable,
    style,
    ...props
  },
  ref,
) {
  const lineCount = Number(numberOfLines);
  const clampStyle =
    Number.isFinite(lineCount) && lineCount > 0
      ? ({
          display: lineCount === 1 ? "block" : "-webkit-box",
          overflow: "hidden",
          textOverflow: ellipsizeMode === "clip" ? "clip" : "ellipsis",
          ...(lineCount === 1
            ? { whiteSpace: "nowrap" }
            : {
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: Math.floor(lineCount),
              }),
        } as React.CSSProperties)
      : undefined;

  return (
    <span
      ref={ref}
      {...toDomProps({
        ...props,
        ...(selectable === false ? { style: [{ userSelect: "none" }, style, clampStyle] } : { style: [style, clampStyle] }),
        className: mergeClassName("rn-text", className),
      })}
    >
      {normalizeViewChildren(children)}
    </span>
  );
});

const createPressableComponent = (displayName: string) => {
  const Component = React.forwardRef<HTMLDivElement, any>(function PressableDom(
    {
      children,
      className,
      disabled,
      onHoverIn,
      onHoverOut,
      onPressIn,
      onPressOut,
      style,
      ...props
    },
    ref,
  ) {
    const pressedRef = React.useRef(false);
    const [pressed, setPressed] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const resolvedStyle =
      typeof style === "function"
        ? style({ focused: false, hovered, pressed })
        : style;
    const domProps = toDomProps({
      ...props,
      className: mergeClassName("rn-pressable", className),
      style: [
        buttonResetStyle,
        resolvedStyle,
        disabled && { opacity: 0.6, cursor: "not-allowed" },
      ],
    });
    const onClick = disabled ? undefined : domProps.onClick;
    const role = domProps.role || (onClick ? "button" : undefined);
    const tabIndex =
      disabled || !onClick ? undefined : (domProps.tabIndex ?? 0);
    const startPress = (event: any) => {
      if (disabled) return;
      pressedRef.current = true;
      setPressed(true);
      onPressIn?.(event);
    };
    const endPress = (event: any) => {
      if (disabled) return;
      if (pressedRef.current) onPressOut?.(event);
      pressedRef.current = false;
      setPressed(false);
    };

    return (
      <div
        ref={ref}
        {...domProps}
        aria-disabled={disabled || undefined}
        onClick={onClick}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={(event) => {
          domProps.onKeyDown?.(event);
          if (
            !disabled &&
            onClick &&
            !event.defaultPrevented &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            onClick(event);
          }
        }}
        onPointerDown={(event) => {
          startPress(event);
          domProps.onPointerDown?.(event);
        }}
        onPointerUp={(event) => {
          endPress(event);
          domProps.onPointerUp?.(event);
        }}
        onPointerCancel={(event) => {
          endPress(event);
          domProps.onPointerCancel?.(event);
        }}
        onPointerLeave={(event) => {
          endPress(event);
          domProps.onPointerLeave?.(event);
        }}
        onMouseLeave={(event) => {
          setHovered(false);
          onHoverOut?.(event);
          domProps.onMouseLeave?.(event);
        }}
        onMouseEnter={(event) => {
          setHovered(true);
          onHoverIn?.(event);
          domProps.onMouseEnter?.(event);
        }}
      >
        {normalizeViewChildren(children)}
      </div>
    );
  });
  Component.displayName = displayName;
  return Component;
};

export const Pressable = createPressableComponent("Pressable");
export const TouchableOpacity = createPressableComponent("TouchableOpacity");

export const TouchableWithoutFeedback = React.forwardRef<any, any>(
  function TouchableWithoutFeedback({ children, onPress, ...props }, ref) {
    const child = React.Children.only(children) as React.ReactElement<any>;
    return React.cloneElement(child, {
      ref,
      ...props,
      onClick: (event: any) => {
        child.props?.onClick?.(event);
        onPress?.(event);
      },
    });
  },
);

export const KeyboardAvoidingView = View;
export const ScrollView = React.forwardRef<any, any>(function ScrollView(
  {
    children,
    className,
    contentContainerStyle,
    horizontal,
    scrollEnabled = true,
    style,
    ...props
  },
  ref,
) {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const flattenedContentStyle = flattenStyle(contentContainerStyle);
  const normalizedContentStyle = normalizeStyle(contentContainerStyle);

  React.useImperativeHandle(ref, () => ({
    scrollTo(options: any) {
      innerRef.current?.scrollTo({
        left: options?.x ?? options?.left ?? 0,
        top: options?.y ?? options?.top ?? 0,
        behavior: options?.animated === false ? "auto" : "smooth",
      });
    },
    scrollToEnd(options: any) {
      const element = innerRef.current;
      if (!element) return;
      element.scrollTo({
        left: horizontal ? element.scrollWidth : 0,
        top: horizontal ? 0 : element.scrollHeight,
        behavior: options?.animated === false ? "auto" : "smooth",
      });
    },
  }));

  return (
    <div
      ref={innerRef}
      {...toDomProps({
        ...props,
        className: mergeClassName("rn-scroll-view", className),
        style: [
          {
            overflowX: horizontal ? "auto" : "hidden",
            overflowY: horizontal ? "hidden" : "auto",
            WebkitOverflowScrolling: "touch",
          },
          !scrollEnabled && { overflow: "hidden" },
          style,
        ],
      })}
    >
      <div
        className="rn-scroll-content"
        style={{
          display: "flex",
          ...normalizedContentStyle,
          flexDirection: horizontal
            ? "row"
            : (flattenedContentStyle.flexDirection ?? "column"),
        }}
      >
        {normalizeViewChildren(children)}
      </div>
    </div>
  );
});

const getDefaultListItemKey = (item: any, index: number): string => {
  const key = item?.key ?? item?.id ?? index;
  return String(key);
};

const normalizeListKey = (key: any, index: number): string => {
  const normalizedKey = key === undefined || key === null ? "" : String(key);
  return normalizedKey || `item-${index}`;
};

const renderListSlot = (slot: any) => {
  if (!slot) return null;
  return typeof slot === "function" ? React.createElement(slot) : slot;
};

export const FlatList = React.forwardRef<any, any>(function FlatList(
  {
    className,
    data,
    horizontal,
    keyExtractor,
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    updateCellsBatchingPeriod,
    getItemLayout,
    onViewableItemsChanged,
    viewabilityConfig,
    extraData,
    numColumns = 1,
    onEndReached,
    onEndReachedThreshold = 0.5,
    renderItem,
    contentContainerStyle,
    style,
    ...props
  },
  ref,
) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const items = Array.isArray(data) ? data : [];
  const flattenedContentStyle = flattenStyle(contentContainerStyle);
  const normalizedContentStyle = normalizeStyle(contentContainerStyle);

  const keyCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item, index) => {
      const key = normalizeListKey(
        keyExtractor
          ? keyExtractor(item, index)
          : getDefaultListItemKey(item, index),
        index,
      );
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [items, keyExtractor]);

  React.useImperativeHandle(ref, () => ({
    scrollToOffset({ offset = 0, animated = true }: any) {
      listRef.current?.scrollTo({
        left: horizontal ? offset : 0,
        top: horizontal ? 0 : offset,
        behavior: animated === false ? "auto" : "smooth",
      });
    },
    scrollToIndex({ index = 0, animated = true }: any) {
      const child = listRef.current?.children?.[0]?.children?.[index] as
        | HTMLElement
        | undefined;
      child?.scrollIntoView({
        behavior: animated === false ? "auto" : "smooth",
        block: "nearest",
      });
    },
  }));

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    props.onScroll?.(event);
    if (!onEndReached) return;
    const target = event.currentTarget;
    const distanceFromEnd = horizontal
      ? target.scrollWidth - target.scrollLeft - target.clientWidth
      : target.scrollHeight - target.scrollTop - target.clientHeight;
    const threshold =
      (horizontal ? target.clientWidth : target.clientHeight) *
      onEndReachedThreshold;
    if (distanceFromEnd <= threshold) onEndReached();
  };

  return (
    <div
      ref={listRef}
      {...toDomProps({
        ...props,
        className: mergeClassName("rn-flat-list", className),
        style: [
          {
            overflowX: horizontal ? "auto" : "hidden",
            overflowY: horizontal ? "hidden" : "auto",
            WebkitOverflowScrolling: "touch",
          },
          style,
        ],
      })}
      onScroll={handleScroll}
    >
      <div
        className="rn-list-content"
        style={{
          display: "flex",
          ...normalizedContentStyle,
          flexDirection: horizontal
            ? "row"
            : (flattenedContentStyle.flexDirection ?? "column"),
          flexWrap: !horizontal && numColumns > 1 ? "wrap" : "nowrap",
        }}
      >
        {renderListSlot(ListHeaderComponent)}
        {items.length === 0
          ? renderListSlot(ListEmptyComponent)
          : items.map((item, index) => {
              const key = normalizeListKey(
                keyExtractor
                  ? keyExtractor(item, index)
                  : getDefaultListItemKey(item, index),
                index,
              );
              const safeKey =
                (keyCounts.get(key) || 0) > 1 ? `${key}-${index}` : key;
              return (
                <React.Fragment key={safeKey}>
                  {renderItem?.({ item, index, separators: {} })}
                </React.Fragment>
              );
            })}
        {renderListSlot(ListFooterComponent)}
      </div>
    </div>
  );
});

export function ActivityIndicator({
  color = "#6c04c8",
  size = "small",
  style,
}: any) {
  const dimension = size === "large" ? 32 : 18;
  return (
    <span
      aria-label="Loading"
      role="status"
      style={{
        display: "inline-block",
        width: dimension,
        height: dimension,
        borderRadius: "50%",
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderTopStyle: "solid",
        borderRightStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderTopColor: color,
        borderRightColor: `${color}33`,
        borderBottomColor: `${color}33`,
        borderLeftColor: `${color}33`,
        animation: "web-spin 800ms linear infinite",
        ...normalizeStyle(style),
      }}
    />
  );
}

export function Image({
  source,
  style,
  alt = "",
  className,
  resizeMode,
  ...props
}: any) {
  return (
    <img
      alt={alt}
      src={normalizeImageSource(source)}
      {...toDomProps({
        ...props,
        className: mergeClassName("rn-image", className),
        style: [
          {
            display: "block",
            maxWidth: "100%",
            objectFit: resizeMode || "cover",
          },
          style,
        ],
      })}
    />
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  any
>(function TextInput(
  {
    keyboardType,
    multiline,
    numberOfLines,
    onChangeText,
    onSubmitEditing,
    blurOnSubmit,
    submitBehavior,
    secureTextEntry,
    className,
    style,
    value,
    editable = true,
    autoCorrect,
    autoCapitalize,
    textAlignVertical,
    ...props
  },
  ref,
) {
  const placeholderText =
    typeof props.placeholder === "string" ? props.placeholder : "";
  const isSearchInput = placeholderText.toLowerCase().includes("search");
  const inputType = secureTextEntry
    ? "password"
    : keyboardType === "email-address"
      ? "email"
      : keyboardType === "phone-pad"
        ? "tel"
        : "text";
  const normalizedAutoCorrect =
    typeof autoCorrect === "boolean"
      ? autoCorrect
        ? "on"
        : "off"
      : autoCorrect;
  const normalizedAutoCapitalize =
    typeof autoCapitalize === "boolean"
      ? autoCapitalize
        ? "sentences"
        : "none"
      : autoCapitalize;
  const sharedProps = {
    ...toDomProps({
      ...props,
      className: mergeClassName(
        "rn-input",
        isSearchInput && "rn-search-input",
        className,
      ),
      style: [
        {
          minWidth: 0,
        },
        style,
      ],
    }),
    readOnly: editable === false ? true : props.readOnly,
    ...(normalizedAutoCorrect !== undefined
      ? { autoCorrect: normalizedAutoCorrect }
      : {}),
    ...(normalizedAutoCapitalize !== undefined
      ? { autoCapitalize: normalizedAutoCapitalize }
      : {}),
    value: value ?? "",
    onChange: (event: any) => {
      props.onChange?.(event);
      onChangeText?.(event.target.value);
    },
    onKeyDown: (event: any) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (!onSubmitEditing || event.key !== "Enter") return;
      if (multiline && !blurOnSubmit && submitBehavior !== "submit") return;

      event.preventDefault();
      onSubmitEditing({
        nativeEvent: {
          text: event.currentTarget.value,
        },
        target: event.currentTarget,
      });
    },
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as any}
        rows={numberOfLines || props.rows || 3}
        {...sharedProps}
      />
    );
  }

  return (
    <input
      ref={ref as any}
      type={inputType}
      inputMode={keyboardType === "numeric" ? "numeric" : undefined}
      {...sharedProps}
    />
  );
});

export function Switch({
  value,
  onValueChange,
  style,
  disabled,
  className,
  trackColor,
  thumbColor,
  ios_backgroundColor,
  onTintColor,
  tintColor,
  ...props
}: any) {
  const accentColor =
    thumbColor ||
    (value ? trackColor?.true || onTintColor : trackColor?.false || tintColor);

  return (
    <input
      type="checkbox"
      role="switch"
      checked={!!value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.checked)}
      {...toDomProps({
        ...props,
        className: mergeClassName("rn-switch", className),
        style: [
          accentColor
            ? {
                accentColor,
              }
            : undefined,
          style,
        ],
      })}
    />
  );
}

export function Modal({
  children,
  visible = true,
  transparent,
  style,
  className,
  animationType,
  hardwareAccelerated,
  onDismiss,
  onOrientationChange,
  onRequestClose,
  onShow,
  presentationStyle,
  statusBarTranslucent,
  supportedOrientations,
  ...props
}: any) {
  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      {...toDomProps({
        ...props,
        className: mergeClassName("rn-modal-root", className),
        style: [
          {
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: transparent
              ? "transparent"
              : "rgba(15, 23, 42, 0.3)",
          },
          style,
        ],
      })}
    >
      {children}
    </div>
  );
}

export const RefreshControl = (_props: any) => null;

export const StyleSheet = {
  absoluteFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  absoluteFillObject: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  hairlineWidth: 1,
  create<T extends Record<string, any>>(styles: T): T {
    return styles;
  },
  flatten: flattenStyle,
  compose(style1: any, style2: any) {
    return style2 ? [style1, style2] : style1;
  },
};

const BaseAnimated = {} as any; // Placeholder for Animated
const withoutNativeDriver = (config: any) =>
  isObject(config) ? { ...config, useNativeDriver: false } : config;

export const Animated = {
  ...BaseAnimated,
  timing(value: any, config: any, ...rest: any[]) {
    return BaseAnimated?.timing?.(value, withoutNativeDriver(config), ...rest);
  },
  spring(value: any, config: any, ...rest: any[]) {
    return BaseAnimated?.spring?.(value, withoutNativeDriver(config), ...rest);
  },
  decay(value: any, config: any, ...rest: any[]) {
    return BaseAnimated?.decay?.(value, withoutNativeDriver(config), ...rest);
  },
  View: BaseAnimated?.View || View,
  ScrollView: BaseAnimated?.ScrollView || ScrollView,
  Text: BaseAnimated?.Text || Text,
};

export const PanResponder = ({} as any).PanResponder;

export const Platform = {
  OS: "web",
  select<T>(values: Record<string, T>): T | undefined {
    return values.web ?? values.default;
  },
};

export const Dimensions = {
  get(name: string) {
    if (!canReadLiveWindowDimensions) return fallbackWindow;
    if (name === "screen" || name === "window") {
      return readLiveWindowDimensions();
    }
    return fallbackWindow;
  },
  addEventListener(_eventName: string, handler: any) {
    if (typeof window === "undefined") return { remove() {} };
    canReadLiveWindowDimensions = true;
    const listener = () =>
      handler({
        window: readLiveWindowDimensions(),
        screen: readLiveWindowDimensions(),
      });
    window.addEventListener("resize", listener);
    return { remove: () => window.removeEventListener("resize", listener) };
  },
  removeEventListener(..._args: any[]) {},
};

export function useWindowDimensions() {
  const [dimensions, setDimensions] = React.useState(fallbackWindow);

  React.useEffect(() => {
    canReadLiveWindowDimensions = true;
    setDimensions(readLiveWindowDimensions());
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window }: any) => {
        setDimensions(window);
      },
    );
    return () => subscription.remove();
  }, []);

  return dimensions;
}

export function useColorScheme() {
  return "light";
}

export const Keyboard = {
  addListener(..._args: any[]) {
    return { remove() {} };
  },
  dismiss() {
    if (typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
    }
  },
};

export const Alert = {
  alert(title?: string, message?: string, buttons?: any[], _options?: any) {
    if (typeof window === "undefined") {
      console.log([title, message].filter(Boolean).join(": "));
      buttons?.find((button) => button.style !== "cancel")?.onPress?.();
      return;
    }

    const text = [title, message].filter(Boolean).join("\n");
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(text);
      const button = confirmed
        ? buttons.find((item) => item.style !== "cancel") || buttons[0]
        : buttons.find((item) => item.style === "cancel");
      button?.onPress?.();
      return;
    }

    window.alert(text);
    buttons?.[0]?.onPress?.();
  },
};

export const PermissionsAndroid = {
  PERMISSIONS: {
    CAMERA: "camera",
    READ_EXTERNAL_STORAGE: "read_external_storage",
  },
  RESULTS: {
    GRANTED: "granted",
    DENIED: "denied",
  },
  request: async (..._args: any[]) => "granted",
};

export const Share = {
  share: async ({ message, url, title }: any) => {
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    if (nav?.share) {
      await nav.share({ title, text: message, url });
      return { action: "sharedAction" };
    }
    if (nav?.clipboard) {
      await nav.clipboard.writeText(url || message || "");
    }
    return { action: "sharedAction" };
  },
};

export function StatusBar(_props: any) {
  return null;
}

export type AlertButton = any;
export type FlatList = any;
export type Image = any;
export type ModalProps = any;
export type NativeScrollEvent = any;
export type NativeSyntheticEvent<T = any> = any;
export type OpaqueColorValue = string;
export type ScrollView = any;
export type StyleProp<T = any> = any;
export type Text = any;
export type TextInput = any;
export type TextInputProps = any;
export type TextProps = any;
export type TextStyle = any;
export type View = any;
export type ViewProps = any;
export type ViewStyle = any;

const ReactNative = {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
  useWindowDimensions,
};

export default ReactNative;
