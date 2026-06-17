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
import { ArrowDownLeft, ArrowUpRight, Plus, Search, X } from "lucide-react";
import { colors } from "@/colors";
import FinancialTransactionService from "@/services/FinancialTransactionService";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId, getAccessFlags, normalizeRole } from "@/utils/access";
import { extractArrayPayload } from "@/utils/response";
import { getDeviceMetrics } from "@/utils/responsive";
import { sortRecordsNewestFirst } from "@/utils/recordSorting";
import { formatDateValue } from "@/utils/date";

type TabKey = "all" | "credit" | "debit";
type FinancialDirection = "credit" | "debit";

const { isXs: isSmallDevice } = getDeviceMetrics();
const TRANSACTION_DATE_KEYS = [
  "createdAt",
  "transactionDate",
  "updatedAt",
] as const;

interface FinancialTransaction {
  id: string;
  _id?: string;
  partyId?: string;
  partyName?: string;
  senderPartyId?: string;
  senderPartyName?: string;
  receiverPartyId?: string;
  receiverPartyName?: string;
  amount?: number;
  financialType?: "receipt" | "payment" | "credit" | "debit";
  transactionType?: string;
  senderUserId?: string;
  senderRole?: string;
  senderName?: string;
  receiverUserId?: string;
  receiverRole?: string;
  receiverName?: string;
  paymentMode?: string;
  note?: string;
  transactionDate?: any;
  createdAt?: any;
  updatedAt?: any;
}

const extractList = <T,>(response: any): T[] => {
  return extractArrayPayload<T>(response, [
    "financialTransactions",
    "transactions",
  ]);
};

const getFinancialDirection = (
  item: Partial<FinancialTransaction>,
  contextPartyId = "",
): FinancialDirection => {
  if (contextPartyId) {
    if (String(item.senderPartyId || "") === contextPartyId) return "debit";
    if (String(item.receiverPartyId || "") === contextPartyId) return "credit";
  }

  const value = String(item.financialType || item.transactionType || "")
    .trim()
    .toLowerCase();

  if (value === "payment" || value === "debit") return "debit";
  if (value === "receipt" || value === "credit") return "credit";
  if (normalizeRole(item.senderRole) === "party") return "credit";
  if (normalizeRole(item.receiverRole) === "party") return "debit";

  return "debit";
};

const getPartyDisplayName = (item: Partial<FinancialTransaction>) => {
  if (item.senderPartyName || item.receiverPartyName) {
    return `${item.senderPartyName || "Unknown party"} -> ${
      item.receiverPartyName || "Unknown party"
    }`;
  }

  const direction = getFinancialDirection(item);
  return (
    item.partyName ||
    (direction === "credit" ? item.senderName : item.receiverName) ||
    "Unknown party"
  );
};

const normalizeTransaction = (
  item: FinancialTransaction,
): FinancialTransaction => ({
  ...item,
  id: String(item.id || item._id || ""),
});

export default function FinancialTransactionListScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { isParty } = getAccessFlags(session?.user?.role);
  const sessionPartyId = extractPartyId(session?.user);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [items, setItems] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

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
      const res = await FinancialTransactionService.fetchAllTransactions({
        limit: 100,
        ...(isParty && sessionPartyId ? { partyId: sessionPartyId } : {}),
      });
      setItems(
        sortRecordsNewestFirst(
          extractList<FinancialTransaction>(res)
            .map(normalizeTransaction)
            .filter((item) => item.id),
          TRANSACTION_DATE_KEYS,
        ),
      );
    } catch (error) {
      console.log("[FinancialTransactionList] Error:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isParty, sessionPartyId]);

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

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (activeTab !== "all") {
      filtered = filtered.filter(
        (item) => getFinancialDirection(item, sessionPartyId) === activeTab,
      );
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((item) =>
        [
          getPartyDisplayName(item),
          item.senderName,
          item.senderPartyName,
          item.receiverName,
          item.receiverPartyName,
          item.paymentMode,
          getFinancialDirection(item, sessionPartyId),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }
    return filtered;
  }, [activeTab, items, search, sessionPartyId]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      credit: items.filter(
        (item) => getFinancialDirection(item, sessionPartyId) === "credit",
      ).length,
      debit: items.filter(
        (item) => getFinancialDirection(item, sessionPartyId) === "debit",
      ).length,
    };
  }, [items, sessionPartyId]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "credit", label: "Credit", count: stats.credit },
    { key: "debit", label: "Debit", count: stats.debit },
  ];

  const formatDate = (value?: any) => formatDateValue(value);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
        <div style={webStyle(styles.header)}>
          <div>
            <span style={webStyle(styles.title)}>Financial Transactions</span>
            <span style={webStyle(styles.subtitle)}>
              Create and track credit and debit entries.
            </span>
          </div>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/financial-transaction/add" as any)}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </div>

        <div style={webStyle(styles.searchWrap)}>
          <Search size={18} color={colors.gray400} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search party or type..."
            placeholderTextColor={colors.gray400}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color={colors.gray400} />
            </TouchableOpacity>
          ) : null}
        </div>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <span
                style={webStyle([
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ])}
              >
                {tab.label} ({tab.count})
              </span>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <div style={webStyle(styles.centerState)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.stateText)}>Loading financial transactions...</span>
          </div>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredItems.length === 0 ? (
              <div style={webStyle(styles.emptyCard)}>
                <span style={webStyle(styles.emptyTitle)}>No financial transactions</span>
                <span style={webStyle(styles.emptyText)}>
                  Create your first credit or debit entry here.
                </span>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push("/financial-transaction/add" as any)}
                >
                  <Plus size={16} color="#fff" />
                  <span style={webStyle(styles.primaryButtonText)}>Create Transaction</span>
                </TouchableOpacity>
              </div>
            ) : (
              filteredItems.map((item) => {
                const direction = getFinancialDirection(item, sessionPartyId);
                const isCredit = direction === "credit";
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push(`/financial-transaction/${item.id}` as any)
                    }
                  >
                    <div style={webStyle(styles.cardTopRow)}>
                      <div style={webStyle(styles.cardTitleWrap)}>
                        <div
                          style={webStyle([
                            styles.indicator,
                            {
                              backgroundColor: isCredit
                                ? colors.green
                                : colors.red,
                            },
                          ])}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={12} color="#fff" />
                          ) : (
                            <ArrowUpRight size={12} color="#fff" />
                          )}
                        </div>
                        <div>
                          <span style={webStyle(styles.cardTitle)}>
                            {getPartyDisplayName(item)}
                          </span>
                          <span style={webStyle(styles.cardSubTitle)}>
                            {formatDate(item.transactionDate || item.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={webStyle([
                          styles.typeBadge,
                          {
                            backgroundColor: isCredit
                              ? colors.greenLight
                              : colors.redLight,
                          },
                        ])}
                      >
                        <span
                          style={webStyle([
                            styles.typeText,
                            {
                              color: isCredit
                                ? colors.greenDark
                                : colors.red,
                            },
                          ])}
                        >
                          {isCredit ? "Credit" : "Debit"}
                        </span>
                      </div>
                    </div>
                    <div style={webStyle(styles.cardFooter)}>
                      <span style={webStyle(styles.amountText)}>
                        ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </div>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 10 : 14,
    paddingBottom: isSmallDevice ? 8 : 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: isSmallDevice ? 21 : 24,
    fontWeight: "700",
    color: colors.gray900,
  },
  subtitle: { fontSize: 13, color: colors.gray500, marginTop: 4 },
  addBtn: {
    width: isSmallDevice ? 36 : 42,
    height: isSmallDevice ? 36 : 42,
    borderRadius: isSmallDevice ? 12 : 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: isSmallDevice ? 10 : 16,
    marginTop: isSmallDevice ? 8 : 10,
    marginBottom: isSmallDevice ? 8 : 12,
    borderRadius: isSmallDevice ? 12 : 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    height: isSmallDevice ? 42 : 52,
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 7 : 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.gray900 },
  tabsRow: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    gap: isSmallDevice ? 8 : 10,
    paddingBottom: isSmallDevice ? 6 : 8,
  },
  tab: {
    paddingHorizontal: isSmallDevice ? 10 : 14,
    paddingVertical: isSmallDevice ? 8 : 10,
    borderRadius: isSmallDevice ? 12 : 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  activeTab: { backgroundColor: colors.primaryPale, borderColor: colors.primary },
  tabText: { fontSize: 13, color: colors.gray600, fontWeight: "600" },
  activeTabText: { color: colors.primaryDark },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  stateText: { fontSize: 14, color: colors.gray500 },
  listContent: {
    padding: isSmallDevice ? 10 : 16,
    gap: isSmallDevice ? 10 : 14,
    paddingBottom: isSmallDevice ? 96 : 120,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: isSmallDevice ? 14 : 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: isSmallDevice ? 16 : 24,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.gray800 },
  emptyText: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: colors.white,
    borderRadius: isSmallDevice ? 14 : 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: isSmallDevice ? 12 : 16,
    gap: isSmallDevice ? 10 : 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: isSmallDevice ? 8 : 12,
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 8 : 12,
    flex: 1,
  },
  indicator: {
    width: isSmallDevice ? 30 : 34,
    height: isSmallDevice ? 30 : 34,
    borderRadius: isSmallDevice ? 10 : 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.gray900 },
  cardSubTitle: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  typeBadge: {
    paddingHorizontal: isSmallDevice ? 8 : 10,
    paddingVertical: isSmallDevice ? 5 : 7,
    borderRadius: isSmallDevice ? 10 : 12,
  },
  typeText: { fontSize: 12, fontWeight: "700" },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: isSmallDevice ? 9 : 12,
    alignItems: "flex-end",
  },
  amountText: { fontSize: 16, fontWeight: "800", color: colors.gray900 },
});
