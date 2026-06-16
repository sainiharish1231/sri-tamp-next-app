"use client";

import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";

import { Stack, useLocalSearchParams, useRouter } from "next/navigation";
import { colors } from "@/colors";
import FinancialTransactionForm from "@/components/FinancialTransactionForm";
import SkeletonLoader from "@/components/SkeletonLoader";
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

export default function EditFinancialTransactionScreen() {
  const { id, partyId, returnTo } = useLocalSearchParams<{
    id: string;
    partyId?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { t } = useLanguage();
  const sessionUser = useAuthStore((state) => state.session?.user);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const partyReturnPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : null;
  const transactionReturnPath =
    returnTo === "transaction" ? ("/transaction" as any) : null;
  const backPath =
    partyReturnPath ||
    transactionReturnPath ||
    (`/financial-transaction/${id}` as any);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await FinancialTransactionService.getTransactionById(id);
      if (res.success) {
        setTransaction(extractEntity(res));
      } else {
        setTransaction(null);
      }
    } catch {
      Alert.alert(t("error"), t("failed_to_load_financial_transaction"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleSubmit = async (data: FinancialTransactionFormData) => {
    try {
      setSaving(true);
      const res = await FinancialTransactionService.updateTransaction(
        id,
        data.apiPayload,
      );
      if (res.success) {
        const destination =
          partyReturnPath ||
          transactionReturnPath ||
          (`/financial-transaction/${id}` as any);
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
          ...transaction,
          ...data.apiPayload,
          ...savedTransaction,
          id,
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
            console.log("[FinancialTransactionEdit] PDF error:", pdfError);
            Alert.alert(t("error"), t("failed_to_generate_pdf"));
          } finally {
            router.replace(destination);
          }
        };
        Alert.alert(
          t("success"),
          t("financial_transaction_updated"),
          [
            { text: t("download_pdf"), onPress: downloadPdfAndReturn },
            {
              text: t("ok"),
              onPress: () => router.replace(destination),
            },
          ],
        );
      } else {
        Alert.alert(t("error"), res.message || t("failed_to_create_transaction"));
      }
    } catch (error: any) {
      Alert.alert(t("error"), error?.message || t("failed_to_create_transaction"));
    } finally {
      setSaving(false);
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
                {t("edit_financial_transaction")}
              </span>
            </div>
            <div style={webStyle(styles.headerSpacer)} />
          </div>
        </SafeAreaView>
        {loading ? (
          <div style={webStyle(styles.loadingWrap)}>
            <SkeletonLoader compact rows={4} style={styles.loadingSkeleton} />
          </div>
        ) : transaction ? (
          <FinancialTransactionForm
            existingTransaction={transaction}
            onSubmit={handleSubmit}
            isLoading={saving}
          />
        ) : (
          <div style={webStyle(styles.loadingWrap)}>
            <span style={webStyle(styles.loadingText)}>{t("transaction_not_found")}</span>
          </div>
        )}
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
  headerSpacer: { width: 38 },
  loadingWrap: {
    flex: 1,
    padding: 24,
  },
  loadingSkeleton: { width: "100%" },
  loadingText: { fontSize: 14, color: colors.gray500, textAlign: "center" },
});
