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
import {
  Building2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  User,
  Wallet,
  X,
} from "lucide-react";
import { colors } from "@/colors";
import ExpenseService from "@/services/ExpenseService";
import { Expense, PaidByType } from "@/types/expense.types";
import { getDeviceMetrics } from "@/utils/responsive";
import { formatDateValue } from "@/utils/date";
import { extractArrayPayload } from "@/utils/response";

type ExpenseFilter = "all" | PaidByType | "legacy";

const { isXs: isSmallDevice } = getDeviceMetrics();

const PAYER_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; color: string; icon: any }
> = {
  party: {
    bg: "#EDE9FE",
    text: "#7C3AED",
    label: "Party Paid",
    color: "#7C3AED",
    icon: Building2,
  },
  user: {
    bg: "#D1FAE5",
    text: "#059669",
    label: "User Paid",
    color: "#059669",
    icon: User,
  },
  legacy: {
    bg: "#F3F4F6",
    text: "#6B7280",
    label: "Legacy",
    color: "#6B7280",
    icon: MoreHorizontal,
  },
};

const getPayerTheme = (expense?: Expense) => {
  const key =
    expense?.paidByType ||
    expense?.paidByAccountType ||
    (expense?.partyId ? "party" : expense?.paidById ? "user" : "legacy");

  return PAYER_CONFIG[key] || PAYER_CONFIG.legacy;
};

const getPayerKey = (expense: Expense): ExpenseFilter => {
  const key =
    expense.paidByType ||
    expense.paidByAccountType ||
    (expense.partyId ? "party" : expense.paidById ? "user" : "legacy");
  return key === "party" || key === "user" ? key : "legacy";
};

export default function ExpenseListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ExpenseFilter>("all");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ExpenseService.fetchAllExpenses({ params: { limit: 100 } });
      if (res.success) {
        const data = extractArrayPayload<Expense>(res, ["expenses"]);
        setExpenses(Array.isArray(data) ? data : []);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error("[Expenses] Error fetching:", error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  }, [fetchExpenses]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (activeTab !== "all") {
      filtered = filtered.filter((expense) => getPayerKey(expense) === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((expense) =>
        [
          expense.title,
          expense.paidToName,
          expense.paidByName,
          expense.description,
          expense.message,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [expenses, activeTab, search]);

  const stats = useMemo(() => {
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const partyCount = expenses.filter((expense) => getPayerKey(expense) === "party").length;
    const userCount = expenses.filter((expense) => getPayerKey(expense) === "user").length;
    const legacyCount = expenses.filter((expense) => getPayerKey(expense) === "legacy").length;

    return {
      total: expenses.length,
      totalAmount,
      partyCount,
      userCount,
      legacyCount,
    };
  }, [expenses]);

  const formatDate = (value?: any) => formatDateValue(value, "dd MMM yyyy");

  const tabs: { key: ExpenseFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "party", label: "Party", count: stats.partyCount },
    { key: "user", label: "User", count: stats.userCount },
    { key: "legacy", label: "Legacy", count: stats.legacyCount },
  ];

  const renderExpenseCard = (expense: Expense) => {
    const typeTheme = getPayerTheme(expense);
    const IconComponent = typeTheme.icon;
    const payerName = expense.paidByName || expense.paidByAccountName || expense.paidBy || "Unknown";
    const paidToName = expense.paidToName || expense.title || "Expense";
    const description = expense.description || expense.message || "";

    return (
      <TouchableOpacity
        key={expense.id}
        style={styles.card}
        onPress={() => router.push(`/expense/${expense.id}` as any)}
        activeOpacity={0.7}
        testID={`expense-card-${expense.id}`}
      >
        <div style={webStyle(styles.cardTopRow)}>
          <div style={webStyle(styles.cardTopLeft)}>
            <div style={webStyle([styles.typeIndicator, { backgroundColor: typeTheme.color }])}>
              <IconComponent size={12} color="#fff" />
            </div>
            <span style={webStyle([styles.cardTypeText, { color: typeTheme.text }])}>
              {typeTheme.label}
            </span>
            <span style={webStyle(styles.cardIdText)}>
              {formatDate(expense.date || expense.createdAt)}
            </span>
          </div>
          <div style={webStyle([styles.typeBadge, { backgroundColor: typeTheme.bg }])}>
            <span style={webStyle([styles.typeBadgeText, { color: typeTheme.text }])}>
              {String(expense.paidByType || expense.paidByAccountType || "legacy").toUpperCase()}
            </span>
          </div>
        </div>

        <div style={webStyle(styles.cardBody)}>
          <div style={webStyle(styles.cardPartyRow)}>
            <div style={webStyle([styles.partyAvatar, { backgroundColor: typeTheme.bg }])}>
              <span style={webStyle([styles.partyAvatarText, { color: typeTheme.text }])}>
                {payerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={webStyle(styles.cardPartyInfo)}>
              <span style={webStyle(styles.cardPartyName)}>{paidToName}</span>
              <span style={webStyle(styles.cardDate)}>Paid by {payerName}</span>
            </div>
            <div style={webStyle(styles.cardAmountBlock)}>
              <span style={webStyle([styles.cardAmount, { color: typeTheme.color }])}>
                ₹{Number(expense.amount || 0).toLocaleString("en-IN")}
              </span>
              <span style={webStyle(styles.cardPartyHint)}>{formatDate(expense.date || expense.createdAt)}</span>
            </div>
          </div>

          {description ? (
            <div style={webStyle(styles.cardMessagePreview)}>
              <Ionicons name="chatbubble-outline" size={11} color={typeTheme.color} />
              <span style={webStyle(styles.cardMessageText)}>{description}</span>
            </div>
          ) : null}
        </div>

        <div style={webStyle(styles.cardViewHint)}>
          <span style={webStyle(styles.cardViewHintText)}>Tap to view details</span>
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
              <span style={webStyle(styles.headerTitle)}>Expenses</span>
              <span style={webStyle(styles.headerSubtitle)}>
                ₹{stats.totalAmount.toLocaleString("en-IN")} total
              </span>
            </div>
            <div style={webStyle(styles.headerActions)}>
              <TouchableOpacity
                onPress={onRefresh}
                disabled={refreshing || loading}
                style={styles.headerIconBtn}
                testID="expenses-refresh"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.gray500} />
                ) : (
                  <RefreshCw size={18} color={colors.gray600} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push("/expense/add" as any)}
                activeOpacity={0.8}
                testID="expenses-add"
              >
                <Plus size={18} color="#fff" />
                <span style={webStyle(styles.addBtnText)}>Add</span>
              </TouchableOpacity>
            </div>
          </div>
        </div>

        <div style={webStyle(styles.searchSection)}>
          <div style={webStyle(styles.searchBar)}>
            <Search size={17} color={colors.gray400} />
            <TextInput
              placeholder="Search expenses..."
              placeholderTextColor={colors.gray400}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              testID="expenses-search"
            />
            {search.length > 0 ? (
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
                  testID={`expenses-tab-${tab.key}`}
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
            <span style={webStyle(styles.loadingText)}>Loading expenses...</span>
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
            {expenses.length > 0 ? (
              <div style={webStyle(styles.statsRow)}>
                <div style={webStyle([styles.statCard, { borderLeftColor: "#7C3AED" }])}>
                  <Wallet size={18} color="#7C3AED" />
                  <span style={webStyle(styles.statNum)}>{stats.total}</span>
                  <span style={webStyle(styles.statLabel)}>Entries</span>
                </div>
                <div style={webStyle([styles.statCard, { borderLeftColor: "#059669" }])}>
                  <span style={webStyle(styles.statNum)}>₹{stats.totalAmount.toLocaleString("en-IN")}</span>
                  <span style={webStyle(styles.statLabel)}>Total amount</span>
                </div>
                <div style={webStyle([styles.statCard, { borderLeftColor: "#D97706" }])}>
                  <span style={webStyle(styles.statNum)}>{stats.partyCount}</span>
                  <span style={webStyle(styles.statLabel)}>Party paid</span>
                </div>
                <div style={webStyle([styles.statCard, { borderLeftColor: "#DC2626" }])}>
                  <span style={webStyle(styles.statNum)}>{stats.userCount}</span>
                  <span style={webStyle(styles.statLabel)}>User paid</span>
                </div>
              </div>
            ) : null}

            {filteredExpenses.length === 0 ? (
              <div style={webStyle(styles.emptyWrap)}>
                <div style={webStyle(styles.emptyIconCircle)}>
                  <Ionicons name="receipt-outline" size={32} color={colors.gray300} />
                </div>
                <span style={webStyle(styles.emptyTitle)}>No expenses found</span>
                <span style={webStyle(styles.emptySubtitle)}>
                  {expenses.length === 0
                    ? "Add your first expense to get started"
                    : "Try adjusting your search or filters"}
                </span>
                {expenses.length === 0 ? (
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => router.push("/expense/add" as any)}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="#fff" />
                    <span style={webStyle(styles.emptyCreateBtnText)}>
                      Add Expense
                    </span>
                  </TouchableOpacity>
                ) : null}
              </div>
            ) : (
              filteredExpenses.map(renderExpenseCard)
            )}

            <div style={webStyle({ height: 30 })} />
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
    letterSpacing: 0,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 6 : 10,
  },
  headerIconBtn: {
    width: isSmallDevice ? 34 : 38,
    height: isSmallDevice ? 34 : 38,
    borderRadius: isSmallDevice ? 10 : 12,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    height: isSmallDevice ? 34 : 38,
    borderRadius: isSmallDevice ? 10 : 12,
    backgroundColor: colors.primary,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  searchSection: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: isSmallDevice ? 8 : 12,
    paddingBottom: isSmallDevice ? 6 : 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: isSmallDevice ? 38 : 42,
    marginBottom: isSmallDevice ? 8 : 10,
    gap: isSmallDevice ? 6 : 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.gray900,
    paddingVertical: 0,
  },
  tabsScrollContent: {
    gap: 10,
    paddingVertical: 2,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
  },
  tabPillTextActive: {
    color: "#fff",
  },
  tabPillCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: colors.gray100,
  },
  tabPillCountActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  tabPillCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600,
  },
  tabPillCountTextActive: {
    color: "#fff",
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray500,
  },
  listContent: {
    paddingBottom: 28,
    paddingHorizontal: isSmallDevice ? 10 : 16,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    minHeight: 86,
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderLeftWidth: 4,
    justifyContent: "center",
  },
  statNum: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  cardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  typeIndicator: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardIdText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
  },
  typeBadge: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cardPartyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  partyAvatarText: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardPartyInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardPartyName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray900,
  },
  cardDate: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
  },
  cardAmountBlock: {
    alignItems: "flex-end",
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.gray900,
  },
  cardPartyHint: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
  },
  cardMessagePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  cardMessageText: {
    flex: 1,
    fontSize: 12,
    color: colors.gray600,
    lineHeight: 18,
  },
  cardViewHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.gray50,
  },
  cardViewHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray500,
  },
  emptyWrap: {
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.gray50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
  },
  emptyCreateBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
