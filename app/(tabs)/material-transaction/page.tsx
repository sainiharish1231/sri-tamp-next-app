"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useRouter } from "next/navigation";
import { useFocusEffect } from "next/navigation";
import { Box, Package, Plus, Search, X } from "lucide-react-native";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import MaterialTransactionService from "@/services/MaterialTransactionService";
import PartyService, { PartyDropdownItem } from "@/services/PartyService";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId, getAccessFlags } from "@/utils/access";
import { extractArrayPayload } from "@/utils/response";
import { getDeviceMetrics } from "@/utils/responsive";
import { sortRecordsNewestFirst } from "@/utils/recordSorting";
import { formatDateValue } from "@/utils/date";

type TabKey = "all" | "sales" | "purchase" | "returns";

const { isXs: isSmallDevice } = getDeviceMetrics();
const TRANSACTION_DATE_KEYS = [
  "createdAt",
  "transactionDate",
  "updatedAt",
] as const;

interface MaterialTransactionListItem {
  id: string;
  partyId?: string;
  transactionNo?: string;
  transactionType?: string;
  partyName?: string;
  transactionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: any[];
  summary?: {
    totalItems?: number;
    totalWeight?: number;
    totalAmount?: number;
    extraItems?: number;
  };
  status?: string;
}

const TYPE_THEME: Record<string, { bg: string; text: string; color: string }> =
  {
    sales: {
      bg: colors.greenLight,
      text: colors.greenDark,
      color: colors.green,
    },
    purchase: {
      bg: colors.purplePale,
      text: colors.purpleDark,
      color: colors.purple,
    },
    sales_return: { bg: colors.redLight, text: colors.red, color: colors.red },
    purchase_return: {
      bg: colors.yellowLight,
      text: "#B45309",
      color: colors.yellow,
    },
    jobwork: { bg: colors.blueLight, text: colors.blue, color: colors.blue },
    transfer: {
      bg: colors.primaryPale,
      text: colors.primaryDark,
      color: colors.primary,
    },
  };

const extractList = (response: any): MaterialTransactionListItem[] => {
  const rawList = extractArrayPayload<any>(response, [
    "materialTransactions",
    "transactions",
  ]);
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((item: any) => ({
      ...item,
      id: String(item?.id || item?._id || item?.transactionId || ""),
      partyId:
        item?.partyId ||
        item?.party?.id ||
        item?.party?._id ||
        item?.party?.partyId ||
        "",
      partyName: item?.partyName || item?.party?.name || "Unknown party",
      transactionNo:
        item?.transactionNo || item?.transactionNumber || item?.voucherNo || "",
    }))
    .filter((item) => item.id);
};

const getTypeTheme = (type?: string) => {
  return (
    TYPE_THEME[type || ""] || {
      bg: colors.gray100,
      text: colors.gray700,
      color: colors.gray500,
    }
  );
};

export default function MaterialTransactionListScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { isParty } = getAccessFlags(session?.user?.role);
  const sessionPartyId = extractPartyId(session?.user);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [items, setItems] = useState<MaterialTransactionListItem[]>([]);
  const [parties, setParties] = useState<PartyDropdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedPartyName, setSelectedPartyName] = useState("");
  const [partyModalVisible, setPartyModalVisible] = useState(false);
  const [partySearch, setPartySearch] = useState("");

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
      const [transactionRes, partyRes] = await Promise.all([
        MaterialTransactionService.fetchAllMaterialTransactions({
          params: {
            limit: 100,
            ...(isParty && sessionPartyId ? { partyId: sessionPartyId } : {}),
          },
        }),
        isParty
          ? Promise.resolve({ success: true, data: [] })
          : PartyService.fetchPartiesDropdown(),
      ]);

      if (transactionRes.success) {
        setItems(
          sortRecordsNewestFirst(
            extractList(transactionRes),
            TRANSACTION_DATE_KEYS,
          ),
        );
      } else {
        setItems([]);
      }

      if (partyRes.success && !isParty) {
        setParties(PartyService.extractPartyList<PartyDropdownItem>(partyRes));
      } else {
        setParties([]);
      }
    } catch (error) {
      console.log("[MaterialTransactionList] Error:", error);
      setItems([]);
      setParties([]);
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

    if (selectedPartyId) {
      filtered = filtered.filter(
        (item: any) => item.partyId === selectedPartyId,
      );
    }

    if (activeTab === "sales") {
      filtered = filtered.filter((item) => item.transactionType === "sales");
    }
    if (activeTab === "purchase") {
      filtered = filtered.filter((item) => item.transactionType === "purchase");
    }
    if (activeTab === "returns") {
      filtered = filtered.filter((item) =>
        String(item.transactionType || "").includes("return"),
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((item) =>
        [item.transactionNo, item.partyName, item.transactionType, item.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }
    return filtered;
  }, [activeTab, items, search, selectedPartyId]);

  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties;
    const query = partySearch.toLowerCase();
    return parties.filter((party) =>
      [party.name, party.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [parties, partySearch]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      sales: items.filter((item) => item.transactionType === "sales").length,
      purchase: items.filter((item) => item.transactionType === "purchase")
        .length,
      returns: items.filter((item) =>
        String(item.transactionType || "").includes("return"),
      ).length,
    };
  }, [items]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "sales", label: "Sales", count: stats.sales },
    { key: "purchase", label: "Purchase", count: stats.purchase },
    { key: "returns", label: "Returns", count: stats.returns },
  ];

  const formatDate = (value?: any) => formatDateValue(value);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
        <div style={webStyle(styles.header)}>
          <div>
            <span style={webStyle(styles.title)}>Material Transactions</span>
          </div>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/material-transaction/add" as any)}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </div>

        <div style={webStyle(styles.searchWrap)}>
          <Search size={18} color={colors.gray400} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transaction no, party..."
            placeholderTextColor={colors.gray400}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color={colors.gray400} />
            </TouchableOpacity>
          ) : null}
        </div>

        {!isParty ? (
          <div style={webStyle(styles.filterRow)}>
            <TouchableOpacity
              style={styles.partyFilterBtn}
              onPress={() => setPartyModalVisible(true)}
            >
              <span
                style={webStyle(
                  selectedPartyName
                    ? styles.partyFilterText
                    : styles.partyFilterPlaceholder
                )}
              >
                {selectedPartyName || "Filter by party"}
              </span>
              <span style={webStyle(styles.partyFilterArrow)}>▼</span>
            </TouchableOpacity>

            {selectedPartyId ? (
              <TouchableOpacity
                style={styles.clearPartyBtn}
                onPress={() => {
                  setSelectedPartyId("");
                  setSelectedPartyName("");
                }}
              >
                <span style={webStyle(styles.clearPartyText)}>Clear</span>
              </TouchableOpacity>
            ) : null}
          </div>
        ) : null}

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
            <span style={webStyle(styles.stateText)}>
              Loading material transactions...
            </span>
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
                <Package size={34} color={colors.gray300} />
                <span style={webStyle(styles.emptyTitle)}>No material transactions</span>
                <span style={webStyle(styles.emptyText)}>
                  Your created material transactions will appear here.
                </span>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() =>
                    router.push("/material-transaction/add" as any)
                  }
                >
                  <Plus size={16} color="#fff" />
                  <span style={webStyle(styles.primaryButtonText)}>
                    Create Transaction
                  </span>
                </TouchableOpacity>
              </div>
            ) : (
              filteredItems.map((item) => {
                const theme = getTypeTheme(item.transactionType);
                const totalAmount = Number(item.summary?.totalAmount || 0);
                const totalWeight = Number(item.summary?.totalWeight || 0);
                const totalItems =
                  Number(item.summary?.totalItems || 0) ||
                  item.items?.length ||
                  0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push(`/material-transaction/${item.id}` as any)
                    }
                  >
                    <div style={webStyle(styles.cardTopRow)}>
                      <div style={webStyle(styles.cardTitleWrap)}>
                        <div
                          style={webStyle([
                            styles.indicator,
                            { backgroundColor: theme.color },
                          ])}
                        >
                          <Box size={12} color="#fff" />
                        </div>
                        <div>
                          <span style={webStyle(styles.cardTitle)}>
                            {item.transactionNo || item.id.slice(0, 8)}
                          </span>
                          <span style={webStyle(styles.cardSubTitle)}>
                            {item.partyName || "Unknown party"}
                          </span>
                        </div>
                      </div>
                      <div
                        style={webStyle([
                          styles.typeBadge,
                          { backgroundColor: theme.bg },
                        ])}
                      >
                        <span style={webStyle([styles.typeText, { color: theme.text }])}>
                          {String(item.transactionType || "unknown").replace(
                            /_/g,
                            " ",
                          )}
                        </span>
                      </div>
                    </div>

                    <div style={webStyle(styles.statsRow)}>
                      <div style={webStyle(styles.statChip)}>
                        <span style={webStyle(styles.statLabel)}>Items</span>
                        <span style={webStyle(styles.statValue)}>{totalItems}</span>
                      </div>
                      <div style={webStyle(styles.statChip)}>
                        <span style={webStyle(styles.statLabel)}>Weight</span>
                        <span style={webStyle(styles.statValue)}>
                          {totalWeight.toFixed(3)} kg
                        </span>
                      </div>
                      <div style={webStyle(styles.statChip)}>
                        <span style={webStyle(styles.statLabel)}>Amount</span>
                        <span style={webStyle(styles.statValue)}>
                          ₹{totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div style={webStyle(styles.cardFooter)}>
                      <span style={webStyle(styles.cardDate)}>
                        {formatDate(item.transactionDate)}
                      </span>
                      <span style={webStyle(styles.cardStatus)}>
                        {item.status || "completed"}
                      </span>
                    </div>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </div>

      <KeyboardAwareModal
        visible={!isParty && partyModalVisible}
        transparent
        animationType="slide"
      >
        <div style={webStyle(styles.modalOverlay)}>
          <div style={webStyle(styles.modalCard)}>
            <span style={webStyle(styles.modalTitle)}>Select Party</span>
            <TextInput
              style={styles.modalInput}
              value={partySearch}
              onChangeText={setPartySearch}
              placeholder="Search party"
              placeholderTextColor={colors.gray400}
            />
            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSelectedPartyId("");
                  setSelectedPartyName("");
                  setPartyModalVisible(false);
                }}
              >
                <span style={webStyle(styles.modalItemTitle)}>All Parties</span>
                <span style={webStyle(styles.modalItemSubtitle)}>
                  Show all transactions
                </span>
              </TouchableOpacity>

              {filteredParties.map((party) => (
                <TouchableOpacity
                  key={party.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedPartyId(party.id);
                    setSelectedPartyName(party.name);
                    setPartyModalVisible(false);
                  }}
                >
                  <span style={webStyle(styles.modalItemTitle)}>{party.name}</span>
                  <span style={webStyle(styles.modalItemSubtitle)}>
                    {party.mobile || "Party"}
                  </span>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPartyModalVisible(false)}
            >
              <span style={webStyle(styles.modalCloseText)}>Close</span>
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
  filterRow: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingBottom: isSmallDevice ? 8 : 10,
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 8 : 10,
  },
  partyFilterBtn: {
    flex: 1,
    minHeight: isSmallDevice ? 42 : 48,
    borderRadius: isSmallDevice ? 12 : 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  partyFilterText: {
    fontSize: 14,
    color: colors.gray900,
    fontWeight: "600",
  },
  partyFilterPlaceholder: {
    fontSize: 14,
    color: colors.gray400,
  },
  partyFilterArrow: {
    fontSize: 12,
    color: colors.gray500,
  },
  clearPartyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  clearPartyText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray700,
  },
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
  activeTab: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.primary,
  },
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
  typeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  statsRow: { flexDirection: "row", gap: isSmallDevice ? 6 : 10 },
  statChip: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: isSmallDevice ? 10 : 14,
    padding: isSmallDevice ? 8 : 12,
  },
  statLabel: { fontSize: 11, color: colors.gray500, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: "700", color: colors.gray900 },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: isSmallDevice ? 9 : 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardDate: { fontSize: 12, color: colors.gray500 },
  cardStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.greenDark,
    textTransform: "capitalize",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    width: "100%",
    maxWidth: 520,
    maxHeight: "86%",
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray900,
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.gray900,
  },
  modalList: {
    maxHeight: 380,
  },
  modalItem: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray900,
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
  },
  modalCloseBtn: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray700,
  },
});
