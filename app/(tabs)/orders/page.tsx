"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  webStyle,
} from "react-native";
import { useFocusEffect, useRouter } from "next/navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/colors";
import OrderService from "@/services/OrderService";
import PartyService from "@/services/PartyService";
import MaterialService from "@/services/MaterialService";
import { useAuthStore } from "@/store/auth.store";
import {
  extractOrderOwnerUserId,
  extractPartyId,
  extractUserId,
  getAccessFlags,
} from "@/utils/access";
import { getDeviceMetrics } from "@/utils/responsive";
import {
  isCompletedOrderStatus,
  sortOrdersNewestFirstWithCompletedLast,
} from "@/utils/recordSorting";
import { formatDateValue } from "@/utils/date";
import { extractArrayPayload, extractCountPayload } from "@/utils/response";

const { isXs: isSmallDevice, isMd: isTablet } = getDeviceMetrics();
const ORDER_DATE_KEYS = ["createdAt", "orderDate", "updatedAt"] as const;

type OrderTabType = "all" | "purchase" | "sale";

interface OrderItem {
  id?: string;
  itemType: "metal" | "product";
  name?: string;
  ratePerKg: number;
  weightKg: number;
  totalAmount: number;
  productId?: string;
  weightPerUnitKg?: number;
  orderedQty?: number;
  quantity?: number;
  metalId?: string;
  kg?: number;
  gram?: number;
}

interface Order {
  id: string;
  orderType: string;
  orderId?: string;
  orderNumber?: string;
  partyId?: string;
  partyName?: string;
  orderDate: string;
  items: OrderItem[];
  totalWeight: number;
  totalAmount: number;
  status?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Party {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  partyType?: string;
  partyTypeName?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  completed: {
    bg: "#DCFCE7",
    text: "#15803D",
    dot: "#22C55E",
    label: "Completed",
  },
  pending: { bg: "#FEF9C3", text: "#A16207", dot: "#EAB308", label: "Pending" },
  cancelled: {
    bg: "#FEE2E2",
    text: "#DC2626",
    dot: "#EF4444",
    label: "Cancelled",
  },
  processing: {
    bg: colors.primaryPale,
    text: colors.primaryDark,
    dot: colors.primary,
    label: "Processing",
  },
  "in progress": {
    bg: colors.primaryPale,
    text: colors.primaryDark,
    dot: colors.primary,
    label: "In Progress",
  },
};

const getStatusTheme = (status?: string) => {
  return (
    STATUS_CONFIG[status?.toLowerCase() || ""] || {
      bg: colors.gray100,
      text: colors.gray600,
      dot: colors.gray400,
      label: status || "Pending",
    }
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const user = session?.user;
  const { isAdmin, isInternalUser, isParty } = getAccessFlags(user?.role);
  const sessionPartyId = extractPartyId(user);
  const sessionUserId = extractUserId(user);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<OrderTabType>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [metalTypes, setMetalTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      if (isParty && !sessionPartyId) {
        setOrders([]);
        return;
      }

      if (isInternalUser && !sessionUserId) {
        setOrders([]);
        return;
      }

      const res = await OrderService.fetchAllOrders({
        params: {
          limit: 10,
          ...(isParty && sessionPartyId ? { partyId: sessionPartyId } : {}),
          ...(isInternalUser && sessionUserId
            ? { internalUserId: sessionUserId }
            : {}),
        },
      });
      if (res.success) {
        const data = extractArrayPayload<Order>(res, ["orders"]);
        const nextOrders = Array.isArray(data) ? data : [];
        const filteredOrders = nextOrders.filter((order: Order & any) => {
          if (isAdmin) return true;
          if (isParty) return order.partyId === sessionPartyId;

          if (isInternalUser) {
            const ownerUserId = extractOrderOwnerUserId(order);
            return ownerUserId ? ownerUserId === sessionUserId : true;
          }

          return false;
        });
        setOrders(
          sortOrdersNewestFirstWithCompletedLast(
            filteredOrders,
            ORDER_DATE_KEYS,
          ),
        );
      }
    } catch (error: any) {
      console.error("[Orders] Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isInternalUser, isParty, sessionPartyId, sessionUserId]);

  const fetchCount = useCallback(async () => {
    try {
      if (!isAdmin) {
        setTotalCount(orders.length);
        return;
      }
      const res = await OrderService.fetchAllOrdersCount();
      if (res.success) {
        setTotalCount(extractCountPayload(res));
      }
    } catch {
      setTotalCount(orders.length);
    }
  }, [isAdmin, orders.length]);

  const fetchParties = useCallback(async () => {
    try {
      if (isParty && !sessionPartyId) {
        setParties([]);
        return;
      }

      if (isParty && sessionPartyId) {
        const res = await PartyService.fetchPartyById(sessionPartyId);
        if (res.success) {
          const party = PartyService.extractParty(res) as Party | null;
          setParties(party ? [party] : []);
        } else {
          setParties([]);
        }
        return;
      }

      const res = await PartyService.fetchPartiesDropdown();
      console.log(res);
      if (res.success) {
        setParties(PartyService.extractPartyList(res));
      } else {
        setParties([]);
      }
    } catch (error) {
      console.error("[Orders] Error fetching parties:", error);
      setParties([]);
    }
  }, [isParty, sessionPartyId]);

  const fetchMetals = useCallback(async () => {
    try {
      const res = await MaterialService.fetchAllMaterial({
        params: { limit: 100 },
      });
      if (res.success) {
        const data = extractArrayPayload<any>(res, ["materials"]);
        setMetalTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("[Orders] Error fetching metals:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchOrders(), fetchCount(), fetchParties(), fetchMetals()]);
    }, [fetchCount, fetchMetals, fetchOrders, fetchParties]),
  );

  useEffect(() => {
    Promise.all([fetchOrders(), fetchCount(), fetchParties(), fetchMetals()]);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setTotalCount(orders.length);
    }
  }, [isAdmin, orders.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchCount(), fetchParties()]);
    setRefreshing(false);
  }, [fetchCount, fetchOrders, fetchParties]);

  const getPartyById = useCallback(
    (partyId?: string) => {
      if (!partyId) return undefined;
      return parties.find((p) => p.id === partyId);
    },
    [parties],
  );

  const getMetalName = useCallback(
    (metalId?: string) => {
      if (!metalId) return "Unknown Metal";
      return (
        metalTypes.find((m: any) => m.id === metalId)?.name || "Unknown Metal"
      );
    },
    [metalTypes],
  );

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (activeTab !== "all") {
      filtered = filtered.filter((o) => o.orderType === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          (o.orderId || o.orderNumber || "").toLowerCase().includes(q) ||
          (o.partyName || "").toLowerCase().includes(q) ||
          (o.status || "").toLowerCase().includes(q) ||
          (o.note || "").toLowerCase().includes(q),
      );
    }
    return sortOrdersNewestFirstWithCompletedLast(filtered, ORDER_DATE_KEYS);
  }, [search, activeTab, orders]);

  const orderStats = useMemo(() => {
    const purchase = orders.filter((o) => o.orderType === "purchase").length;
    const sale = orders.filter((o) => o.orderType === "sale").length;
    const pending = orders.filter(
      (o) => (o.status || "").toLowerCase() === "pending",
    ).length;
    const completed = orders.filter(
      (o) => (o.status || "").toLowerCase() === "completed",
    ).length;
    const totalAmount = orders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0),
      0,
    );
    return {
      purchase,
      sale,
      pending,
      completed,
      total: orders.length,
      totalAmount,
    };
  }, [orders]);

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (value?: any) => formatDateValue(value);

  const tabs: { key: OrderTabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: orderStats.total },
    { key: "purchase", label: "Purchase", count: orderStats.purchase },
    { key: "sale", label: "Sale", count: orderStats.sale },
  ];

  const renderOrderCard = (order: Order) => {
    const party = getPartyById(order.partyId);
    const isPurchase = order.orderType === "purchase";
    const statusTheme = getStatusTheme(order.status);
    const isOrderCompleted = isCompletedOrderStatus(order.status);
    const isOrderDone =
      isOrderCompleted || (order.status || "").toLowerCase() === "cancelled";

    return (
      <TouchableOpacity
        key={order.id}
        style={[styles.orderCard, isOrderDone && styles.orderCardCompleted]}
        onPress={() => router.push(`/orders/${order.id}` as any)}
        activeOpacity={0.65}
        testID={`order-card-${order.id}`}
      >
        <div style={webStyle(styles.cardTopRow)}>
          <div style={webStyle(styles.cardTopLeft)}>
            <div
              style={webStyle([
                styles.orderTypeIndicator,
                { backgroundColor: isPurchase ? colors.primary : colors.green },
              ])}
            >
              <Ionicons
                name={isPurchase ? "arrow-down" : "arrow-up"}
                size={10}
                color="#fff"
              />
            </div>
            <span style={webStyle(styles.cardOrderType)}>
              {isPurchase ? "Purchase" : "Sale"}
            </span>
            <span style={webStyle(styles.cardOrderIdText)}>
              #
              {(order.orderId || order.orderNumber || order.id)?.substring(
                0,
                8,
              )}
            </span>
          </div>
          <div style={webStyle(styles.cardTopRight)}>
            <div
              style={webStyle([
                styles.statusChip,
                { backgroundColor: statusTheme.bg },
              ])}
            >
              <div
                style={webStyle([
                  styles.statusDot,
                  { backgroundColor: statusTheme.dot },
                ])}
              />
              <span
                style={webStyle([
                  styles.statusChipText,
                  { color: statusTheme.text },
                ])}
              >
                {statusTheme.label}
              </span>
            </div>
            {!isOrderDone && (
              <TouchableOpacity
                style={styles.editIconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/orders/edit/${order.id}` as any);
                }}
                activeOpacity={0.7}
                testID={`order-edit-${order.id}`}
              >
                <Ionicons name="create" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </div>
        </div>

        <div style={webStyle(styles.cardBody)}>
          <div style={webStyle(styles.cardPartyRow)}>
            <div
              style={webStyle([
                styles.partyAvatar,
                {
                  backgroundColor: isPurchase
                    ? colors.primaryPale
                    : colors.greenLight,
                },
              ])}
            >
              <span
                style={webStyle([
                  styles.partyAvatarText,
                  { color: isPurchase ? colors.primary : colors.green },
                ])}
              >
                {(party?.name || order.partyName || "?")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>
            <div style={webStyle(styles.cardPartyInfo)}>
              <span style={webStyle(styles.cardPartyName)}>
                {party?.name || order.partyName || "Unknown Party"}
              </span>
              <span style={webStyle(styles.cardDate)}>
                {formatDate(order.orderDate)}
              </span>
            </div>
            <div style={webStyle(styles.cardAmountBlock)}>
              <span style={webStyle(styles.cardAmountValue)}>
                {formatCurrency(order.totalAmount)}
              </span>
              <span style={webStyle(styles.cardItemCount)}>
                {order.items?.length || 0} items
              </span>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div style={webStyle(styles.cardItemsPreview)}>
              {order.items.slice(0, 2).map((item, idx) => {
                const isMetal = item.itemType === "metal";
                return (
                  <div key={idx} style={webStyle(styles.cardItemChip)}>
                    <Ionicons
                      name={isMetal ? "water" : "cube-outline"}
                      size={11}
                      color={isMetal ? colors.primary : colors.green}
                    />
                    <span style={webStyle(styles.cardItemChipText)}>
                      {isMetal
                        ? getMetalName(item.metalId)
                        : item.name || "Product"}
                    </span>
                    <span style={webStyle(styles.cardItemChipAmount)}>
                      ₹{Number(item.totalAmount || 0).toFixed(0)}
                    </span>
                  </div>
                );
              })}
              {order.items.length > 2 && (
                <div style={webStyle(styles.cardItemChip)}>
                  <span style={webStyle(styles.cardMoreText)}>
                    +{order.items.length - 2} more
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={webStyle(styles.cardViewHint)}>
          <span style={webStyle(styles.cardViewHintText)}>
            Tap to view details
          </span>
          <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
        </div>
      </TouchableOpacity>
    );
  };

  return (
    <div style={webStyle(styles.container)}>
      <div style={webStyle(styles.header)}>
        <div style={webStyle(styles.headerContent)}>
          <div style={webStyle(styles.headerIcon)}>
            <Ionicons
              name="receipt-outline"
              size={isTablet ? 32 : isSmallDevice ? 24 : 28}
              color="white"
            />
          </div>
          <div style={webStyle(styles.headerText)}>
            <span style={webStyle(styles.title)}>Orders</span>
            <span style={webStyle(styles.subtitle)}>
              {totalCount || orders.length} orders ·{" "}
              {formatCurrency(orderStats.totalAmount)}
            </span>
          </div>
        </div>

        <div style={webStyle(styles.headerActions)}>
          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing || loading}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="refresh"
                size={isTablet ? 24 : isSmallDevice ? 18 : 22}
                color="white"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/orders/add" as any)}
          >
            <Ionicons
              name="add"
              size={isTablet ? 24 : isSmallDevice ? 18 : 22}
              color="white"
            />
            <span style={webStyle(styles.addButtonText)}>New</span>
          </TouchableOpacity>
        </div>
      </div>

      <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
        <div style={webStyle(styles.searchSection)}>
          <div style={webStyle(styles.searchBar)}>
            <Ionicons name="search" size={17} color={colors.gray400} />
            <TextInput
              className="rn-search-input"
              placeholder="Search orders..."
              placeholderTextColor={colors.gray400}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              testID="orders-search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={colors.gray400}
                />
              </TouchableOpacity>
            )}
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
                  testID={`orders-tab-${tab.key}`}
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
            <span style={webStyle(styles.loadingText)}>Loading orders...</span>
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
            {orders.length > 0 && (
              <div style={webStyle(styles.statsRow)}>
                <div
                  style={webStyle([
                    styles.statCard,
                    { borderLeftColor: colors.yellow },
                  ])}
                >
                  <span style={webStyle(styles.statNum)}>
                    {orderStats.pending}
                  </span>
                  <span style={webStyle(styles.statLabel)}>Pending</span>
                </div>
                <div
                  style={webStyle([
                    styles.statCard,
                    { borderLeftColor: colors.green },
                  ])}
                >
                  <span style={webStyle(styles.statNum)}>
                    {orderStats.completed}
                  </span>
                  <span style={webStyle(styles.statLabel)}>Done</span>
                </div>
                <div
                  style={webStyle([
                    styles.statCard,
                    { borderLeftColor: colors.primary },
                  ])}
                >
                  <span style={webStyle(styles.statNum)}>
                    {orderStats.purchase}
                  </span>
                  <span style={webStyle(styles.statLabel)}>Buy</span>
                </div>
                <div
                  style={webStyle([
                    styles.statCard,
                    { borderLeftColor: "#8B5CF6" },
                  ])}
                >
                  <span style={webStyle(styles.statNum)}>
                    {orderStats.sale}
                  </span>
                  <span style={webStyle(styles.statLabel)}>Sell</span>
                </div>
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <div style={webStyle(styles.emptyWrap)}>
                <div style={webStyle(styles.emptyIconCircle)}>
                  <Ionicons
                    name="receipt-outline"
                    size={32}
                    color={colors.gray300}
                  />
                </div>
                <span style={webStyle(styles.emptyTitle)}>No orders found</span>
                <span style={webStyle(styles.emptySubtitle)}>
                  {(isParty && !sessionPartyId) ||
                  (isInternalUser && !sessionUserId)
                    ? "Your account is not assigned correctly yet"
                    : orders.length === 0
                      ? "Create your first order to get started"
                      : "Try adjusting your search or filters"}
                </span>
                {orders.length === 0 && (
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => router.push("/orders/add" as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <span style={webStyle(styles.emptyCreateBtnText)}>
                      Create Order
                    </span>
                  </TouchableOpacity>
                )}
              </div>
            ) : (
              filteredOrders.map(renderOrderCard)
            )}

            <div style={webStyle({ height: 30 })} />
          </ScrollView>
        )}
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 12 : 20,
    paddingTop: isTablet ? 40 : isSmallDevice ? 34 : 36,
    paddingBottom: isTablet ? 20 : isSmallDevice ? 12 : 16,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    width: isTablet ? 56 : isSmallDevice ? 44 : 52,
    height: isTablet ? 56 : isSmallDevice ? 44 : 52,
    borderRadius: isTablet ? 16 : 12,
    backgroundColor: colors.primary + "80",
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 16 : isSmallDevice ? 12 : 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: "white",
    opacity: 0.9,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshButton: {
    padding: isTablet ? 12 : isSmallDevice ? 8 : 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: isTablet ? 16 : isSmallDevice ? 12 : 14,
    height: isTablet ? 44 : isSmallDevice ? 36 : 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  addButtonText: {
    color: "white",
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    fontWeight: "600",
  },

  searchSection: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: isSmallDevice ? 8 : 12,
    paddingBottom: isSmallDevice ? 6 : 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: isSmallDevice ? 38 : 42,
    marginBottom: isSmallDevice ? 8 : 10,
    gap: isSmallDevice ? 6 : 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  tabsScrollContent: { gap: 8, paddingRight: 8 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,

    borderWidth: 1,
    borderColor: colors.gray200,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.gray500,
  },
  tabPillTextActive: { color: "#fff" },
  tabPillCount: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: "center" as const,
  },
  tabPillCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabPillCountText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.gray500,
  },
  tabPillCountTextActive: { color: "#fff" },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: colors.gray400, marginTop: 12 },

  listContent: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: isSmallDevice ? 8 : 10,
    paddingBottom: isSmallDevice ? 12 : 16,
  },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isSmallDevice ? 8 : 10,
    marginBottom: isSmallDevice ? 12 : 16,
  },
  statCard: {
    flex: 1,
    minWidth: isSmallDevice ? "45%" : 160,
    backgroundColor: colors.white,
    paddingVertical: isSmallDevice ? 10 : 14,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statNum: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "800" as const,
    color: colors.gray800,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: colors.gray400,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginTop: 2,
  },

  orderCard: {
    backgroundColor: "#FDFCFF",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + "22",
    overflow: "hidden" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 4,
    boxShadow: "0 14px 30px rgba(124, 58, 237, 0.1)",
  },
  orderCardCompleted: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray200,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 10 : 13,
    paddingBottom: isSmallDevice ? 8 : 10,
    backgroundColor: colors.primaryFaint,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + "12",
  },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderTypeIndicator: {
    width: isSmallDevice ? 18 : 20,
    height: isSmallDevice ? 18 : 20,
    borderRadius: 6,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  cardOrderType: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.gray600,
  },
  cardOrderIdText: { fontSize: 11, color: colors.gray400, marginLeft: 2 },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusChipText: {
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },

  editIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  cardBody: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 11 : 14,
    paddingBottom: isSmallDevice ? 10 : 12,
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  cardPartyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 8 : 10,
  },
  partyAvatar: {
    width: isSmallDevice ? 32 : 38,
    height: isSmallDevice ? 32 : 38,
    borderRadius: isSmallDevice ? 8 : 10,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  partyAvatarText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
  },
  cardPartyInfo: { flex: 1 },
  cardPartyName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  cardDate: { fontSize: 11, color: colors.gray400, marginTop: 1 },
  cardAmountBlock: { alignItems: "flex-end" as const },
  cardAmountValue: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.gray900,
  },
  cardItemCount: { fontSize: 10, color: colors.gray400, marginTop: 1 },

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
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + "14",
  },
  cardItemChipText: { fontSize: 11, color: colors.gray600, maxWidth: 80 },
  cardItemChipAmount: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.gray700,
  },
  cardMoreText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500" as const,
  },

  cardViewHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.primary + "10",
    backgroundColor: colors.primaryFaint,
  },
  cardViewHintText: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500" as const,
  },

  emptyWrap: {
    alignItems: "center" as const,
    paddingVertical: isSmallDevice ? 42 : 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.gray700,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray400,
    marginTop: 4,
    textAlign: "center" as const,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyCreateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
