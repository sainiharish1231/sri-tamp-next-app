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
  Box,
  Calendar,
  IndianRupee,
  Package,
  PencilLine,
  User,
  Download,
} from "lucide-react-native";
import { colors } from "@/colors";
import SkeletonLoader from "@/components/SkeletonLoader";
import MaterialTransactionService from "@/services/MaterialTransactionService";
import PartyService from "@/services/PartyService";
import { getDeviceMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";
import { extractEntityPayload } from "@/utils/response";
import { useAuthStore } from "@/store/auth.store";
import { downloadTransactionPdf } from "@/utils/transactionPdf";

const responsive = getDeviceMetrics();
const headerActionSize = responsive.isXs ? 34 : 38;
const headerIconSize = responsive.isXs ? 18 : 22;
const actionIconSize = responsive.isXs ? 16 : 18;
const rowIconSize = responsive.icon.md;

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

const formatWeight = (value: unknown) =>
  `${toFiniteNumber(value).toFixed(3)} kg`;

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

const getItemName = (item: any) =>
  item?.itemName ||
  item?.name ||
  item?.productName ||
  item?.materialName ||
  item?.metalName ||
  "Item";

const getItemWeight = (item: any) => {
  const directWeight = toFiniteNumber(
    item?.weightKg ?? item?.totalWeight ?? item?.weight,
  );
  if (directWeight) return directWeight;
  return toFiniteNumber(item?.kg) + toFiniteNumber(item?.gram) / 1000;
};

const getItemAmount = (item: any) =>
  toFiniteNumber(item?.grandTotal) ||
  toFiniteNumber(item?.totalAmount) ||
  toFiniteNumber(item?.amount);

export default function MaterialTransactionDetailScreen() {
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
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const returnPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : returnTo === "transaction"
        ? ("/transaction" as any)
        : ("/material-transaction" as any);
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
      const res =
        await MaterialTransactionService.fetchMaterialTransactionById(id);
      if (isSuccessfulResponse(res)) {
        const entity = extractEntityPayload(res);
        setTransaction(entity);

        const transactionPartyId = entity?.partyId || partyId;
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
            console.log("[MaterialTransactionDetail] Party error:", partyError);
            setParty(null);
          }
        } else {
          setParty(null);
        }
      } else {
        setTransaction(null);
        setParty(null);
      }
    } catch (error) {
      console.log("[MaterialTransactionDetail] Error:", error);
      Alert.alert("Error", "Failed to load material transaction");
    } finally {
      setLoading(false);
    }
  }, [id, partyId]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

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
              {t("material_transaction")}
            </span>
            <div style={webStyle(styles.headerSpacer)} />
          </div>
          <SkeletonLoader rows={5} style={styles.loadingSkeleton} />
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
              {t("material_transaction")}
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

  const summary = transaction.summary || {};
  const items = Array.isArray(transaction.items) ? transaction.items : [];
  const extraItems = Array.isArray(transaction.extraItems)
    ? transaction.extraItems
    : [];
  const distributionLogs = Array.isArray(transaction.distributionLogs)
    ? transaction.distributionLogs
    : [];
  const totalItems =
    toFiniteNumber(summary.totalItems) || items.length + extraItems.length;
  const totalWeight =
    toFiniteNumber(summary.totalWeight) || toFiniteNumber(transaction.totalWeight);
  const totalAmount =
    toFiniteNumber(summary.grandTotal) ||
    toFiniteNumber(transaction.grandTotal) ||
    toFiniteNumber(summary.totalAmount) ||
    toFiniteNumber(transaction.totalAmount);

  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      await downloadTransactionPdf({
        kind: "material",
        record: transaction,
        party,
        user: sessionUser,
      });
    } catch (error) {
      console.log("[MaterialTransactionDetail] PDF error:", error);
      Alert.alert(t("error"), t("failed_to_generate_pdf"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const renderItemCard = (item: any, index: number, isExtra = false) => {
    const itemType =
      item.itemType === "metal" || item.type === "metal" || item.metalId
        ? "metal"
        : "product";
    const quantity = toFiniteNumber(
      item.quantity ?? item.orderedQty ?? item.qty ?? item.count,
    );
    const weight = getItemWeight(item);
    const rate =
      toFiniteNumber(item.ratePerKg) ||
      toFiniteNumber(item.rate) ||
      toFiniteNumber(item.price);
    const rateUnit = item.rateUnit || item.priceUnit || "kg";

    return (
      <div
        style={webStyle(styles.itemCard)}
        key={`${isExtra ? "extra" : "item"}-${item.id || index}`}
      >
        <div style={webStyle(styles.itemTopRow)}>
          <div style={webStyle(styles.itemTitleWrap)}>
            <div style={webStyle(styles.itemIcon)}>
              <Package size={responsive.icon.sm} color={colors.primary} />
            </div>
            <div style={webStyle(styles.itemTextWrap)}>
              <span style={webStyle(styles.itemName)}>
                {getItemName(item)}
              </span>
              <span style={webStyle(styles.itemMeta)}>
                {isExtra
                  ? t("extra_item")
                  : itemType === "metal"
                    ? t("metal")
                    : t("product")}
              </span>
            </div>
          </div>
          <span
            style={webStyle(styles.itemAmount)}
          >
            {formatCurrency(getItemAmount(item))}
          </span>
        </div>
        <div style={webStyle(styles.itemStats)}>
          <span style={webStyle(styles.itemStat)}>
            {t("qty")}: {quantity}
          </span>
          <span style={webStyle(styles.itemStat)}>
            {t("weight")}: {formatWeight(weight)}
          </span>
          <span style={webStyle(styles.itemStat)}>
            {t("rate")}: {formatCurrency(rate)}/{rateUnit}
          </span>
          {item.orderId || item.orderNumber ? (
            <span style={webStyle(styles.orderHint)}>
              {item.orderNumber || item.orderId}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

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
              {t("material_transaction")}
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
                    `/material-transaction/edit/${id}${editQuery}` as any,
                  )
                }
                style={styles.editBtn}
              >
                <PencilLine size={actionIconSize} color={colors.primaryDark} />
              </TouchableOpacity>
            </div>
          </div>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <div style={webStyle(styles.heroCard)}>
              <span style={webStyle(styles.heroEyebrow)}>
                {transaction.transactionType || "sales"}
              </span>
              <span
                style={webStyle(styles.heroTitle)}
              >
                {transaction.transactionNo || transaction.id}
              </span>
              <span style={webStyle(styles.heroSubtitle)}>
                {transaction.partyName || "Unknown party"}
              </span>
            </div>

            <div style={webStyle(styles.infoCard)}>
              <div style={webStyle(styles.infoRow)}>
                <User size={rowIconSize} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("party")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {transaction.partyName || "—"}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <Calendar size={rowIconSize} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("date")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {formatDateValue(
                    transaction.transactionDate || transaction.createdAt,
                  )}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <Box size={rowIconSize} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("status")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {transaction.status || "completed"}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <IndianRupee size={rowIconSize} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("amount")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div style={webStyle(styles.infoRow)}>
                <IndianRupee size={rowIconSize} color={colors.primary} />
                <span style={webStyle(styles.infoLabel)}>{t("rate_mode")}</span>
                <span style={webStyle(styles.infoValue)}>
                  {transaction.rateMode || "—"}
                </span>
              </div>
              {toFiniteNumber(transaction.globalRate) > 0 ? (
                <div style={webStyle(styles.infoRow)}>
                  <IndianRupee size={rowIconSize} color={colors.primary} />
                  <span style={webStyle(styles.infoLabel)}>{t("rate")}</span>
                  <span style={webStyle(styles.infoValue)}>
                    {formatCurrency(transaction.globalRate)}/kg
                  </span>
                </div>
              ) : null}
            </div>

            <div style={webStyle(styles.summaryRow)}>
              <div style={webStyle(styles.summaryChip)}>
                <span style={webStyle(styles.summaryLabel)}>{t("items")}</span>
                <span style={webStyle(styles.summaryValue)}>
                  {totalItems}
                </span>
              </div>
              <div style={webStyle(styles.summaryChip)}>
                <span style={webStyle(styles.summaryLabel)}>{t("weight")}</span>
                <span
                  style={webStyle(styles.summaryValue)}
                >
                  {formatWeight(totalWeight)}
                </span>
              </div>
              <div style={webStyle(styles.summaryChip)}>
                <span style={webStyle(styles.summaryLabel)}>{t("total_amount")}</span>
                <span
                  style={webStyle(styles.summaryValue)}
                >
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div style={webStyle(styles.sectionHeader)}>
              <span style={webStyle(styles.sectionTitle)}>{t("items")}</span>
            </div>

            {items.map((item: any, index: number) =>
              renderItemCard(item, index),
            )}

            {extraItems.length > 0 ? (
              <>
                <div style={webStyle(styles.sectionHeader)}>
                  <span style={webStyle(styles.sectionTitle)}>{t("extra_items")}</span>
                </div>
                {extraItems.map((item: any, index: number) =>
                  renderItemCard(item, index, true),
                )}
              </>
            ) : null}

            {transaction.note ? (
              <div style={webStyle(styles.infoCard)}>
                <div style={webStyle(styles.infoRow)}>
                  <Box size={rowIconSize} color={colors.primary} />
                  <span style={webStyle(styles.infoLabel)}>{t("note")}</span>
                  <span style={webStyle(styles.infoValue)}>
                    {transaction.note}
                  </span>
                </div>
              </div>
            ) : null}

            {distributionLogs.length > 0 ? (
              <>
                <div style={webStyle(styles.sectionHeader)}>
                  <span style={webStyle(styles.sectionTitle)}>{t("distribution")}</span>
                </div>
                {distributionLogs.map((log: any, index: number) => (
                  <div style={webStyle(styles.logCard)} key={log.id || index}>
                    <span style={webStyle(styles.logTitle)}>
                      {log.orderNumber || log.orderId || `Log ${index + 1}`}
                    </span>
                    <span style={webStyle(styles.logMeta)}>
                      {formatWeight(log.weightKg || log.totalWeight)} •{" "}
                      {formatCurrency(log.totalAmount || log.amount)}
                    </span>
                  </div>
                ))}
              </>
            ) : null}
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
    backgroundColor: colors.primary,
    borderRadius: responsive.isXs ? 16 : 22,
    padding: responsive.cardPadding,
  },
  heroEyebrow: {
    color: "#DBEAFE",
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
    color: "#E0E7FF",
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
  summaryRow: {
    flexDirection: "row",
    gap: responsive.isXs ? 8 : 10,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: responsive.isXs ? 12 : 16,
    padding: responsive.isXs ? 10 : 14,
    minWidth: 0,
  },
  summaryLabel: { fontSize: responsive.font.xs, color: colors.gray500 },
  summaryValue: {
    marginTop: responsive.isXs ? 4 : 6,
    fontSize: responsive.font.md,
    fontWeight: "800",
    color: colors.gray900,
  },
  sectionHeader: { marginTop: responsive.isXs ? 4 : 8 },
  sectionTitle: {
    fontSize: responsive.font.lg,
    fontWeight: "700",
    color: colors.gray900,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: responsive.isXs ? 14 : 18,
    padding: responsive.cardPadding,
    gap: responsive.isXs ? 10 : 12,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 12,
  },
  itemTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 12,
    flex: 1,
    minWidth: 0,
  },
  itemIcon: {
    width: responsive.isXs ? 30 : 34,
    height: responsive.isXs ? 30 : 34,
    borderRadius: responsive.radius,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTextWrap: { flex: 1, minWidth: 0 },
  itemName: {
    fontSize: responsive.font.md,
    fontWeight: "700",
    color: colors.gray900,
  },
  itemMeta: {
    fontSize: responsive.font.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  itemAmount: {
    maxWidth: responsive.isXs ? 92 : 120,
    fontSize: responsive.font.md,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "right",
  },
  itemStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive.isXs ? 8 : 10,
  },
  itemStat: { fontSize: responsive.font.sm, color: colors.gray600 },
  orderHint: {
    fontSize: responsive.font.sm,
    color: colors.greenDark,
    fontWeight: "600",
  },
  logCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: responsive.isXs ? 12 : 14,
    padding: responsive.isXs ? 10 : 12,
  },
  logTitle: {
    fontSize: responsive.font.md,
    fontWeight: "800",
    color: colors.gray900,
  },
  logMeta: {
    marginTop: 4,
    fontSize: responsive.font.sm,
    color: colors.gray600,
  },
});
