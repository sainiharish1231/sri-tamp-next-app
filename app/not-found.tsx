"use client";

import { AlertCircle } from "lucide-react-native";
import { colors } from "@/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Oops!",
          headerStyle: { backgroundColor: colors.secondary },
        }}
      />
      <div style={webStyle(styles.container)}>
        <AlertCircle color={colors.primary} size={64} />
        <span style={webStyle(styles.title)}>This screen doesn&apos;t exist.</span>
        <Link href="/" style={styles.link}>
          <span style={webStyle(styles.linkText)}>Go to Dashboard</span>
        </Link>
      </div>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.gray50,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: colors.gray900,
    marginTop: 20,
    marginBottom: 8,
  },
  link: {
    marginTop: 24,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: colors.purple,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.white,
  },
});
