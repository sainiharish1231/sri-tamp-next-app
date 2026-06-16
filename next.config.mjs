import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = (file) => path.resolve(__dirname, "compat", file);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  transpilePackages: ["react-native-web"],
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": compat("react-native.tsx"),
      "expo-router$": compat("expo-router.tsx"),
      "expo-linear-gradient$": compat("expo-linear-gradient.tsx"),
      "expo-font$": compat("expo-font.ts"),
      "expo-splash-screen$": compat("expo-splash-screen.ts"),
      "react-native-toast-message$": compat("toast.tsx"),
      "react-native-safe-area-context$": compat("safe-area.tsx"),
      "@react-native-async-storage/async-storage$": compat("async-storage.ts"),
      "lucide-react-native$": compat("lucide-react-native.ts"),
      "@expo/vector-icons$": compat("vector-icons.tsx"),
      "@expo/vector-icons/MaterialIcons$": compat("vector-icons.tsx"),
      "react-native-vector-icons/MaterialCommunityIcons$": compat("vector-icons.tsx"),
      "react-native-reanimated$": compat("reanimated.tsx"),
      "expo-print$": compat("expo-print.ts"),
      "expo-sharing$": compat("expo-sharing.ts"),
      "expo-file-system$": compat("expo-file-system.ts"),
      "expo-image-picker$": compat("expo-image-picker.ts"),
      "react-native-image-picker$": compat("image-picker.ts"),
      "@react-native-google-signin/google-signin$": compat("google-signin.ts"),
      "expo-haptics$": compat("expo-haptics.ts"),
      "expo-symbols$": compat("expo-symbols.tsx"),
      "expo-web-browser$": compat("expo-web-browser.ts"),
      "@react-navigation/elements$": compat("react-navigation.tsx"),
      "@react-navigation/bottom-tabs$": compat("react-navigation.tsx"),
      "@rork-ai/toolkit-sdk$": compat("rork-toolkit.ts")
    };

    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ...(config.resolve.extensions || [])
    ];

    return config;
  }
};

export default nextConfig;
