"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from "lucide-react-native";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import FinancialTransactionService from "@/services/FinancialTransactionService";
import MaterialTransactionService from "@/services/MaterialTransactionService";
import TransactionService from "@/services/TransactionService";
import { normalizeRole } from "@/utils/access";
import { formatDateValue } from "@/utils/date";
import { sortRecordsNewestFirst } from "@/utils/recordSorting";
import { extractArrayPayload } from "@/utils/response";
import { getDeviceMetrics } from "@/utils/responsive";

type TransactionTabType =
  | "all"
  | "purchase"
  | "sales"
  | "purchase_return"
  | "sales_return"
  | "expense"
  | "credit"
  | "debit";
type TransactionSource = "material" | "financial" | "ledger";
type FinancialDirection = "credit" | "debit";

const { isXs: isSmallDevice } = getDeviceMetrics();
const TRANSACTION_DATE_KEYS = [
  "createdAt",
  "transactionDate",
  "updatedAt",
] as const;

interface MaterialTransaction {
  id?: string;
  _id?: string;
  transactionNo?: string;
  transactionNumber?: string;
  voucherNo?: string;
  transactionType?: string;
  partyName?: string;
  party?: { name?: string };
  transactionDate?: any;
  createdAt?: any;
  updatedAt?: any;
  items?: any[];
  summary?: {
    totalItems?: number;
    totalWeight?: number;
    totalAmount?: number;
  };
  totalWeight?: number;
  totalAmount?: number;
  note?: string;
  status?: string;
}

interface FinancialTransaction {
  id?: string;
  _id?: string;
  partyName?: string;
  senderPartyId?: string;
  senderPartyName?: string;
  receiverPartyId?: string;
  receiverPartyName?: string;
  amount?: number;
  financialType?: string;
  transactionType?: string;
  senderRole?: string;
  senderName?: string;
  receiverRole?: string;
  receiverName?: string;
  paymentMode?: string;
  transactionDate?: any;
  createdAt?: any;
  updatedAt?: any;
  note?: string;
}

interface GeneralTransaction {
  id?: string;
  _id?: string;
  transactionId?: string;
  partyId?: string;
  partyName?: string;
  senderName?: string;
  receiverName?: string;
  transactionType?: string;
  expenseType?: string;
  paymentMethod?: string;
  amount?: number;
  actualAmount?: number;
  items?: any[];
  message?: string;
  status?: string;
  date?: any;
  createdAt?: any;
  updatedAt?: any;
}

interface UnifiedTransaction {
  id: string;
  source: TransactionSource;
  sourceLabel: string;
  route: string;
  transactionType: Exclude<TransactionTabType, "all">;
  typeLabel: string;
  partyName: string;
  reference?: string;
  transactionDate?: any;
  createdAt?: any;
  updatedAt?: any;
  amount?: number;
  itemCount: number;
  quantityLabel: string;
  note?: string;
  status?: string;
  previewItems: { id?: string; name?: string; quantity?: number | string }[];
}

const TYPE_CONFIG: Record<
  Exclude<TransactionTabType, "all">,
  { bg: string; text: string; label: string; color: string }
> = {
  purchase: {
    bg: colors.purplePale,
    text: colors.purpleDark,
    label: "Purchase",
    color: colors.purple,
  },
  sales: {
    bg: colors.greenLight,
    text: colors.greenDark,
    label: "Sales",
    color: colors.green,
  },
  purchase_return: {
    bg: colors.yellowLight,
    text: "#B45309",
    label: "Purchase Return",
    color: colors.yellow,
  },
  sales_return: {
    bg: colors.redLight,
    text: colors.red,
    label: "Sales Return",
    color: colors.red,
  },
  expense: {
    bg: colors.yellowLight,
    text: "#B45309",
    label: "Expense",
    color: colors.yellow,
  },
  credit: {
    bg: colors.greenLight,
    text: colors.greenDark,
    label: "Credit",
    color: colors.green,
  },
  debit: {
    bg: colors.redLight,
    text: colors.red,
    label: "Debit",
    color: colors.red,
  },
};

const normalizeType = (type?: string): Exclude<TransactionTabType, "all"> => {
  const normalized = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "sale") return "sales";
  if (normalized === "payment") return "debit";
  if (normalized === "receipt") return "credit";
  if (
    [
      "purchase",
      "sales",
      "purchase_return",
      "sales_return",
      "expense",
      "credit",
      "debit",
    ].includes(normalized)
  ) {
    return normalized as Exclude<TransactionTabType, "all">;
  }

  return "purchase";
};

const toGeneralTransaction = (
  item: GeneralTransaction,
): UnifiedTransaction | null => {
  const id = String(item.id || item._id || "");
  if (!id) return null;

  const type = normalizeType(item.transactionType);
  const previewItems = Array.isArray(item.items)
    ? item.items.map((entry) => ({
        id: entry?.id || entry?.productId || entry?.metalId,
        name: getItemName(entry),
        quantity:
          entry?.quantity ||
          entry?.orderedQty ||
          entry?.kg ||
          entry?.weightKg ||
          0,
      }))
    : [];

  return {
    id,
    source: "ledger",
    sourceLabel: "TX",
    route: `/transaction/${id}`,
    transactionType: type,
    typeLabel: TYPE_CONFIG[type].label,
    partyName:
      item.partyName ||
      [item.senderName, item.receiverName].filter(Boolean).join(" -> ") ||
      "Unknown Party",
    reference: item.expenseType || item.paymentMethod || item.transactionId,
    transactionDate: item.date,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    amount: Number(item.amount ?? item.actualAmount ?? 0),
    itemCount: previewItems.length,
    quantityLabel:
      item.paymentMethod || item.status || item.expenseType || "Ledger entry",
    note: item.message,
    status: item.status,
    previewItems,
  };
};

const getFinancialDirection = (
  transaction: Partial<FinancialTransaction>,
): FinancialDirection => {
  const value = String(
    transaction.financialType || transaction.transactionType || "",
  )
    .trim()
    .toLowerCase();

  if (value === "payment" || value === "debit") return "debit";
  if (value === "receipt" || value === "credit") return "credit";
  if (normalizeRole(transaction.senderRole) === "party") return "credit";
  if (normalizeRole(transaction.receiverRole) === "party") return "debit";

  return "debit";
};

const getFinancialPartyName = (
  transaction: Partial<FinancialTransaction>,
) => {
  if (transaction.senderPartyName || transaction.receiverPartyName) {
    return `${transaction.senderPartyName || "Unknown Party"} -> ${
      transaction.receiverPartyName || "Unknown Party"
    }`;
  }

  const direction = getFinancialDirection(transaction);
  return (
    transaction.partyName ||
    (direction === "credit"
      ? transaction.senderName
      : transaction.receiverName) ||
    "Unknown Party"
  );
};

const getItemName = (item: any) =>
  String(item?.name || item?.materialName || item?.productName || "Item");

const toMaterialTransaction = (
  item: MaterialTransaction,
): UnifiedTransaction | null => {
  const id = String(item.id || item._id || "");
  if (!id) return null;

  const type = normalizeType(item.transactionType);
  const totalWeight = Number(item.summary?.totalWeight || item.totalWeight || 0);
  const itemCount =
    Number(item.summary?.totalItems || 0) || item.items?.length || 0;

  return {
    id,
    source: "material",
    sourceLabel: "MT",
    route: `/material-transaction/${id}?returnTo=transaction`,
    transactionType: type,
    typeLabel: TYPE_CONFIG[type].label,
    partyName: item.partyName || item.party?.name || "Unknown Party",
    reference: item.transactionNo || item.transactionNumber || item.voucherNo,
    transactionDate: item.transactionDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    amount: Number(item.summary?.totalAmount || item.totalAmount || 0),
    itemCount,
    quantityLabel: `${totalWeight.toFixed(3)} kg`,
    note: item.note,
    status: item.status,
    previewItems:
      item.items?.map((entry) => ({
        id: entry?.id || entry?.materialId || entry?.productId,
        name: getItemName(entry),
        quantity:
          entry?.quantity ||
          entry?.orderedQty ||
          entry?.kg ||
          entry?.weightKg ||
          0,
      })) || [],
  };
};

const toFinancialTransaction = (
  item: FinancialTransaction,
): UnifiedTransaction | null => {
  const id = String(item.id || item._id || "");
  if (!id) return null;

  const direction = getFinancialDirection(item);
  const type = normalizeType(direction);

  return {
    id,
    source: "financial",
    sourceLabel: "FT",
    route: `/financial-transaction/${id}?returnTo=transaction`,
    transactionType: type,
    typeLabel: TYPE_CONFIG[type].label,
    partyName: getFinancialPartyName(item),
    reference: item.paymentMode,
    transactionDate: item.transactionDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    amount: Number(item.amount || 0),
    itemCount: 0,
    quantityLabel: direction === "credit" ? "Money in" : "Money out",
    note: item.note,
    previewItems: [],
  };
};

export default function TransactionListScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TransactionTabType>("all");
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const [materialRes, financialRes, generalRes] = await Promise.allSettled([
        MaterialTransactionService.fetchAllMaterialTransactions({
          params: { limit: 100 },
        }),
        FinancialTransactionService.fetchAllTransactions({ limit: 100 }),
        TransactionService.fetchAllTransaction({ params: { limit: 100 } }),
      ]);

      const materialTransactions =
        materialRes.status === "fulfilled" && materialRes.value.success
          ? extractArrayPayload<MaterialTransaction>(materialRes.value, [
              "materialTransactions",
              "transactions",
              "data",
            ])
              .map(toMaterialTransaction)
              .filter((item): item is UnifiedTransaction => Boolean(item))
          : [];

      const financialTransactions =
        financialRes.status === "fulfilled" && financialRes.value.success
          ? extractArrayPayload<FinancialTransaction>(financialRes.value, [
              "financialTransactions",
              "transactions",
              "data",
            ])
              .map(toFinancialTransaction)
              .filter((item): item is UnifiedTransaction => Boolean(item))
          : [];

      const generalTransactions =
        generalRes.status === "fulfilled" && generalRes.value.success
          ? extractArrayPayload<GeneralTransaction>(generalRes.value, [
              "transactions",
              "data",
            ])
              .map(toGeneralTransaction)
              .filter((item): item is UnifiedTransaction => Boolean(item))
          : [];

      setTransactions(
        sortRecordsNewestFirst(
          [
            ...materialTransactions,
            ...financialTransactions,
            ...generalTransactions,
          ],
          TRANSACTION_DATE_KEYS,
        ),
      );
    } catch (error) {
      console.error("[Transactions] Error fetching:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  const stats = useMemo(() => {
    const count = (type: Exclude<TransactionTabType, "all">) =>
      transactions.filter((item) => item.transactionType === type).length;

    return {
      total: transactions.length,
      purchase: count("purchase"),
      sales: count("sales"),
      purchaseReturn: count("purchase_return"),
      salesReturn: count("sales_return"),
      expense: count("expense"),
      credit: count("credit"),
      debit: count("debit"),
    };
  }, [transactions]);

  const tabs: { key: TransactionTabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "purchase", label: "Purchase", count: stats.purchase },
    { key: "sales", label: "Sales", count: stats.sales },
    { key: "purchase_return", label: "P. Return", count: stats.purchaseReturn },
    { key: "sales_return", label: "S. Return", count: stats.salesReturn },
    { key: "expense", label: "Expense", count: stats.expense },
    { key: "credit", label: "Credit", count: stats.credit },
    { key: "debit", label: "Debit", count: stats.debit },
  ];

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesTab =
        activeTab === "all" || item.transactionType === activeTab;
      if (!matchesTab) return false;
      if (!query) return true;

      return [
        item.partyName,
        item.reference,
        item.sourceLabel,
        item.typeLabel,
        item.note,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeTab, search, transactions]);

  const renderTypeIcon = (type: Exclude<TransactionTabType, "all">) => {
    if (type === "purchase") return <ArrowDownLeft size={12} color="#fff" />;
    if (type === "sales") return <ArrowUpRight size={12} color="#fff" />;
    if (type === "purchase_return")
      return <RotateCcw size={10} color="#fff" />;
    if (type === "sales_return") return <RotateCw size={10} color="#fff" />;
    if (type === "credit") return <ArrowDownLeft size={12} color="#fff" />;
    return <ArrowUpRight size={12} color="#fff" />;
  };

  const openAddRoute = (href: string) => {
    setAddModalVisible(false);
    router.push(href as any);
  };

  const renderTransactionCard = (item: UnifiedTransaction) => {
    const theme = TYPE_CONFIG[item.transactionType];
    const isFinancial = item.source === "financial";

    return (
      <TouchableOpacity
        key={`${item.source}-${item.id}`}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(item.route as any)}
        testID={`transaction-card-${item.source}-${item.id}`}
      >
        <div style={webStyle(styles.cardTopRow)}>
          <div style={webStyle(styles.cardTopLeft)}>
            <div style={webStyle([styles.typeIndicator, { backgroundColor: theme.color }])}>
              {renderTypeIcon(item.transactionType)}
            </div>
            <span style={webStyle([styles.cardTypeText, { color: theme.text }])}>
              {theme.label}
            </span>
            <div style={webStyle(styles.sourceBadge)}>
              <span style={webStyle(styles.sourceBadgeText)}>{item.sourceLabel}</span>
            </div>
          </div>
          <div style={webStyle([styles.typeBadge, { backgroundColor: theme.bg }])}>
            <span style={webStyle([styles.typeBadgeText, { color: theme.text }])}>
              {item.reference || item.sourceLabel}
            </span>
          </div>
        </div>

        <div style={webStyle(styles.cardBody)}>
          <div style={webStyle(styles.cardPartyRow)}>
            <div style={webStyle([styles.partyAvatar, { backgroundColor: theme.bg }])}>
              <span style={webStyle([styles.partyAvatarText, { color: theme.text }])}>
                {(item.partyName || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={webStyle(styles.cardPartyInfo)}>
              <span style={webStyle(styles.cardPartyName)}>
                {item.partyName}
              </span>
              <span style={webStyle(styles.cardDate)}>
                {formatDateValue(item.transactionDate || item.createdAt)}
              </span>
            </div>
            <div style={webStyle(styles.cardAmountBlock)}>
              <span style={webStyle(styles.cardQtyValue)}>
                {isFinancial
                  ? `₹${Number(item.amount || 0).toLocaleString("en-IN")}`
                  : item.quantityLabel}
              </span>
              <span style={webStyle(styles.cardItemCount)}>
                {isFinancial ? item.quantityLabel : `${item.itemCount} items`}
              </span>
            </div>
          </div>

          {item.previewItems.length > 0 ? (
            <div style={webStyle(styles.cardItemsPreview)}>
              {item.previewItems.slice(0, 3).map((preview, index) => (
                <div style={webStyle(styles.cardItemChip)} key={preview.id || index}>
                  <Ionicons name="cube-outline" size={11} color={theme.color} />
                  <span style={webStyle(styles.cardItemChipText)}>
                    {preview.name || "Item"}
                  </span>
                  <span style={webStyle(styles.cardItemChipQty)}>
                    x{preview.quantity || 0}
                  </span>
                </div>
              ))}
              {item.previewItems.length > 3 ? (
                <div style={webStyle(styles.cardItemChip)}>
                  <span style={webStyle(styles.cardMoreText)}>
                    +{item.previewItems.length - 3} more
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div style={webStyle(styles.cardViewHint)}>
          <span style={webStyle(styles.cardViewHintText)}>Tap to view / edit</span>
          <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
        </div>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
        <div style={webStyle(styles.header)}>
          <div style={webStyle(styles.headerRow)}>
            <div>
              <span style={webStyle(styles.headerTitle)}>Transactions</span>
              <span style={webStyle(styles.headerSubtitle)}>
                MT and FT in one place
              </span>
            </div>
            <div style={webStyle(styles.headerActions)}>
              <TouchableOpacity
                onPress={onRefresh}
                disabled={refreshing || loading}
                style={styles.headerIconBtn}
                testID="transactions-refresh"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.gray500} />
                ) : (
                  <Ionicons name="refresh" size={18} color={colors.gray600} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setAddModalVisible(true)}
                activeOpacity={0.8}
                testID="transactions-add"
              >
                <Plus size={18} color="#fff" />
                <span style={webStyle(styles.addBtnText)}>New</span>
              </TouchableOpacity>
            </div>
          </div>
        </div>

        <div style={webStyle(styles.searchSection)}>
          <div style={webStyle(styles.searchBar)}>
            <Search size={17} color={colors.gray400} />
            <TextInput
              placeholder="Search party, type, MT, FT..."
              placeholderTextColor={colors.gray400}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              testID="transactions-search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <X size={17} color={colors.gray400} />
              </TouchableOpacity>
            ) : null}
          </div>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                  testID={`transactions-tab-${tab.key}`}
                >
                  <span
                    style={webStyle([
                      styles.tabPillText,
                      isActive && styles.tabPillTextActive,
                    ])}
                  >
                    {tab.label}
                  </span>
                  <div
                    style={webStyle([
                      styles.tabPillCount,
                      isActive && styles.tabPillCountActive,
                    ])}
                  >
                    <span
                      style={webStyle([
                        styles.tabPillCountText,
                        isActive && styles.tabPillCountTextActive,
                      ])}
                    >
                      {tab.count}
                    </span>
                  </div>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </div>

        {loading ? (
          <div style={webStyle(styles.loadingWrap)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>Loading transactions...</span>
          </div>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {transactions.length > 0 ? (
              <div style={webStyle(styles.statsRow)}>
                <div style={webStyle([styles.statCard, { borderLeftColor: colors.purple }])}>
                  <span style={webStyle(styles.statNum)}>{stats.purchase}</span>
                  <span style={webStyle(styles.statLabel)}>Purchase</span>
                </div>
                <div style={webStyle([styles.statCard, { borderLeftColor: colors.green }])}>
                  <span style={webStyle(styles.statNum)}>{stats.sales}</span>
                  <span style={webStyle(styles.statLabel)}>Sales</span>
                </div>
                <div style={webStyle([styles.statCard, { borderLeftColor: colors.green }])}>
                  <span style={webStyle(styles.statNum)}>{stats.credit}</span>
                  <span style={webStyle(styles.statLabel)}>Credit</span>
                </div>
                <div style={webStyle([styles.statCard, { borderLeftColor: colors.red }])}>
                  <span style={webStyle(styles.statNum)}>{stats.debit}</span>
                  <span style={webStyle(styles.statLabel)}>Debit</span>
                </div>
              </div>
            ) : null}

            {filteredTransactions.length === 0 ? (
              <div style={webStyle(styles.emptyWrap)}>
                <div style={webStyle(styles.emptyIconCircle)}>
                  <Ionicons
                    name="receipt-outline"
                    size={32}
                    color={colors.gray300}
                  />
                </div>
                <span style={webStyle(styles.emptyTitle)}>No transactions found</span>
                <span style={webStyle(styles.emptySubtitle)}>
                  {transactions.length === 0
                    ? "Create MT or FT from here"
                    : "Try another search or filter"}
                </span>
                {transactions.length === 0 ? (
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => setAddModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="#fff" />
                    <span style={webStyle(styles.emptyCreateBtnText)}>
                      Create Transaction
                    </span>
                  </TouchableOpacity>
                ) : null}
              </div>
            ) : (
              filteredTransactions.map(renderTransactionCard)
            )}

            <div style={webStyle({ height: 30 })} />
          </ScrollView>
        )}
      </div>

      <KeyboardAwareModal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <div style={webStyle(styles.modalOverlay)}>
          <div style={webStyle(styles.addModalCard)}>
            <div style={webStyle(styles.modalHeader)}>
              <span style={webStyle(styles.modalTitle)}>New Transaction</span>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setAddModalVisible(false)}
              >
                <X size={18} color={colors.gray600} />
              </TouchableOpacity>
            </div>

            <TouchableOpacity
              style={styles.addOption}
              onPress={() =>
                openAddRoute("/material-transaction/add?returnTo=transaction")
              }
            >
              <div style={webStyle(styles.addOptionIcon)}>
                <Ionicons
                  name="layers-outline"
                  size={20}
                  color={colors.primary}
                />
              </div>
              <div style={webStyle(styles.addOptionText)}>
                <span style={webStyle(styles.addOptionTitle)}>Material Transaction</span>
                <span style={webStyle(styles.addOptionSubtitle)}>
                  MT purchase, sales and returns
                </span>
              </div>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addOption}
              onPress={() =>
                openAddRoute("/financial-transaction/add?returnTo=transaction")
              }
            >
              <div style={webStyle(styles.addOptionIcon)}>
                <Ionicons name="cash-outline" size={20} color={colors.primary} />
              </div>
              <div style={webStyle(styles.addOptionText)}>
                <span style={webStyle(styles.addOptionTitle)}>Financial Transaction</span>
                <span style={webStyle(styles.addOptionSubtitle)}>
                  FT debit and credit
                </span>
              </div>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </TouchableOpacity>
          </div>
        </div>
      </KeyboardAwareModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: isSmallDevice ? 12 : 20,
    paddingTop: isSmallDevice ? 6 : 8,
    paddingBottom: isSmallDevice ? 10 : 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: isSmallDevice ? 22 : 26,
    fontWeight: "800",
    color: colors.gray900,
  },
  headerSubtitle: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: {
    width: isSmallDevice ? 34 : 38,
    height: isSmallDevice ? 34 : 38,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    height: isSmallDevice ? 34 : 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  searchSection: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: isSmallDevice ? 40 : 44,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  tabsScrollContent: { gap: 8, paddingRight: 8 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabPillText: { fontSize: 13, fontWeight: "700", color: colors.gray500 },
  tabPillTextActive: { color: "#fff" },
  tabPillCount: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center",
  },
  tabPillCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabPillCountText: { fontSize: 11, fontWeight: "800", color: colors.gray500 },
  tabPillCountTextActive: { color: "#fff" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: colors.gray500, marginTop: 12 },
  listContent: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: isSmallDevice ? "47%" : "23%",
    backgroundColor: colors.white,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: colors.gray800 },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.gray500,
    textTransform: "uppercase",
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 8,
    gap: 10,
  },
  cardTopLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  typeIndicator: {
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTypeText: { fontSize: 12, fontWeight: "800" },
  sourceBadge: {
    backgroundColor: colors.gray100,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: "900", color: colors.gray600 },
  typeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardBody: { paddingHorizontal: 12, paddingBottom: 10 },
  cardPartyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  partyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  partyAvatarText: { fontSize: 15, fontWeight: "800" },
  cardPartyInfo: { flex: 1, minWidth: 0 },
  cardPartyName: { fontSize: 15, fontWeight: "800", color: colors.gray800 },
  cardDate: { fontSize: 11, color: colors.gray500, marginTop: 1 },
  cardAmountBlock: { alignItems: "flex-end", maxWidth: "36%" },
  cardQtyValue: { fontSize: 15, fontWeight: "900", color: colors.gray900 },
  cardItemCount: { fontSize: 10, color: colors.gray500, marginTop: 1 },
  cardItemsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  cardItemChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.gray50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  cardItemChipText: { fontSize: 11, color: colors.gray600, maxWidth: 80 },
  cardItemChipQty: { fontSize: 11, fontWeight: "700", color: colors.gray700 },
  cardMoreText: { fontSize: 11, color: colors.primary, fontWeight: "700" },
  cardViewHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.gray50,
  },
  cardViewHintText: { fontSize: 12, color: colors.gray500, fontWeight: "700" },
  emptyWrap: { alignItems: "center", paddingVertical: isSmallDevice ? 42 : 60 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryPale,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.gray700 },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 4,
    textAlign: "center",
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyCreateBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.35)",
    padding: 20,
  },
  addModalCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    width: "100%",
    maxWidth: 440,
    padding: 16,
    paddingBottom: 28,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: colors.gray900 },
  modalCloseIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  addOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  addOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryPale,
    justifyContent: "center",
    alignItems: "center",
  },
  addOptionText: { flex: 1, minWidth: 0 },
  addOptionTitle: { fontSize: 14, fontWeight: "900", color: colors.gray900 },
  addOptionSubtitle: { fontSize: 12, color: colors.gray500, marginTop: 2 },
});
