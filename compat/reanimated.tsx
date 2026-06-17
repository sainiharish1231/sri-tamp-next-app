import { useMemo, useRef } from "react";
import { Animated } from "./react-native";

export default Animated;

export const FadeIn = {
  duration(_ms?: number) {
    return {};
  }
};

export function interpolate(value: number, inputRange: number[], outputRange: number[]) {
  if (value <= inputRange[0]) return outputRange[0];
  if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
  return outputRange[0];
}

export function useAnimatedRef<T = any>() {
  return useRef<T | null>(null);
}

export function useScrollOffset(_ref?: any) {
  return { value: 0 };
}

export function useAnimatedStyle(factory: () => any) {
  return useMemo(factory, [factory]);
}
