import React from "react";
import { Pressable } from "./react-native";

export type BottomTabBarButtonProps = any;

export function PlatformPressable({ children, ...props }: any) {
  return <Pressable {...props}>{children}</Pressable>;
}
