"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Activity,
  BadgeIndianRupee,
  Boxes,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  WalletCards
} from "lucide-react";
import OrderService from "@/services/OrderService";
import PartyService from "@/services/PartyService";
import ProductService from "@/services/ProductService";
import ActivityService from "@/services/ActivityService";
import { useAuthStore } from "@/store/auth.store";
import {
  extractOrderOwnerUserId,
  extractPartyId,
  extractUserId,
  getAccessFlags
} from "@/utils/access";
import {
  isCompletedOrderStatus,
  sortOrdersNewestFirstWithCompletedLast
} from "@/utils/recordSorting";
import { formatDateValue } from "@/utils/date";
import { extractArrayPayload, extractCountPayload } from "@/utils/response";
import type { ActivityLog } from "@/types/activity.types";

const ORDER_DATE_KEYS = ["createdAt", "orderDate", "updatedAt"] as const;

interface DashboardOrder {
  id?: string;
  orderId?: string;
  orderNumber?: string;
  orderType?: string;
  partyName?: string;
  party?: { name?: string };
  partyId?: string;
  createdAt?: string;
  orderDate?: string;
  updatedAt?: string;
  status?: string;
  totalAmount?: number;
  items?: { totalAmount?: string | number }[];
  materials?: { totalAmount?: string | number }[];
}

interface DashboardActivity extends ActivityLog {}

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function calculateOrderTotal(order: DashboardOrder) {
  if (order.items?.length) {
    return order.items.reduce(
      (sum, item) => sum + (Number.parseFloat(item?.totalAmount?.toString() || "0") || 0),
      0
    );
  }

  if (order.materials?.length) {
    return order.materials.reduce(
      (sum, material) => sum + (Number(material.totalAmount ?? 0) || 0),
      0
    );
  }

  return Number(order.totalAmount || 0);
}

function orderDate(order: DashboardOrder) {
  return formatDateValue(order.createdAt || order.orderDate || order.updatedAt || "");
}

function orderStatusClass(status?: string) {
  const normalized = status?.toLowerCase();
  if (normalized === "completed") return "is-completed";
  if (normalized === "pending") return "is-pending";
  if (normalized === "cancelled" || normalized === "canceled") return "is-danger";
  return "is-neutral";
}

function activityActionLabel(action?: string) {
  switch (action) {
    case "create":
      return "Created";
    case "update":
      return "Updated";
    case "delete":
      return "Deleted";
    case "bulk_create":
      return "Bulk created";
    case "clear":
      return "Cleared";
    case "status_update":
      return "Status updated";
    case "cancel":
      return "Cancelled";
    default:
      return action ? action.replace(/_/g, " ") : "Activity";
  }
}

function activityActionClass(action?: string) {
  const normalized = action?.toLowerCase();
  if (normalized === "delete" || normalized === "cancel") return "is-danger";
  if (normalized === "create" || normalized === "bulk_create") return "is-completed";
  if (normalized === "update" || normalized === "status_update") return "is-pending";
  return "is-neutral";
}

function activityModuleLabel(module?: string) {
  return module
    ? module.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Activity";
}

export default function DashboardScreen() {
  const { session } = useAuthStore();
  const user = session?.user;
  const {
    isAdmin,
    isInternalUser,
    isParty,
    canManageParties,
    canViewOrders,
    canViewActivities,
  } =
    getAccessFlags(user?.role);
  const sessionPartyId = extractPartyId(user);
  const sessionUserId = extractUserId(user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [balanceAmount, setBalanceAmount] = useState(
    Number(user?.currentBalance ?? user?.balance ?? user?.openingBalance ?? 0)
  );
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalParties: 0,
    totalProducts: 0,
    totalValue: 0
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const ordersRes =
        canViewOrders &&
        ((!isParty && !isInternalUser) ||
          (isParty && !!sessionPartyId) ||
          (isInternalUser && !!sessionUserId))
          ? await OrderService.fetchAllOrders({
              params: {
                ...(isParty && sessionPartyId ? { partyId: sessionPartyId } : {}),
                ...(isInternalUser && sessionUserId
                  ? { internalUserId: sessionUserId }
                  : {})
              }
            })
          : { success: true, data: [] };

      let ordersCount = 0;
      let partiesCount = 0;
      let productsCount = 0;
      let recentActivities: DashboardActivity[] = [];

      if (!isParty) {
        setBalanceAmount(
          Number(user?.currentBalance ?? user?.balance ?? user?.openingBalance ?? 0)
        );
      }

      if (isAdmin) {
        try {
          ordersCount = extractCountPayload(await OrderService.fetchAllOrdersCount());
        } catch (error) {
          console.log("Orders count error:", error);
        }
      }

      if (canManageParties) {
        try {
          partiesCount = extractCountPayload(await PartyService.fetchAllPartyCount());
        } catch (error) {
          console.log("Parties count error:", error);
        }
      }

      if (isAdmin) {
        try {
          productsCount = extractCountPayload(await ProductService.fetchAllProductsCount());
        } catch (error) {
          console.log("Products count error:", error);
        }
      }

      if (canViewActivities) {
        try {
          const activitiesRes = await ActivityService.fetchRecentActivities({
            params: { limit: 5 },
          });
          const activityData = extractArrayPayload<DashboardActivity>(activitiesRes, [
            "activities",
          ]);
          recentActivities = Array.isArray(activityData) ? activityData : [];
        } catch (error) {
          console.log("Activities error:", error);
        }
      }

      if (isParty && sessionPartyId) {
        try {
          const partyRes = await PartyService.fetchPartyById(sessionPartyId);
          const partyData = PartyService.extractParty(partyRes) as any;
          if (partyData) {
            setBalanceAmount(
              Number(
                partyData.currentBalance ??
                  partyData.openingBalance ??
                  user?.currentBalance ??
                  user?.balance ??
                  0
              )
            );
          }
        } catch (error) {
          console.log("Party balance error:", error);
        }
      }

      const ordersData = extractArrayPayload<DashboardOrder>(ordersRes, ["orders"]);
      const nextOrders = Array.isArray(ordersData) ? ordersData : [];
      const filteredOrders = nextOrders.filter((order: DashboardOrder & any) => {
        if (isAdmin) return true;
        if (isParty) return order.partyId === sessionPartyId;
        if (isInternalUser) {
          const ownerUserId = extractOrderOwnerUserId(order);
          return ownerUserId ? ownerUserId === sessionUserId : true;
        }
        return false;
      });

      const sortedOrders = sortOrdersNewestFirstWithCompletedLast(
        filteredOrders,
        ORDER_DATE_KEYS
      );

      const pendingOrders = filteredOrders.filter(
        (order) => order.status?.toLowerCase() === "pending"
      ).length;

      const completedOrders = filteredOrders.filter((order) =>
        isCompletedOrderStatus(order.status)
      ).length;

      const totalValue = filteredOrders.reduce(
        (sum, order) => sum + calculateOrderTotal(order),
        0
      );

      setOrders(sortedOrders);
      setActivities(recentActivities);
      setStats({
        totalOrders: isAdmin && ordersCount > 0 ? ordersCount : filteredOrders.length,
        pendingOrders,
        completedOrders,
        totalParties: isParty ? 1 : partiesCount > 0 ? partiesCount : 0,
        totalProducts: productsCount,
        totalValue
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    canManageParties,
    canViewOrders,
    canViewActivities,
    isAdmin,
    isInternalUser,
    isParty,
    sessionPartyId,
    sessionUserId,
    user?.balance,
    user?.currentBalance,
    user?.openingBalance
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const visibleActions = useMemo(
    () =>
      [
        {
          href: "/orders/add",
          label: "New Order",
          icon: ShoppingBag,
          show: canViewOrders && !isParty
        },
        {
          href: "/parties/add",
          label: "New Party",
          icon: Users,
          show: canManageParties
        },
        {
          href: "/products/add",
          label: "New Product",
          icon: Package,
          show: isAdmin
        },
        {
          href: "/financial-transaction/add",
          label: "Payment Entry",
          icon: WalletCards,
          show: isAdmin
        },
        {
          href: "/activities",
          label: "Activity Log",
          icon: Activity,
          show: canViewActivities
        },
        {
          href: "/material-transaction/add",
          label: "Material Entry",
          icon: Boxes,
          show: isAdmin
        }
      ].filter((item) => item.show),
    [canManageParties, canViewActivities, canViewOrders, isAdmin, isParty]
  );

  const metricCards = [
    {
      label: "Total Orders",
      value: stats.totalOrders,
      subtitle: "All active order records",
      icon: ShoppingBag,
      tone: "violet",
      href: "/orders"
    },
    {
      label: "Pending Orders",
      value: stats.pendingOrders,
      subtitle: "Awaiting next action",
      icon: Clock3,
      tone: "amber",
      href: "/orders"
    },
    {
      label: "Completed",
      value: stats.completedOrders,
      subtitle: "Successfully closed",
      icon: CheckCircle2,
      tone: "emerald",
      href: "/orders"
    },
    {
      label: "Order Value",
      value: money.format(stats.totalValue),
      subtitle: "Total order amount",
      icon: TrendingUp,
      tone: "blue",
      href: "/transaction"
    },
    {
      label: "Activity",
      value: activities.length,
      subtitle: "Recent workspace changes",
      icon: Activity,
      tone: "violet",
      href: "/activities"
    }
  ];

  return (
    <div className="web-dashboard">
      <section className="web-dashboard-hero">
        <div>
          <div className="web-dashboard-kicker">Operations Control</div>
          <h2>Welcome back, {user?.name || "San Raj"}</h2>
          <p>
            Track orders, parties, products, material flow, and financial entries from one
            focused workspace.
          </p>
        </div>
        <div className="web-dashboard-hero-visual" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <button className="web-dashboard-refresh" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "is-spinning" : ""} />
          Refresh
        </button>
      </section>

      <section className="web-dashboard-grid">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} className={`web-metric-card tone-${card.tone}`} key={card.label}>
              <div className="web-metric-head">
                <div className="web-metric-label">{card.label}</div>
                <div className="web-metric-icon">
                  <Icon size={17} />
                </div>
              </div>
              <div className="web-metric-value">
                {loading ? <span className="web-skeleton web-skeleton-text" /> : card.value}
              </div>
              <p className="web-metric-subtitle">{card.subtitle}</p>
            </Link>
          );
        })}
      </section>

      <section className="web-dashboard-main-grid">
        <div className="web-panel web-panel-large">
          <div className="web-panel-header">
            <div>
              <h3>Recent Orders</h3>
              <p>Newest active records across purchase and sale activity.</p>
            </div>
            <Link href="/orders" className="web-panel-link">
              View all <ArrowRight size={15} />
            </Link>
          </div>

          <div className="web-order-list">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div className="web-order-row" key={index}>
                  <span className="web-skeleton web-skeleton-avatar" />
                  <span className="web-skeleton web-skeleton-line" />
                  <span className="web-skeleton web-skeleton-pill" />
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="web-empty-state">
                <ShoppingBag size={28} />
                <strong>No orders found</strong>
                <span>New activity will appear here once orders are created.</span>
              </div>
            ) : (
              orders.slice(0, 8).map((order) => (
                <Link href={`/orders/${order.id}`} className="web-order-row" key={order.id}>
                  <div className="web-order-type">
                    {(order.orderType || "O").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="web-order-info">
                    <strong>
                      {order.orderNumber || order.orderId || `Order ${order.id?.slice(0, 8)}`}
                    </strong>
                    <span>{order.partyName || order.party?.name || "No party"} • {orderDate(order)}</span>
                  </div>
                  <div className="web-order-amount">{money.format(calculateOrderTotal(order))}</div>
                  <div className={`web-status ${orderStatusClass(order.status)}`}>
                    {order.status || "Open"}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="web-dashboard-side">
          <div className="web-panel">
            <div className="web-panel-header is-compact">
              <div>
                <h3>Balance</h3>
                <p>Current account standing</p>
              </div>
              <BadgeIndianRupee size={20} />
            </div>
            <div className="web-balance-value">{money.format(balanceAmount)}</div>
            <div className={`web-balance-chip ${balanceAmount >= 0 ? "is-positive" : "is-negative"}`}>
              {balanceAmount >= 0 ? "Receivable" : "Payable"}
            </div>
          </div>

          <div className="web-panel">
            <div className="web-panel-header is-compact">
              <div>
                <h3>Quick Actions</h3>
                <p>Common entry points</p>
              </div>
            </div>
            <div className="web-action-list">
              {visibleActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link href={action.href} className="web-action-item" key={action.href}>
                    <span>
                      <Icon size={17} />
                    </span>
                    {action.label}
                    <ArrowRight size={14} />
                  </Link>
                );
              })}
            </div>
          </div>

          {canViewActivities ? (
            <div className="web-panel">
              <div className="web-panel-header is-compact">
                <div>
                  <h3>Recent Activity</h3>
                  <p>Latest updates across the workspace</p>
                </div>
                <Link href="/activities" className="web-panel-link">
                  View all <ArrowRight size={15} />
                </Link>
              </div>

              <div className="web-activity-list">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div className="web-activity-row" key={index}>
                      <span className="web-skeleton web-skeleton-avatar" />
                      <span className="web-skeleton web-skeleton-line" />
                      <span className="web-skeleton web-skeleton-pill" />
                    </div>
                  ))
                ) : activities.length === 0 ? (
                  <div className="web-empty-state is-compact">
                    <Activity size={28} />
                    <strong>No activity yet</strong>
                    <span>New edits, orders, expenses, and attendance changes will appear here.</span>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <Link href="/activities" className="web-activity-row" key={activity.id}>
                      <div className="web-activity-type">
                        {(activity.action || "A").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="web-activity-info">
                        <strong>{activity.entityName || activityModuleLabel(activity.module)}</strong>
                        <span>
                          {activityActionLabel(activity.action)}
                          {activity.description ? ` • ${activity.description}` : ""}
                        </span>
                      </div>
                      <div className="web-activity-time">
                        {formatDateValue(activity.createdAt || "")}
                      </div>
                      <div className={`web-status ${activityActionClass(activity.action)}`}>
                        {activity.action ? activityActionLabel(activity.action) : "Activity"}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="web-panel web-mini-stats">
            <div>
              <span>Parties</span>
              <strong>{loading ? "..." : stats.totalParties}</strong>
            </div>
            <div>
              <span>Products</span>
              <strong>{loading ? "..." : stats.totalProducts}</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
