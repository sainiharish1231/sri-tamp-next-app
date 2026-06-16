"use client";

import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, webStyle } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "@/colors";
import FinancialTransactionForm from "@/components/FinancialTransactionForm";
import type { FinancialTransactionFormData } from "@/components/FinancialTransactionForm";
import FinancialTransactionService from "@/services/FinancialTransactionService";
import PartyService from "@/services/PartyService";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/hooks/use-language";
import { downloadTransactionPdf } from "@/utils/transactionPdf";

const extractEntity = (response: any) =>
  response?.data?.data ?? response?.data ?? null;

const fetchPartyForPdf = async (partyId: string, fallback: any) => {
  if (!partyId) return fallback;
  try {
    const res = await PartyService.fetchPartyWithBankDetails(partyId);
    return PartyService.extractParty<any>(res) || extractEntity(res) || fallback;
  } catch {
    return fallback;
  }
};

export default function AddFinancialTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ partyId?: string; returnTo?: string }>();
  const { t } = useLanguage();
  const sessionUser = useAuthStore((state) => state.session?.user);
  const [loading, setLoading] = useState(false);
  const partyReturnPath =
    params.returnTo === "party" && params.partyId
      ? (`/parties/partiesDigital/${params.partyId}` as any)
      : null;
  const transactionReturnPath =
    params.returnTo === "transaction" ? ("/transaction" as any) : null;
  const backPath =
    partyReturnPath ||
    transactionReturnPath ||
    ("/financial-transaction" as any);

  const handleSubmit = async (data: FinancialTransactionFormData) => {
    try {
      setLoading(true);
      const res = await FinancialTransactionService.createTransaction(
        data.apiPayload,
      );
      if (res.success) {
        const destination =
          partyReturnPath ||
          transactionReturnPath ||
          ("/financial-transaction" as any);
        const savedTransaction = extractEntity(res) || {};
        const senderPartyForPdf = await fetchPartyForPdf(
          data.senderParty.partyId,
          data.senderParty.details || data.senderParty,
        );
        const receiverPartyForPdf = await fetchPartyForPdf(
          data.receiverParty.partyId,
          data.receiverParty.details || data.receiverParty,
        );
        const pdfRecord = {
          ...data.apiPayload,
          ...savedTransaction,
          partyId: data.partyId,
          partyName: data.partyAccount.name,
          financialType: data.direction,
          transactionType: "transfer",
          senderParty: senderPartyForPdf,
          receiverParty: receiverPartyForPdf,
        };
        const pdfParty = {
          id: data.partyId,
          name: data.partyAccount.name,
          balance: data.partyAccount.balance,
          ...(data.partyDetails || {}),
          ...(data.direction === "credit"
            ? receiverPartyForPdf
            : senderPartyForPdf),
        };
        const downloadPdfAndReturn = async () => {
          try {
            await downloadTransactionPdf({
              kind: "financial",
              record: pdfRecord,
              party: pdfParty,
              user: data.mainUserDetails || sessionUser,
            });
          } catch (pdfError) {
            console.log("[FinancialTransactionAdd] PDF error:", pdfError);
            Alert.alert(t("error"), t("failed_to_generate_pdf"));
          } finally {
            router.replace(destination);
          }
        };

        Alert.alert(t("success"), t("financial_transaction_created"), [
          { text: t("download_pdf"), onPress: downloadPdfAndReturn },
          {
            text: t("ok"),
            onPress: () => router.replace(destination),
          },
        ]);
      } else {
        Alert.alert(t("error"), res.message || t("failed_to_create_transaction"));
      }
    } catch (error: any) {
      Alert.alert(t("error"), error?.message || t("failed_to_create_transaction"));
    } finally {
      setLoading(false);
    }
  };

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
              <span style={webStyle(styles.headerTitle)}>
                {t("new_financial_transaction")}
              </span>
            </div>
            <div style={webStyle({ width: 38 })} />
          </div>
        </SafeAreaView>
        <FinancialTransactionForm onSubmit={handleSubmit} isLoading={loading} />
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray900,
    textAlign: "center",
  },
});
