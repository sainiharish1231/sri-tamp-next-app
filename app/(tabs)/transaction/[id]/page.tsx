"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  webStyle,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  RotateCw,
  Trash2,
  Pencil,
  Calendar,
  User,
  Package,
  Hash,
  Scale,
  IndianRupee,
} from "lucide-react-native";
import { colors } from "@/colors";
import TransactionService from "@/services/TransactionService";
import { useLanguage } from "@/hooks/use-language";
import { formatDateValue } from "@/utils/date";
import { extractEntityPayload } from "@/utils/response";

interface TransactionItem {
  id?: string;
  name?: string;
  quantity?: number;
  orderedQty?: number;
  remainingQty?: number;
  weightKg?: number;
  ratePerKg?: number;
  totalAmount?: number;
  productId?: string;
  metalId?: string;
  itemType?: string;
  weightPerUnitKg?: number;
}

interface TransactionDetail {
  id: string;
  transactionType: string;
  partyId?: string;
  partyName?: string;
  orderId?: string;
  orderNumber?: string;
  transactionDate?: string;
  items?: TransactionItem[];
  totalQuantity?: number;
  totalAmount?: number;
  amount?: number;
  actualAmount?: number;
  discountOrCut?: number;
  balanceAfter?: number;
  expenseType?: string;
  paymentMethod?: string;
  transactionId?: string;
  senderId?: string;
  receiverId?: string | null;
  senderName?: string;
  receiverName?: string | null;
  note?: string;
  message?: string;
  status?: string;
  date?: any;
  createdAt?: string;
  updatedAt?: string;
}

const TYPE_CONFIG: Record<
  string,
  { bg: string; text: string; color: string; label: string }
> = {
  purchase: {
    bg: "#EDE9FE",
    text: "#7C3AED",
    color: "#7C3AED",
    label: "Purchase",
  },
  sales: { bg: "#D1FAE5", text: "#059669", color: "#059669", label: "Sales" },
  purchase_return: {
    bg: "#FEF3C7",
    text: "#D97706",
    color: "#D97706",
    label: "Purchase Return",
  },
  sales_return: {
    bg: "#FEE2E2",
    text: "#DC2626",
    color: "#DC2626",
    label: "Sales Return",
  },
  expense: {
    bg: "#FEF3C7",
    text: "#B45309",
    color: "#D97706",
    label: "Expense",
  },
};

const getTypeTheme = (type?: string) => {
  const key = type?.toLowerCase().replace(/\s+/g, "_") || "";
  return (
    TYPE_CONFIG[key] || {
      bg: colors.gray100,
      text: colors.gray600,
      color: colors.gray500,
      label: type || "Unknown",
    }
  );
};

const renderTypeIcon = (type: string, size: number, color: string) => {
  const key = type?.toLowerCase().replace(/\s+/g, "_") || "";
  if (key === "purchase") return <ArrowDownLeft size={size} color={color} />;
  if (key === "sales") return <ArrowUpRight size={size} color={color} />;
  if (key === "purchase_return") return <RotateCcw size={size} color={color} />;
  if (key === "sales_return") return <RotateCw size={size} color={color} />;
  if (key === "expense") return <IndianRupee size={size} color={color} />;
  return <Ionicons name="swap-horizontal" size={size} color={color} />;
};

export default function TransactionDetailScreen() {
  const { id, partyId, returnTo } = useLocalSearchParams<{
    id: string;
    partyId?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [transaction, setTransaction] = useState<TransactionDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const returnPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : returnTo === "transaction"
        ? ("/transaction" as any)
        : ("/transaction" as any);
  const editQuery =
    returnTo === "party" && partyId
      ? `?partyId=${partyId}&returnTo=party`
      : returnTo
        ? `?returnTo=${returnTo}`
        : "";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, []);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await TransactionService.fetchTransactionById(id);
      console.log("[TransactionDetail] Fetched:", res);
      if (res.success) {
        setTransaction(extractEntityPayload<TransactionDetail>(res));
      }
    } catch (error: any) {
      console.error("[TransactionDetail] Error:", error);
      Alert.alert(t("error"), t("failed_to_load_transaction_details"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              const res = await TransactionService.deleteTransaction(id);
              console.log("[TransactionDetail] Delete response:", res);
              if (res.success) {
                Alert.alert("Deleted", "Transaction deleted successfully", [
                  { text: "OK", onPress: () => router.replace(returnPath) },
                ]);
              } else {
                Alert.alert(
                  "Error",
                  res.message || "Failed to delete transaction",
                );
              }
            } catch (error: any) {
              console.error("[TransactionDetail] Delete error:", error);
              Alert.alert(
                "Error",
                error?.message || "Failed to delete transaction",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const formatDate = (value?: any) =>
    formatDateValue(value, "dd MMM yyyy, hh:mm a");

  const formatWeight = (weight?: number) => {
    if (!weight) return null;
    return weight >= 1
      ? `${weight.toFixed(2)} kg`
      : `${(weight * 1000).toFixed(0)} g`;
  };

  const typeTheme = getTypeTheme(transaction?.transactionType);
  const isExpense = transaction?.transactionType === "expense";
  const transactionNote = transaction?.note || transaction?.message;
  const transactionAmount =
    transaction?.amount ?? transaction?.actualAmount ?? transaction?.totalAmount ?? 0;
  const totalQty =
    transaction?.totalQuantity ||
    transaction?.items?.reduce((s, i) => s + (i.quantity || 0), 0) ||
    0;
  const itemCount = transaction?.items?.length || 0;
  const typeSubtitle = isExpense
    ? [transaction?.expenseType, transaction?.paymentMethod, transaction?.status]
        .filter(Boolean)
        .join(" • ") || "Ledger entry"
    : `${totalQty} units · ${itemCount} items`;

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
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>{t("transaction_details")}</span>
            <div style={webStyle({ width: 38 })} />
          </div>
          <div style={webStyle(styles.loadingWrap)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>Loading details...</span>
          </div>
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
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>{t("transaction_details")}</span>
            <div style={webStyle({ width: 38 })} />
          </div>
          <div style={webStyle(styles.loadingWrap)}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.gray300}
            />
            <span style={webStyle(styles.emptyTitle)}>{t("transaction_not_found")}</span>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.replace(returnPath)}
            >
              <span style={webStyle(styles.retryBtnText)}>{t("go_back")}</span>
            </TouchableOpacity>
          </div>
        </SafeAreaView>
      </>
    );
  }

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
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>{t("transaction_details")}</span>
            <div style={webStyle(styles.headerActions)}>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/transaction/edit/${id}${editQuery}` as any)
                }
                style={styles.editBtn}
              >
                <Pencil size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.deleteBtn}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Trash2 size={16} color="#EF4444" />
                )}
              </TouchableOpacity>
            </div>
          </div>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <div
              style={webStyle([styles.typeBanner, { backgroundColor: typeTheme.bg }])}
            >
              <div
                style={webStyle([
                  styles.typeBannerIcon,
                  { backgroundColor: typeTheme.color },
                ])}
              >
                {renderTypeIcon(transaction.transactionType || "", 20, "#fff")}
              </div>
              <div style={webStyle(styles.typeBannerInfo)}>
                <span
                  style={webStyle([styles.typeBannerLabel, { color: typeTheme.text }])}
                >
                  {typeTheme.label}
                </span>
                <span style={webStyle([styles.typeBannerSub, { color: typeTheme.text }])}>
                  {typeSubtitle}
                </span>
              </div>
            </div>

            <div style={webStyle(styles.infoSection)}>
              <div style={webStyle(styles.infoRow)}>
                <div
                  style={webStyle([
                    styles.infoIconWrap,
                    { backgroundColor: colors.primaryPale },
                  ])}
                >
                  <User size={16} color={colors.primary} />
                </div>
                <div style={webStyle(styles.infoContent)}>
                  <span style={webStyle(styles.infoLabel)}>Party</span>
                  <span style={webStyle(styles.infoValue)}>
                    {transaction.partyName || "Unknown"}
                  </span>
                </div>
              </div>
              {transaction.orderNumber || transaction.orderId ? (
                <>
                  <div style={webStyle(styles.infoDivider)} />
                  <div style={webStyle(styles.infoRow)}>
                    <div
                      style={webStyle([
                        styles.infoIconWrap,
                        { backgroundColor: colors.primaryPale },
                      ])}
                    >
                      <Package size={16} color={colors.primary} />
                    </div>
                    <div style={webStyle(styles.infoContent)}>
                      <span style={webStyle(styles.infoLabel)}>Order</span>
                      <span style={webStyle(styles.infoValue)}>
                        #{transaction.orderNumber || transaction.orderId}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
              <div style={webStyle(styles.infoDivider)} />
              <div style={webStyle(styles.infoRow)}>
                <div
                  style={webStyle([
                    styles.infoIconWrap,
                    { backgroundColor: colors.primaryPale },
                  ])}
                >
                  <Calendar size={16} color={colors.primary} />
                </div>
                <div style={webStyle(styles.infoContent)}>
                  <span style={webStyle(styles.infoLabel)}>Date</span>
                  <span style={webStyle(styles.infoValue)}>
                    {formatDate(
                      transaction.transactionDate ||
                        transaction.date ||
                        transaction.createdAt,
                    )}
                  </span>
                </div>
              </div>
              {isExpense ? (
                <>
                  <div style={webStyle(styles.infoDivider)} />
                  <div style={webStyle(styles.infoRow)}>
                    <div
                      style={webStyle([
                        styles.infoIconWrap,
                        { backgroundColor: colors.primaryPale },
                      ])}
                    >
                      <IndianRupee size={16} color={colors.primary} />
                    </div>
                    <div style={webStyle(styles.infoContent)}>
                      <span style={webStyle(styles.infoLabel)}>Amount</span>
                      <span style={webStyle(styles.infoValue)}>
                        ₹{Number(transactionAmount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  {transaction.paymentMethod ? (
                    <>
                      <div style={webStyle(styles.infoDivider)} />
                      <div style={webStyle(styles.infoRow)}>
                        <div
                          style={webStyle([
                            styles.infoIconWrap,
                            { backgroundColor: colors.primaryPale },
                          ])}
                        >
                          <Hash size={16} color={colors.primary} />
                        </div>
                        <div style={webStyle(styles.infoContent)}>
                          <span style={webStyle(styles.infoLabel)}>Payment Method</span>
                          <span style={webStyle(styles.infoValue)}>
                            {transaction.paymentMethod.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
              {transactionNote && (
                <>
                  <div style={webStyle(styles.infoDivider)} />
                  <div style={webStyle(styles.infoRow)}>
                    <div
                      style={webStyle([
                        styles.infoIconWrap,
                        { backgroundColor: colors.primaryPale },
                      ])}
                    >
                      <Hash size={16} color={colors.primary} />
                    </div>
                    <div style={webStyle(styles.infoContent)}>
                      <span style={webStyle(styles.infoLabel)}>Note</span>
                      <span style={webStyle(styles.infoValue)}>{transactionNote}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {itemCount > 0 ? (
              <div style={webStyle(styles.itemsSection)}>
                <div style={webStyle(styles.itemsSectionHeader)}>
                  <span style={webStyle(styles.itemsSectionTitle)}>Items</span>
                  <div style={webStyle(styles.itemsBadge)}>
                    <span style={webStyle(styles.itemsBadgeText)}>{itemCount} items</span>
                  </div>
                </div>

                {(transaction.items || []).map((item, idx) => {
                const weightDisplay = formatWeight(item.weightKg);
                const rateDisplay = item.ratePerKg
                  ? `₹${item.ratePerKg.toLocaleString("en-IN")}/kg`
                  : null;
                const amountDisplay = item.totalAmount
                  ? `₹${item.totalAmount.toLocaleString("en-IN")}`
                  : null;
                const perUnitWeight = formatWeight(item.weightPerUnitKg);

                return (
                  <div
                    key={item.id || `item-${idx}`}
                    style={webStyle(styles.detailItemCard)}
                  >
                    <div style={webStyle(styles.detailItemHeader)}>
                      <div style={webStyle(styles.detailItemNameRow)}>
                        <div
                          style={webStyle([
                            styles.detailItemIcon,
                            { backgroundColor: typeTheme.bg },
                          ])}
                        >
                          <Ionicons
                            name={
                              item.itemType === "metal"
                                ? "water"
                                : "cube-outline"
                            }
                            size={14}
                            color={typeTheme.color}
                          />
                        </div>
                        <div style={webStyle({ flex: 1 })}>
                          <span style={webStyle(styles.detailItemName)}>
                            {item.name || "Unknown Item"}
                          </span>
                          {item.itemType && (
                            <span style={webStyle(styles.detailItemType)}>
                              {item.itemType}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={webStyle([
                          styles.detailItemQtyBadge,
                          { backgroundColor: typeTheme.bg },
                        ])}
                      >
                        <span
                          style={webStyle([
                            styles.detailItemQtyText,
                            { color: typeTheme.text },
                          ])}
                        >
                          x{item.quantity || 0}
                        </span>
                      </div>
                    </div>

                    <div style={webStyle(styles.detailItemStats)}>
                      <div style={webStyle(styles.detailItemStat)}>
                        <span style={webStyle(styles.detailItemStatLabel)}>Ordered</span>
                        <span style={webStyle(styles.detailItemStatValue)}>
                          {item.orderedQty || "—"}
                        </span>
                      </div>
                      <div style={webStyle(styles.detailItemStat)}>
                        <span style={webStyle(styles.detailItemStatLabel)}>
                          Transaction
                        </span>
                        <span
                          style={webStyle([
                            styles.detailItemStatValue,
                            { color: typeTheme.color },
                          ])}
                        >
                          {item.quantity || 0}
                        </span>
                      </div>
                      <div style={webStyle(styles.detailItemStat)}>
                        <span style={webStyle(styles.detailItemStatLabel)}>
                          Remaining
                        </span>
                        <span style={webStyle(styles.detailItemStatValue)}>
                          {item.remainingQty ?? "—"}
                        </span>
                      </div>
                    </div>

                    {(weightDisplay ||
                      rateDisplay ||
                      amountDisplay ||
                      perUnitWeight) && (
                      <div style={webStyle(styles.detailItemExtraRow)}>
                        {weightDisplay && (
                          <div style={webStyle(styles.detailExtraChip)}>
                            <Scale size={10} color={colors.gray500} />
                            <span style={webStyle(styles.detailExtraChipText)}>
                              {weightDisplay}
                            </span>
                          </div>
                        )}
                        {rateDisplay && (
                          <div style={webStyle(styles.detailExtraChip)}>
                            <IndianRupee size={10} color={colors.gray500} />
                            <span style={webStyle(styles.detailExtraChipText)}>
                              {rateDisplay}
                            </span>
                          </div>
                        )}
                        {amountDisplay && (
                          <div
                            style={webStyle([
                              styles.detailExtraChip,
                              { backgroundColor: colors.primaryPale },
                            ])}
                          >
                            <IndianRupee size={10} color={colors.primary} />
                            <span
                              style={webStyle([
                                styles.detailExtraChipText,
                                {
                                  color: colors.primary,
                                  fontWeight: "600" as const,
                                },
                              ])}
                            >
                              {amountDisplay}
                            </span>
                          </div>
                        )}
                        {perUnitWeight && (
                          <div style={webStyle(styles.detailExtraChip)}>
                            <Scale size={10} color={colors.gray500} />
                            <span style={webStyle(styles.detailExtraChipText)}>
                              {perUnitWeight}/unit
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            ) : null}

            <div style={webStyle(styles.summaryCard)}>
              <span style={webStyle(styles.summaryCardTitle)}>Summary</span>
              <div style={webStyle(styles.summaryStatRow)}>
                <div
                  style={webStyle([
                    styles.summaryStat,
                    { backgroundColor: typeTheme.bg },
                  ])}
                >
                  <span
                    style={webStyle([styles.summaryStatNum, { color: typeTheme.text }])}
                  >
                    {isExpense
                      ? `₹${Number(transactionAmount || 0).toLocaleString("en-IN")}`
                      : totalQty}
                  </span>
                  <span
                    style={webStyle([styles.summaryStatLabel, { color: typeTheme.text }])}
                  >
                    {isExpense ? "Amount" : "Total Units"}
                  </span>
                </div>
                <div
                  style={webStyle([
                    styles.summaryStat,
                    { backgroundColor: colors.gray50 },
                  ])}
                >
                  <span style={webStyle(styles.summaryStatNum)}>
                    {isExpense
                      ? `₹${Number(transaction.balanceAfter || 0).toLocaleString("en-IN")}`
                      : itemCount}
                  </span>
                  <span style={webStyle(styles.summaryStatLabel)}>
                    {isExpense ? "Balance After" : "Items"}
                  </span>
                </div>
              </div>
            </div>

            <div style={webStyle({ height: 40 })} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.gray900,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryPale,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  typeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  typeBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  typeBannerInfo: {},
  typeBannerLabel: { fontSize: 20, fontWeight: "800" as const },
  typeBannerSub: { fontSize: 13, marginTop: 2, opacity: 0.8 },

  infoSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.gray400, marginBottom: 2 },
  infoValue: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.gray800,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginHorizontal: 14,
  },

  itemsSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  itemsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  itemsSectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.gray900,
  },
  itemsBadge: {
    backgroundColor: colors.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  itemsBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },

  detailItemCard: {
    backgroundColor: colors.gray50,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  detailItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailItemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  detailItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  detailItemName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.gray800,
    flex: 1,
  },
  detailItemType: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 1,
    textTransform: "capitalize" as const,
  },
  detailItemQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailItemQtyText: { fontSize: 13, fontWeight: "700" as const },

  detailItemStats: { flexDirection: "row", gap: 16, marginBottom: 8 },
  detailItemStat: {},
  detailItemStatLabel: { fontSize: 11, color: colors.gray400, marginBottom: 2 },
  detailItemStatValue: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.gray800,
  },

  detailItemExtraRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  detailExtraChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  detailExtraChipText: { fontSize: 11, color: colors.gray600 },

  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryPale,
  },
  summaryCardTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.gray900,
    marginBottom: 14,
  },
  summaryStatRow: { flexDirection: "row", gap: 10 },
  summaryStat: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  summaryStatNum: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.gray800,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.gray500,
    marginTop: 4,
  },
});
