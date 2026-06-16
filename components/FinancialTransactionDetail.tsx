import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  PencilLine,
  Trash2,
  User,
  Download,
} from "lucide-react-native";
import { colors } from "@/colors";
import SkeletonLoader from "@/components/SkeletonLoader";
import FinancialTransactionService from "@/services/FinancialTransactionService";
import PartyService from "@/services/PartyService";
import { getDeviceMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";
import { normalizeRole } from "@/utils/access";
import { extractEntityPayload } from "@/utils/response";
import { useAuthStore } from "@/store/auth.store";
import { downloadTransactionPdf } from "@/utils/transactionPdf";

const responsive = getDeviceMetrics();
const headerActionSize = responsive.isXs ? 34 : 38;
const headerIconSize = responsive.isXs ? 18 : 22;
const actionIconSize = responsive.isXs ? 16 : 18;

const isSuccessfulResponse = (response: any) =>
  response?.success !== false && response?.data?.success !== false;

const toFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatCurrency = (value: unknown) =>
  `₹${toFiniteNumber(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;

const parseDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  if (typeof value?.toDate === "function") return value.toDate();

  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number") return new Date(seconds * 1000);

  return null;
};

const formatDateValue = (value: any) => {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy, hh:mm a");
};

const formatRole = (role?: string) =>
  String(normalizeRole(role) || role || "user").replace(/_/g, " ");

const getFinancialDirection = (transaction?: any): "credit" | "debit" => {
  const contextPartyId = String(transaction?.partyId || "");
  if (contextPartyId) {
    if (String(transaction?.senderPartyId || "") === contextPartyId) {
      return "debit";
    }
    if (String(transaction?.receiverPartyId || "") === contextPartyId) {
      return "credit";
    }
  }

  const value = String(
    transaction?.financialType || transaction?.transactionType || "",
  )
    .trim()
    .toLowerCase();

  if (value === "payment" || value === "debit") return "debit";
  if (value === "receipt" || value === "credit") return "credit";
  if (normalizeRole(transaction?.senderRole) === "party") return "credit";
  if (normalizeRole(transaction?.receiverRole) === "party") return "debit";

  return "debit";
};

const getPartyDisplayName = (transaction?: any) => {
  if (transaction?.senderPartyName || transaction?.receiverPartyName) {
    return `${transaction?.senderPartyName || "—"} -> ${
      transaction?.receiverPartyName || "—"
    }`;
  }

  const direction = getFinancialDirection(transaction);
  return (
    transaction?.partyName ||
    (direction === "credit"
      ? transaction?.senderName
      : transaction?.receiverName) ||
    "—"
  );
};

export default function FinancialTransactionDetailScreen() {
  const { id, partyId, returnTo } = useLocalSearchParams<{
    id: string;
    partyId?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { t } = useLanguage();
  const sessionUser = useAuthStore((state) => state.session?.user);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [transaction, setTransaction] = useState<any>(null);
  const [party, setParty] = useState<any>(null);
  const [senderParty, setSenderParty] = useState<any>(null);
  const [receiverParty, setReceiverParty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const returnPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : returnTo === "transaction"
        ? ("/transaction" as any)
      : ("/financial-transaction" as any);
  const editQuery =
    returnTo === "party" && partyId
      ? `?partyId=${partyId}&returnTo=party`
      : returnTo
        ? `?returnTo=${returnTo}`
        : "";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await FinancialTransactionService.getTransactionById(id);
      if (isSuccessfulResponse(res)) {
        const entity = extractEntityPayload(res);
        setTransaction(entity);

        const [senderPartyRes, receiverPartyRes] = await Promise.allSettled([
          entity?.senderPartyId
            ? PartyService.fetchPartyWithBankDetails(entity.senderPartyId)
            : Promise.resolve(null),
          entity?.receiverPartyId
            ? PartyService.fetchPartyWithBankDetails(entity.receiverPartyId)
            : Promise.resolve(null),
        ]);
        const nextSenderParty =
          senderPartyRes.status === "fulfilled" && senderPartyRes.value
            ? PartyService.extractParty<any>(senderPartyRes.value) ||
              extractEntityPayload(senderPartyRes.value)
            : null;
        const nextReceiverParty =
          receiverPartyRes.status === "fulfilled" && receiverPartyRes.value
            ? PartyService.extractParty<any>(receiverPartyRes.value) ||
              extractEntityPayload(receiverPartyRes.value)
            : null;
        setSenderParty(nextSenderParty);
        setReceiverParty(nextReceiverParty);

        const transactionPartyId =
          entity?.partyId || partyId || entity?.senderPartyId;
        if (transactionPartyId) {
          try {
            const partyRes = await PartyService.fetchPartyWithBankDetails(
              transactionPartyId,
            );
            setParty(
              PartyService.extractParty<any>(partyRes) ||
                extractEntityPayload(partyRes),
            );
          } catch (partyError) {
            console.log("[FinancialTransactionDetail] Party error:", partyError);
            setParty(null);
          }
        } else {
          setParty(null);
        }
      } else {
        setTransaction(null);
        setParty(null);
        setSenderParty(null);
        setReceiverParty(null);
      }
    } catch (error) {
      console.log("[FinancialTransactionDetail] Error:", error);
      setSenderParty(null);
      setReceiverParty(null);
      Alert.alert(t("error"), t("failed_to_load_financial_transaction"));
    } finally {
      setLoading(false);
    }
  }, [id, partyId, t]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this financial transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            try {
              setDeleting(true);
              const res =
                await FinancialTransactionService.deleteTransaction(id);
              if (res.success) {
                Alert.alert(
                  "Deleted",
                  "Transaction deleted successfully.",
                  [
                    {
                      text: "OK",
                      onPress: () => router.replace(returnPath),
                    },
                  ],
                );
              } else {
                Alert.alert(
                  "Error",
                  res.message || "Failed to delete transaction.",
                );
              }
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Failed to delete transaction.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleDownloadPdf = async () => {
    if (!transaction) return;

    try {
      setGeneratingPdf(true);
      await downloadTransactionPdf({
        kind: "financial",
        record: {
          ...transaction,
          senderParty: senderParty || transaction.senderParty,
          receiverParty: receiverParty || transaction.receiverParty,
          senderPartyName:
            senderParty?.name || transaction.senderPartyName || transaction.senderName,
          receiverPartyName:
            receiverParty?.name ||
            transaction.receiverPartyName ||
            transaction.receiverName,
        },
        party: receiverParty || senderParty || party,
        user: sessionUser,
      });
    } catch (error) {
      console.log("[FinancialTransactionDetail] PDF error:", error);
      Alert.alert(t("error"), t("failed_to_generate_pdf"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={["top"]}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity
              onPress={() => router.replace(returnPath)}
              style={styles.backBtn}
            >
              <ArrowLeft size={headerIconSize} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>
              {t("financial_transaction")}
            </span>
            <div style={webStyle(styles.headerSpacer)} />
          </div>
          <SkeletonLoader rows={4} style={styles.loadingSkeleton} />
        </SafeAreaView>
      </>
    );
  }

  if (!transaction) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={["top"]}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity
              onPress={() => router.replace(returnPath)}
              style={styles.backBtn}
            >
              <ArrowLeft size={headerIconSize} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>
              {t("financial_transaction")}
            </span>
            <div style={webStyle(styles.headerSpacer)} />
          </div>
          <div style={webStyle(styles.centerState)}>
            <span style={webStyle(styles.emptyTitle)}>{t("transaction_not_found")}</span>
          </div>
        </SafeAreaView>
      </>
    );
  }

  const transactionWithContext = { ...transaction, partyId: partyId || transaction.partyId };
  const direction = getFinancialDirection(transactionWithContext);
  const isCredit = direction === "credit";
  const senderName =
    transaction.senderPartyName || transaction.senderName || "—";
  const receiverName =
    transaction.receiverPartyName || transaction.receiverName || "—";
  const senderBankMeta = [senderParty?.bankName, senderParty?.accountNumber]
    .filter(Boolean)
    .join(" • ");
  const receiverBankMeta = [receiverParty?.bankName, receiverParty?.accountNumber]
    .filter(Boolean)
    .join(" • ");
  const amount = toFiniteNumber(transaction.amount);
  const directionColor = isCredit ? colors.green : colors.red;
  const directionBg = isCredit ? colors.greenLight : colors.redLight;
  const senderBalanceBefore = toFiniteNumber(transaction.senderBalanceBefore);
  const senderBalanceAfter = toFiniteNumber(transaction.senderBalanceAfter);
  const receiverBalanceBefore = toFiniteNumber(
    transaction.receiverBalanceBefore,
  );
  const receiverBalanceAfter = toFiniteNumber(transaction.receiverBalanceAfter);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity
              onPress={() => router.replace(returnPath)}
              style={styles.backBtn}
            >
              <ArrowLeft size={headerIconSize} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>
              {t("financial_transaction")}
            </span>
            <div style={webStyle(styles.headerActions)}>
              <TouchableOpacity
                onPress={handleDownloadPdf}
                style={styles.pdfBtn}
                disabled={generatingPdf}
                accessibilityLabel={t("download_pdf")}
              >
                {generatingPdf ? (
                  <ActivityIndicator size="small" color={colors.green} />
                ) : (
                  <Download size={actionIconSize} color={colors.green} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/financial-transaction/edit/${id}${editQuery}` as any,
                  )
                }
                style={styles.editBtn}
              >
                <PencilLine size={actionIconSize} color={colors.primaryDark} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <Trash2 size={actionIconSize} color={colors.red} />
                )}
              </TouchableOpacity>
            </div>
          </div>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <div
              style={webStyle([
                styles.heroCard,
                {
                  backgroundColor: directionColor,
                },
              ])}
            >
              <span style={webStyle(styles.heroEyebrow)}>
                {isCredit ? t("credit") : t("debit")}
              </span>
              <span
                style={webStyle(styles.heroTitle)}
              >
                {formatCurrency(amount)}
              </span>
              <span style={webStyle(styles.heroSubtitle)}>
                {senderName} {"->"} {receiverName}
              </span>
            </div>

            <div style={webStyle(styles.flowCard)}>
              <div style={webStyle(styles.flowHeader)}>
                <span style={webStyle(styles.flowTitle)}>{t("transaction_flow")}</span>
                <div
                  style={webStyle([
                    styles.flowDirectionBadge,
                    { backgroundColor: directionBg },
                  ])}
                >
                  <span
                    style={webStyle([
                      styles.flowDirectionText,
                      { color: directionColor },
                    ])}
                  >
                    {isCredit ? t("credit") : t("debit")}
                  </span>
                </div>
              </div>
              <div style={webStyle(styles.flowAccount)}>
                <div style={webStyle([styles.flowIcon, { backgroundColor: directionBg }])}>
                  <User size={18} color={directionColor} />
                </div>
                <div style={webStyle(styles.flowTextWrap)}>
                  <span style={webStyle(styles.flowLabel)}>{t("sender")}</span>
                  <span style={webStyle(styles.flowName)}>
                    {senderName}
                  </span>
                  <span style={webStyle(styles.flowMeta)}>
                    {senderBankMeta ||
                    (transaction.senderPartyId
                      ? `Party • ${transaction.senderPartyId}`
                      : formatRole(transaction.senderRole))}
                    {!transaction.senderPartyId && transaction.senderUserId
                      ? ` • ${transaction.senderUserId}`
                      : ""}
                  </span>
                </div>
              </div>
              <div style={webStyle(styles.flowArrowWrap)}>
                <div style={webStyle(styles.flowLine)} />
                <span style={webStyle([styles.flowArrow, { color: directionColor }])}>
                  ↓
                </span>
                <div style={webStyle(styles.flowLine)} />
              </div>
              <div style={webStyle(styles.flowAccount)}>
                <div style={webStyle(styles.flowIcon)}>
                  <User size={18} color={colors.primary} />
                </div>
                <div style={webStyle(styles.flowTextWrap)}>
                  <span style={webStyle(styles.flowLabel)}>{t("receiver")}</span>
                  <span style={webStyle(styles.flowName)}>
                    {receiverName}
                  </span>
                  <span style={webStyle(styles.flowMeta)}>
                    {receiverBankMeta ||
                    (transaction.receiverPartyId
                      ? `Party • ${transaction.receiverPartyId}`
                      : formatRole(transaction.receiverRole))}
                    {!transaction.receiverPartyId && transaction.receiverUserId
                      ? ` • ${transaction.receiverUserId}`
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            <div style={webStyle(styles.infoCard)}>
              <div style={webStyle(styles.infoRow)}>
                <User size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("party")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {getPartyDisplayName(transaction)}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <Calendar size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("date")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {formatDateValue(
                    transaction.transactionDate || transaction.createdAt,
                  )}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <Calendar size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("transaction_type")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {String(
                    transaction.transactionType ||
                      transaction.financialType ||
                      direction,
                  ).replace(/_/g, " ")}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <IndianRupee size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("amount")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {formatCurrency(amount)}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <IndianRupee size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("payment_mode")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {transaction.paymentMode || "—"}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <IndianRupee size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("sender_balance")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {formatCurrency(senderBalanceBefore)} →{" "}
                  {formatCurrency(senderBalanceAfter)}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <IndianRupee size={16} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("receiver_balance")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {formatCurrency(receiverBalanceBefore)} →{" "}
                  {formatCurrency(receiverBalanceAfter)}
                </span>
              </div>
              {transaction.createdByRole || transaction.createdBy ? (
                <div style={webStyle(styles.infoRow)}>
                  <User size={16} color={colors.primary} />
                  <span style={webStyle(styles.infoLabel)}>{t("created_by")}</span>
                  <span style={webStyle(styles.infoValue)}>
                    {transaction.createdByRole || "user"}
                    {transaction.createdBy ? ` • ${transaction.createdBy}` : ""}
                  </span>
                </div>
              ) : null}
              {transaction.note ? (
                <div style={webStyle(styles.infoRow)}>
                  <Calendar size={16} color={colors.primary} />
                  <span style={webStyle(styles.infoLabel)}>{t("note")}</span>
                  <span style={webStyle(styles.infoValue)}>
                    {transaction.note}
                  </span>
                </div>
              ) : null}
            </div>
          </ScrollView>
        </div>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: responsive.space,
    paddingVertical: responsive.isXs ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: headerActionSize,
    height: headerActionSize,
    borderRadius: responsive.radius,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    width: headerActionSize,
    height: headerActionSize,
    borderRadius: responsive.radius,
    backgroundColor: colors.redLight,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    width: headerActionSize,
    height: headerActionSize,
    borderRadius: responsive.radius,
    backgroundColor: colors.primaryPale,
    justifyContent: "center",
    alignItems: "center",
  },
  pdfBtn: {
    width: headerActionSize,
    height: headerActionSize,
    borderRadius: responsive.radius,
    backgroundColor: colors.greenLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: responsive.isXs ? 6 : 8,
  },
  headerSpacer: { width: headerActionSize },
  headerTitle: {
    flex: 1,
    fontSize: responsive.font.lg,
    fontWeight: "700",
    color: colors.gray900,
    textAlign: "center",
    marginHorizontal: 8,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: responsive.space,
  },
  stateText: { fontSize: responsive.font.md, color: colors.gray500 },
  loadingSkeleton: {
    padding: responsive.space,
  },
  emptyTitle: {
    fontSize: responsive.font.lg,
    fontWeight: "700",
    color: colors.gray600,
  },
  content: {
    padding: responsive.space,
    gap: responsive.space,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: responsive.isXs ? 16 : 22,
    padding: responsive.cardPadding,
  },
  heroEyebrow: {
    color: "#F8FAFC",
    fontSize: responsive.font.sm,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: responsive.isXs ? 6 : 8,
    fontSize: responsive.font.xxl,
    fontWeight: "800",
    color: "#fff",
  },
  heroSubtitle: {
    marginTop: responsive.isXs ? 6 : 8,
    fontSize: responsive.font.md,
    color: "#F8FAFC",
  },
  flowCard: {
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 14 : 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: responsive.cardPadding,
    gap: responsive.isXs ? 10 : 12,
  },
  flowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flowTitle: {
    fontSize: responsive.font.sm,
    color: colors.gray700,
    fontWeight: "800",
  },
  flowDirectionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  flowDirectionText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  flowAccount: {
    minHeight: responsive.isXs ? 60 : 66,
    borderRadius: responsive.isXs ? 12 : 14,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: responsive.isXs ? 10 : 12,
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 10,
  },
  flowIcon: {
    width: responsive.isXs ? 34 : 38,
    height: responsive.isXs ? 34 : 38,
    borderRadius: responsive.isXs ? 11 : 13,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  flowTextWrap: { flex: 1, minWidth: 0 },
  flowLabel: {
    fontSize: 11,
    color: colors.gray500,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  flowName: {
    marginTop: 2,
    fontSize: responsive.font.md,
    color: colors.gray900,
    fontWeight: "800",
  },
  flowMeta: {
    marginTop: 2,
    fontSize: responsive.font.xs,
    color: colors.gray500,
    textTransform: "capitalize",
  },
  flowArrowWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive.isXs ? 20 : 28,
  },
  flowLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  flowArrow: {
    marginHorizontal: 10,
    fontSize: 18,
    fontWeight: "800",
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 14 : 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: responsive.cardPadding,
    gap: responsive.isXs ? 10 : 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 10,
  },
  infoLabel: { flex: 1, fontSize: responsive.font.sm, color: colors.gray500 },
  infoValue: {
    flexShrink: 1,
    fontSize: responsive.font.sm,
    fontWeight: "700",
    color: colors.gray900,
    textAlign: "right",
  },
});
