"use client";

import React from "react";
import { TouchableOpacity, StyleSheet, webStyle } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "next/navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "@/colors";
import TransactionForm from "@/components/TransactionForm";
import { useLanguage } from "@/hooks/use-language";

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    partyId?: string;
    returnTo?: string;
  }>();
  const { t } = useLanguage();
  const backPath =
    params.returnTo === "party" && params.partyId
      ? (`/parties/partiesDigital/${params.partyId}` as any)
      : params.returnTo === "transaction"
        ? ("/transaction" as any)
        : ("/transaction" as any);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <div style={webStyle(styles.container)}>
        <SafeAreaView style={styles.headerSafe} edges={["top"]}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity
              onPress={() => router.replace(backPath)}
              style={styles.backBtn}
            >
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <div style={webStyle(styles.headerCenter)}>
              <span style={webStyle(styles.headerTitle)}>{t("new_transaction")}</span>
            </div>
            <div style={webStyle({ width: 38 })} />
          </div>
        </SafeAreaView>
        <TransactionForm />
      </div>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSafe: { backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerCenter: { flex: 1, alignItems: "center" as const },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.gray900,
  },
});
