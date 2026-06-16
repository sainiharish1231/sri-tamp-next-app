"use client";


import { colors } from "@/colors";
import { getDeviceMetrics } from "@/utils/responsive";

type SkeletonLoaderProps = {
  rows?: number;
  compact?: boolean;
  style?: ViewStyle;
};

const responsive = getDeviceMetrics();

export default function SkeletonLoader({
  rows = 5,
  compact = false,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 650,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <div style={webStyle([styles.wrap, style, { opacity }])}>
      <div style={webStyle([styles.hero, compact && styles.heroCompact])} />
      <div style={webStyle(styles.lineWide)} />
      <div style={webStyle(styles.lineMedium)} />
      <div style={webStyle(styles.grid)}>
        <div style={webStyle(styles.tile)} />
        <div style={webStyle(styles.tile)} />
        <div style={webStyle(styles.tile)} />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={webStyle(styles.row)}>
          <div style={webStyle(styles.avatar)} />
          <div style={webStyle(styles.rowText)}>
            <div style={webStyle(styles.rowLineWide)} />
            <div style={webStyle(styles.rowLineShort)} />
          </div>
        </div>
      ))}
    </div>
  );
}

const base = {
  backgroundColor: colors.gray200,
};

const styles = StyleSheet.create({
  wrap: {
    gap: responsive.isXs ? 10 : 12,
  },
  hero: {
    ...base,
    height: responsive.isXs ? 112 : 140,
    borderRadius: responsive.isXs ? 14 : 18,
  },
  heroCompact: {
    height: responsive.isXs ? 84 : 104,
  },
  lineWide: {
    ...base,
    width: "78%",
    height: 16,
    borderRadius: 8,
  },
  lineMedium: {
    ...base,
    width: "48%",
    height: 12,
    borderRadius: 6,
  },
  grid: {
    flexDirection: "row",
    gap: responsive.isXs ? 8 : 10,
  },
  tile: {
    ...base,
    flex: 1,
    height: responsive.isXs ? 54 : 66,
    borderRadius: responsive.isXs ? 12 : 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 14 : 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: responsive.cardPadding,
    gap: responsive.isXs ? 10 : 12,
  },
  avatar: {
    ...base,
    width: responsive.isXs ? 34 : 40,
    height: responsive.isXs ? 34 : 40,
    borderRadius: responsive.isXs ? 11 : 13,
  },
  rowText: {
    flex: 1,
    gap: 8,
  },
  rowLineWide: {
    ...base,
    width: "82%",
    height: 12,
    borderRadius: 6,
  },
  rowLineShort: {
    ...base,
    width: "48%",
    height: 10,
    borderRadius: 5,
  },
});
