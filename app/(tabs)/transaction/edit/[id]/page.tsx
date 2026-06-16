"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  webStyle,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "next/navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/colors";
import TransactionService from "@/services/TransactionService";
import TransactionForm, {
  ExistingTransaction,
} from "@/components/TransactionForm";
import { useLanguage } from "@/hooks/use-language";

export default function EditTransactionScreen() {
  const { id, partyId, returnTo } = useLocalSearchParams<{
    id: string;
    partyId?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { t } = useLanguage();
  const backPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : returnTo === "transaction"
        ? ("/transaction" as any)
        : ("/transaction" as any);

  const [transaction, setTransaction] = useState<ExistingTransaction | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await TransactionService.fetchTransactionById(id);
      console.log("[EditTransaction] Fetched:", res);
      if (res.success) {
        const data = res.data?.data || res.data;
        setTransaction(data);
      } else {
        Alert.alert(t("error"), t("failed_to_load_transaction"));
      }
    } catch (error: any) {
      console.error("[EditTransaction] Error:", error);
      Alert.alert(t("error"), t("failed_to_load_transaction_details"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  if (loading) {
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
                <span style={webStyle(styles.headerTitle)}>{t("edit_transaction")}</span>
              </div>
              <div style={webStyle({ width: 38 })} />
            </div>
          </SafeAreaView>
          <div style={webStyle(styles.loadingWrap)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>{t("loading_transaction")}</span>
          </div>
        </div>
      </>
    );
  }

  if (!transaction) {
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
                <span style={webStyle(styles.headerTitle)}>{t("edit_transaction")}</span>
              </div>
              <div style={webStyle({ width: 38 })} />
            </div>
          </SafeAreaView>
          <div style={webStyle(styles.loadingWrap)}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.gray300}
            />
            <span style={webStyle(styles.emptyTitle)}>{t("transaction_not_found")}</span>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.replace(backPath)}
            >
              <span style={webStyle(styles.retryBtnText)}>{t("go_back")}</span>
            </TouchableOpacity>
          </div>
        </div>
      </>
    );
  }

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
              <span style={webStyle(styles.headerTitle)}>{t("edit_transaction")}</span>
            </div>
            <div style={webStyle({ width: 38 })} />
          </div>
        </SafeAreaView>
        <TransactionForm existingTransaction={transaction} />
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
  loadingWrap: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: colors.gray400 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.gray500,
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" as const },
});
