"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  PanResponder,
  Animated,
  webStyle,
} from "react-native";
import { useLocalSearchParams } from "@/compat/expo-router";
import { Toast } from "@/utils/toast";


import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/colors";
import { format } from "date-fns";
import PartyService from "@/services/PartyService";
import OrderService from "@/services/OrderService";
import MaterialTransactionService from "@/services/MaterialTransactionService";
import FinancialTransactionService from "@/services/FinancialTransactionService";
import UserService from "@/services/UserService";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "@/utils/Toast";
import { getResponsiveMetrics, ResponsiveMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId, normalizeRole } from "@/utils/access";
import {
  getRecordTimestamp,
  isCompletedOrderStatus,
  sortRecordsNewestFirst,
} from "@/utils/recordSorting";
import { extractArrayPayload } from "@/utils/response";

type TabType = "orders" | "material" | "financial";
const ORDER_DATE_KEYS = ["createdAt", "orderDate", "updatedAt"] as const;
const TRANSACTION_DATE_KEYS = [
  "createdAt",
  "transactionDate",
  "updatedAt",
] as const;

interface OrderItem {
  id: string;
  orderType?: string;
  orderNumber?: string;
  status?: string;
  totalAmount?: number;
  items?: any[];
  createdAt?: any;
  priority?: number;
  position?: number;
  note?: string;
  orderDate?: string;
  [key: string]: any;
}

const extractEntityPayload = (response: any) => {
  const candidates = [
    response?.data?.data,
    response?.data?.user,
    response?.data,
    response,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate[0] || null;
    if (!candidate || typeof candidate !== "object") continue;
    if (candidate.user && typeof candidate.user === "object") {
      return candidate.user;
    }
    if (candidate.data && typeof candidate.data === "object") {
      const nested = Array.isArray(candidate.data)
        ? candidate.data[0]
        : candidate.data;
      return nested || null;
    }
    return candidate;
  }

  return null;
};

const toText = (value: unknown) => String(value ?? "").trim();

const getUserIdentity = (user?: any) =>
  toText(user?.id || user?._id || user?.userId);

const isSuccessfulResponse = (response: any) =>
  response?.success !== false && response?.data?.success !== false;

const toFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export default function PartyDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const { session } = useAuthStore();
  const { width } = useWindowDimensions();
  const responsive = useMemo(() => getResponsiveMetrics(width), [width]);
  const styles = useMemo(() => makeStyles(responsive), [responsive]);
  const requestedPartyId = params.id as string;
  const loggedInPartyId = extractPartyId(session?.user);
  const isPartyUser = normalizeRole(session?.user?.role) === "party";
  const partyId =
    isPartyUser && loggedInPartyId ? loggedInPartyId : requestedPartyId;
  const [party, setParty] = useState<any | null>(null);
  const [partyUser, setPartyUser] = useState<any | null>(null);
  const [bankDetails, setBankDetails] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [materialTransactions, setMaterialTransactions] = useState<any[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [positionInput, setPositionInput] = useState("");
  const dragY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const dragArmedOrderId = useRef<string | null>(null);
  const dragHasMoved = useRef(false);
  const dragStartIndex = useRef<number | null>(null);
  const currentDragIndex = useRef<number | null>(null);
  const suppressOrderPress = useRef(false);
  const cardLayouts = useRef<{ [id: string]: { y: number; height: number } }>(
    {},
  );
  const scrollOffset = useRef(0);
  const scrollViewPageY = useRef(0);
  const scrollViewHeight = useRef(0);
  const contentHeight = useRef(0);
  const dragStartPageY = useRef(0);
  const latestDragPageY = useRef(0);
  const dragStartScrollOffset = useRef(0);
  const autoScrollDirection = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const ordersRef = useRef<OrderItem[]>([]);
  const dragOriginalOrders = useRef<OrderItem[]>([]);
  const dragMovedOrder = useRef<OrderItem | null>(null);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const getOrderPosition = useCallback((order: OrderItem, index: number) => {
    const position = Number(order.position);
    if (Number.isFinite(position)) return position;
    const priority = Number(order.priority);
    if (Number.isFinite(priority)) return priority;
    return index + 1;
  }, []);

  const getExplicitOrderPosition = useCallback((order: OrderItem) => {
    const position = Number(order.position);
    if (Number.isFinite(position)) return position;
    const priority = Number(order.priority);
    if (Number.isFinite(priority)) return priority;
    return null;
  }, []);

  const getLastReorderableIndex = useCallback((items: OrderItem[]) => {
    return (
      items.filter((order) => !isCompletedOrderStatus(order.status)).length - 1
    );
  }, []);

  const sortOrdersByPosition = useCallback(
    (items: OrderItem[]) => {
      const sortActiveOrders = (activeOrders: OrderItem[]) => {
        const hasExplicitPositions = activeOrders.some(
          (order) => getExplicitOrderPosition(order) !== null,
        );

        return [...activeOrders]
          .map((order, index) => ({ order, index }))
          .sort((a, b) => {
            if (hasExplicitPositions) {
              return (
                getOrderPosition(a.order, a.index) -
                  getOrderPosition(b.order, b.index) ||
                getRecordTimestamp(b.order, ORDER_DATE_KEYS) -
                  getRecordTimestamp(a.order, ORDER_DATE_KEYS) ||
                a.index - b.index
              );
            }

            return (
              getRecordTimestamp(b.order, ORDER_DATE_KEYS) -
                getRecordTimestamp(a.order, ORDER_DATE_KEYS) ||
              a.index - b.index
            );
          })
          .map(({ order }) => order);
      };

      const activeOrders = items.filter(
        (order) => !isCompletedOrderStatus(order.status),
      );
      const completedOrders = items.filter((order) =>
        isCompletedOrderStatus(order.status),
      );

      return [
        ...sortActiveOrders(activeOrders),
        ...sortRecordsNewestFirst(completedOrders, ORDER_DATE_KEYS),
      ];
    },
    [getExplicitOrderPosition, getOrderPosition],
  );

  const calculateTargetIndex = useCallback(
    (pageY: number, ordersArr: OrderItem[]) => {
      if (ordersArr.length === 0) return 0;

      const lastReorderableIndex = getLastReorderableIndex(ordersArr);
      if (lastReorderableIndex < 0) return 0;

      const contentY = scrollOffset.current + pageY - scrollViewPageY.current;
      let targetIndex = lastReorderableIndex;

      for (let index = 0; index < ordersArr.length; index += 1) {
        if (index > lastReorderableIndex) break;
        const order = ordersArr[index];
        const layout = cardLayouts.current[order.id];
        const fallbackHeight = 110 + (responsive.isXs ? 10 : 12);
        const rowY = layout?.y ?? index * fallbackHeight;
        const rowHeight = layout?.height ?? fallbackHeight;

        if (contentY < rowY + rowHeight / 2) {
          targetIndex = index;
          break;
        }
      }

      return Math.max(0, Math.min(lastReorderableIndex, targetIndex));
    },
    [getLastReorderableIndex, responsive.isXs],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setOrdersLoading(true);
    try {
      const [
        partyRes,
        partyUserRes,
        bankDetailsRes,
        ordersRes,
        materialRes,
        financialRes,
      ] = await Promise.allSettled([
        PartyService.fetchPartyById(partyId),
        UserService.fetchUserByPartyId(partyId),
        PartyService.fetchPartyBankDetails(partyId),
        OrderService.fetchAllOrders({ params: { partyId } }),
        MaterialTransactionService.fetchAllMaterialTransactions({
          params: { partyId },
        }),
        FinancialTransactionService.fetchAllTransactions({ partyId }),
      ]);

      if (
        partyRes.status === "fulfilled" &&
        isSuccessfulResponse(partyRes.value)
      ) {
        setParty(
          PartyService.extractParty<any>(partyRes.value) || partyRes.value.data,
        );
      } else {
        Toast.show({
          type: "error",
          text1: t("error"),
          text2: t("failed_to_load_party_details"),
        });
      }

      let nextPartyUser: any | null = null;
      if (
        partyUserRes.status === "fulfilled" &&
        isSuccessfulResponse(partyUserRes.value)
      ) {
        nextPartyUser = extractEntityPayload(partyUserRes.value);
        setPartyUser(nextPartyUser);
      } else {
        setPartyUser(null);
      }

      if (
        bankDetailsRes.status === "fulfilled" &&
        isSuccessfulResponse(bankDetailsRes.value)
      ) {
        setBankDetails(
          PartyService.extractParty<any>(bankDetailsRes.value) ||
            extractEntityPayload(bankDetailsRes.value),
        );
      } else {
        setBankDetails(null);
      }

      if (
        ordersRes.status === "fulfilled" &&
        isSuccessfulResponse(ordersRes.value)
      ) {
        const ordersData = extractArrayPayload<OrderItem>(ordersRes.value, [
          "orders",
          "data",
        ]);
        const partyOrders = ordersData.filter(
          (order) =>
            String(order.partyId || order.party?.id || "") === String(partyId),
        );
        setOrders(sortOrdersByPosition(partyOrders));
      } else {
        setOrders([]);
      }

      if (
        materialRes.status === "fulfilled" &&
        isSuccessfulResponse(materialRes.value)
      ) {
        const materialData = extractArrayPayload<any>(materialRes.value, [
          "transactions",
          "materialTransactions",
          "data",
        ]).filter((transaction) => {
          return (
            !transaction.partyId ||
            String(transaction.partyId) === String(partyId)
          );
        });
        setMaterialTransactions(
          sortRecordsNewestFirst(materialData, TRANSACTION_DATE_KEYS),
        );
      } else {
        setMaterialTransactions([]);
      }

      if (
        financialRes.status === "fulfilled" &&
        isSuccessfulResponse(financialRes.value)
      ) {
        const partyUserId = getUserIdentity(nextPartyUser);
        const financialData = extractArrayPayload<any>(financialRes.value, [
          "financialTransactions",
          "transactions",
          "data",
        ]).filter((transaction) => {
          const transactionPartyId = toText(
            transaction.partyId ||
              transaction.party?.id ||
              transaction.party?._id ||
              transaction.senderPartyId ||
              transaction.receiverPartyId,
          );
          if (transactionPartyId && transactionPartyId === toText(partyId)) {
            return true;
          }
          if (
            toText(transaction.senderPartyId) === toText(partyId) ||
            toText(transaction.receiverPartyId) === toText(partyId)
          ) {
            return true;
          }
          if (!partyUserId) return false;
          return (
            toText(transaction.senderUserId) === partyUserId ||
            toText(transaction.receiverUserId) === partyUserId
          );
        });
        setFinancialTransactions(
          sortRecordsNewestFirst(financialData, TRANSACTION_DATE_KEYS),
        );
      } else {
        setFinancialTransactions([]);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: error?.message || t("something_wrong"),
      });
      setParty(null);
      setPartyUser(null);
      setBankDetails(null);
      setOrders([]);
      setMaterialTransactions([]);
      setFinancialTransactions([]);
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  }, [partyId, sortOrdersByPosition, t]);

  useFocusEffect(
    useCallback(() => {
      if (partyId) loadData();
    }, [partyId, loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const persistMovedOrder = async (
    movedOrder: OrderItem,
    finalOrders: OrderItem[],
    previousOrders: OrderItem[],
  ) => {
    if (isCompletedOrderStatus(movedOrder.status)) return;

    const reorderableOrders = finalOrders.filter(
      (order) => !isCompletedOrderStatus(order.status),
    );
    const finalIndex = reorderableOrders.findIndex(
      (order) => order.id === movedOrder.id,
    );
    if (finalIndex < 0) return;

    const prevOrder = reorderableOrders[finalIndex - 1] || null;
    const nextOrder = reorderableOrders[finalIndex + 1] || null;
    const prevPayload = prevOrder
      ? {
          id: prevOrder.id,
          position: getOrderPosition(prevOrder, finalIndex - 1),
        }
      : null;
    const nextPayload = nextOrder
      ? {
          id: nextOrder.id,
          position: getOrderPosition(nextOrder, finalIndex + 1),
        }
      : null;

    const nextPosition = !prevPayload
      ? (nextPayload?.position || 0) - 1
      : !nextPayload
        ? prevPayload.position + 1
        : (prevPayload.position + nextPayload.position) / 2;

    const optimisticOrders = sortOrdersByPosition(
      finalOrders.map((order) =>
        order.id === movedOrder.id
          ? { ...order, position: nextPosition }
          : order,
      ),
    );
    ordersRef.current = optimisticOrders;
    setOrders(optimisticOrders);

    setUpdatingPriority(true);
    try {
      const res = await OrderService.reorderOrder({
        id: movedOrder.id,
        prev: prevPayload,
        next: nextPayload,
      });

      const serverPosition = Number(
        res?.data?.data?.position ??
          res?.data?.position ??
          (res as any)?.position,
      );
      if (Number.isFinite(serverPosition)) {
        setOrders((current) => {
          const syncedOrders = sortOrdersByPosition(
            current.map((order) =>
              order.id === movedOrder.id
                ? { ...order, position: serverPosition }
                : order,
            ),
          );
          ordersRef.current = syncedOrders;
          return syncedOrders;
        });
      }
      Toast.show({ type: "success", text1: t("order_position_updated") });
    } catch {
      const restoredOrders = sortOrdersByPosition(previousOrders);
      ordersRef.current = restoredOrders;
      setOrders(restoredOrders);
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: t("failed_to_update_order_position"),
      });
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleMoveOrder = async (fromIndex: number, toIndex: number) => {
    const currentOrders = ordersRef.current.length ? ordersRef.current : orders;
    const movedOrder = currentOrders[fromIndex];
    const lastReorderableIndex = getLastReorderableIndex(currentOrders);
    const safeToIndex = Math.max(0, Math.min(toIndex, lastReorderableIndex));

    if (
      updatingPriority ||
      !movedOrder ||
      isCompletedOrderStatus(movedOrder.status) ||
      lastReorderableIndex < 0 ||
      fromIndex > lastReorderableIndex ||
      safeToIndex < 0 ||
      safeToIndex >= currentOrders.length ||
      fromIndex === safeToIndex
    )
      return;

    const previousOrders = [...currentOrders];
    const newOrders = [...currentOrders];
    const [moved] = newOrders.splice(fromIndex, 1);
    newOrders.splice(safeToIndex, 0, moved);

    ordersRef.current = newOrders;
    setOrders(newOrders);
    await persistMovedOrder(moved, newOrders, previousOrders);
  };

  const startEditingOrderPosition = (order: OrderItem, index: number) => {
    if (
      updatingPriority ||
      draggingOrderId ||
      isCompletedOrderStatus(order.status)
    )
      return;
    setEditingOrderId(order.id);
    setPositionInput(String(index + 1));
  };

  const commitOrderPosition = (order: OrderItem) => {
    if (editingOrderId !== order.id) return;

    const currentOrders = ordersRef.current.length ? ordersRef.current : orders;
    const currentIndex = currentOrders.findIndex(
      (item) => item.id === order.id,
    );
    const lastReorderableIndex = getLastReorderableIndex(currentOrders);
    const nextPosition = Number(positionInput.trim());

    setEditingOrderId(null);
    setPositionInput("");

    if (
      currentIndex < 0 ||
      isCompletedOrderStatus(order.status) ||
      !Number.isInteger(nextPosition) ||
      nextPosition < 1 ||
      nextPosition > lastReorderableIndex + 1
    ) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: t("invalid_order_position"),
      });
      return;
    }

    const targetIndex = nextPosition - 1;
    if (targetIndex !== currentIndex) {
      void handleMoveOrder(currentIndex, targetIndex);
    }
  };

  const measureScrollView = () => {
    requestAnimationFrame(() => {
      (scrollViewRef.current as any)?.measure(
        (
          _x: number,
          _y: number,
          _width: number,
          height: number,
          _pageX: number,
          pageY: number,
        ) => {
          scrollViewHeight.current = height || scrollViewHeight.current;
          scrollViewPageY.current = pageY || scrollViewPageY.current;
        },
      );
    });
  };

  const getGesturePageY = (event: any, gesture: any) => {
    return (
      event?.nativeEvent?.pageY ||
      dragStartPageY.current + Number(gesture?.dy || 0)
    );
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    autoScrollDirection.current = 0;
  };

  const moveDraggingOrderToIndex = (targetIndex: number) => {
    const movedOrder = dragMovedOrder.current;
    if (!movedOrder || isCompletedOrderStatus(movedOrder.status)) return;

    setOrders((currentOrders) => {
      const currentIndex = currentOrders.findIndex(
        (order) => order.id === movedOrder.id,
      );
      const lastReorderableIndex = getLastReorderableIndex(currentOrders);
      const safeTargetIndex = Math.max(
        0,
        Math.min(targetIndex, lastReorderableIndex),
      );
      if (
        currentIndex < 0 ||
        lastReorderableIndex < 0 ||
        currentIndex > lastReorderableIndex ||
        safeTargetIndex < 0 ||
        safeTargetIndex >= currentOrders.length ||
        currentIndex === safeTargetIndex
      ) {
        return currentOrders;
      }

      const nextOrders = [...currentOrders];
      const [moved] = nextOrders.splice(currentIndex, 1);
      nextOrders.splice(safeTargetIndex, 0, moved);
      ordersRef.current = nextOrders;
      currentDragIndex.current = safeTargetIndex;
      return nextOrders;
    });
  };

  const syncDragFromPageY = (pageY: number) => {
    const visualOffset =
      pageY -
      dragStartPageY.current +
      (scrollOffset.current - dragStartScrollOffset.current);

    dragY.setValue(visualOffset);

    const target = calculateTargetIndex(pageY, ordersRef.current);
    if (target !== currentDragIndex.current) {
      currentDragIndex.current = target;
      setDragTargetIndex(target);
      moveDraggingOrderToIndex(target);
      dragStartPageY.current = pageY;
      dragStartScrollOffset.current = scrollOffset.current;
      dragY.setValue(0);
    }
  };

  const startAutoScroll = (direction: number) => {
    if (autoScrollDirection.current === direction) return;

    stopAutoScroll();
    if (direction === 0) return;

    autoScrollDirection.current = direction;
    autoScrollTimer.current = setInterval(() => {
      const maxOffset = Math.max(
        contentHeight.current - scrollViewHeight.current,
        0,
      );
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, scrollOffset.current + direction * 18),
      );

      if (nextOffset === scrollOffset.current) {
        stopAutoScroll();
        return;
      }

      scrollOffset.current = nextOffset;
      scrollViewRef.current?.scrollTo({ y: nextOffset, animated: false });
      syncDragFromPageY(latestDragPageY.current);
    }, 16);
  };

  const updateAutoScroll = (pageY: number) => {
    const topEdge = scrollViewPageY.current + 72;
    const bottomEdge =
      scrollViewPageY.current + Math.max(scrollViewHeight.current - 72, 0);

    if (pageY < topEdge) {
      startAutoScroll(-1);
    } else if (pageY > bottomEdge) {
      startAutoScroll(1);
    } else {
      startAutoScroll(0);
    }
  };

  const clearDragState = () => {
    stopAutoScroll();
    isDragging.current = false;
    dragArmedOrderId.current = null;
    dragHasMoved.current = false;
    dragStartIndex.current = null;
    currentDragIndex.current = null;
    dragMovedOrder.current = null;
    dragOriginalOrders.current = [];
    dragY.setValue(0);
    setDraggingOrderId(null);
    setDragTargetIndex(null);
  };

  const armOrderDrag = (order: OrderItem, index: number, pageY: number) => {
    if (updatingPriority || isCompletedOrderStatus(order.status)) return;

    measureScrollView();
    suppressOrderPress.current = true;
    dragOriginalOrders.current = ordersRef.current;
    dragMovedOrder.current = order;
    dragArmedOrderId.current = order.id;
    dragStartIndex.current = index;
    currentDragIndex.current = index;
    dragStartPageY.current = pageY;
    latestDragPageY.current = pageY;
    dragStartScrollOffset.current = scrollOffset.current;
    dragHasMoved.current = false;
    isDragging.current = true;
    dragY.setValue(0);
    setDraggingOrderId(order.id);
    setDragTargetIndex(index);
  };

  const finishDrag = () => {
    const movedOrder = dragMovedOrder.current;
    const previousOrders = dragOriginalOrders.current;
    const finalOrders = ordersRef.current;
    const from = previousOrders.findIndex(
      (order) => order.id === movedOrder?.id,
    );
    const to = finalOrders.findIndex((order) => order.id === movedOrder?.id);

    clearDragState();
    setTimeout(() => {
      suppressOrderPress.current = false;
    }, 160);

    if (
      movedOrder &&
      !isCompletedOrderStatus(movedOrder.status) &&
      from >= 0 &&
      to >= 0 &&
      from !== to
    ) {
      void persistMovedOrder(movedOrder, finalOrders, previousOrders);
    }
  };

  const cancelDrag = () => {
    if (dragHasMoved.current && dragOriginalOrders.current.length > 0) {
      const restoredOrders = sortOrdersByPosition(dragOriginalOrders.current);
      ordersRef.current = restoredOrders;
      setOrders(restoredOrders);
    }
    clearDragState();
    setTimeout(() => {
      suppressOrderPress.current = false;
    }, 160);
  };

  const createPanHandlers = useCallback(
    (order: OrderItem, index: number, activateImmediately: boolean) => {
      const shouldStartDrag = (gesture: any) => {
        if (updatingPriority || isCompletedOrderStatus(order.status))
          return false;
        if (activateImmediately) return true;
        if (dragArmedOrderId.current === order.id) {
          return Math.abs(gesture.dy) > 2;
        }

        return (
          Math.abs(gesture.dy) > 8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx * 1.5)
        );
      };

      return PanResponder.create({
        onStartShouldSetPanResponder: () =>
          activateImmediately &&
          !updatingPriority &&
          !isCompletedOrderStatus(order.status),

        onMoveShouldSetPanResponder: (_, gesture) => shouldStartDrag(gesture),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          shouldStartDrag(gesture),

        onPanResponderGrant: (event, gesture) => {
          if (isCompletedOrderStatus(order.status)) return;
          const pageY = getGesturePageY(event, gesture);
          armOrderDrag(order, index, pageY);
        },

        onPanResponderMove: (event, gesture) => {
          if (!isDragging.current) return;

          dragHasMoved.current = true;
          const pageY = getGesturePageY(event, gesture);
          latestDragPageY.current = pageY;
          syncDragFromPageY(pageY);
          updateAutoScroll(pageY);
        },

        onPanResponderRelease: finishDrag,

        onPanResponderTerminate: cancelDrag,
      });
    },

    [orders, updatingPriority, calculateTargetIndex],
  );

  const getOrderTotal = (order: OrderItem) => {
    const directTotal =
      toFiniteNumber(order.grandTotal) ?? toFiniteNumber(order.totalAmount);
    if (directTotal !== null) return directTotal;

    const lines = order.items || order.materials || [];
    return lines.reduce(
      (sum: number, item: any) =>
        sum +
        (toFiniteNumber(item.grandTotal) ??
          toFiniteNumber(item.totalAmount) ??
          0),
      0,
    );
  };

  const getOrderItemsText = (order: OrderItem) => {
    const lines = order.items || order.materials || [];
    return lines
      .map((item: any) => {
        const name = item.itemName || item.name || t("item");
        const qty =
          item.remainingQty ??
          item.pendingQty ??
          item.orderedQty ??
          item.quantity ??
          item.qty;
        return qty !== undefined && qty !== null ? `${name} (${qty}x)` : name;
      })
      .join(", ");
  };

  const formatBalance = (balance: number, type: string) => {
    const normalizedType = String(type || "")
      .trim()
      .toLowerCase();
    const sign = normalizedType
      ? normalizedType === "credit"
        ? "+"
        : "-"
      : balance >= 0
        ? "+"
        : "-";
    return `${sign}₹${Math.abs(balance).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateValue: any): string => {
    try {
      if (!dateValue) return t("not_available");
      let date: Date;
      if (dateValue._seconds !== undefined)
        date = new Date(dateValue._seconds * 1000);
      else if (dateValue.seconds !== undefined)
        date = new Date(dateValue.seconds * 1000);
      else if (dateValue.toDate) date = dateValue.toDate();
      else date = new Date(dateValue);
      if (isNaN(date.getTime())) return t("invalid_date");
      return format(date, "dd MMM yyyy, hh:mm a");
    } catch {
      return t("invalid_date");
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return colors.green;
    if (s === "in progress") return colors.yellow;
    return colors.gray500;
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case "purchase":
        return colors.primary;
      case "sale":
        return colors.green;
      default:
        return colors.gray500;
    }
  };

  const getFinancialDirection = (transaction: any): "credit" | "debit" => {
    if (toText(transaction?.senderPartyId) === toText(partyId)) return "debit";
    if (toText(transaction?.receiverPartyId) === toText(partyId))
      return "credit";

    const partyUserId = getUserIdentity(partyUser);
    if (partyUserId) {
      if (toText(transaction?.senderUserId) === partyUserId) return "credit";
      if (toText(transaction?.receiverUserId) === partyUserId) return "debit";
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

  const renderTransactionCard = (
    transaction: any,
    type: "material" | "financial",
  ) => {
    const financialDirection =
      type === "financial" ? getFinancialDirection(transaction) : null;
    const transactionColor =
      type === "material"
        ? colors.primary
        : financialDirection === "debit"
          ? colors.red
          : colors.green;
    const transactionBg =
      type === "material"
        ? colors.purplePale
        : financialDirection === "debit"
          ? colors.redLight
          : colors.greenLight;
    const totalAmount =
      toFiniteNumber(transaction?.summary?.grandTotal) ??
      toFiniteNumber(transaction?.grandTotal) ??
      toFiniteNumber(transaction?.summary?.totalAmount) ??
      toFiniteNumber(transaction?.totalAmount) ??
      toFiniteNumber(transaction?.amount) ??
      0;
    const totalWeight =
      toFiniteNumber(transaction?.summary?.totalWeight) ??
      toFiniteNumber(transaction?.totalWeight) ??
      0;
    const itemCount =
      toFiniteNumber(transaction?.summary?.totalItems) ??
      toFiniteNumber(transaction?.items?.length) ??
      0;
    const transactionTitle =
      type === "financial"
        ? `${transaction.senderPartyName || transaction.senderName || t("sender")} → ${
            transaction.receiverPartyName ||
            transaction.receiverName ||
            t("receiver")
          }`
        : transaction.transactionNo ||
          transaction.orderNumber ||
          transaction.id?.slice(0, 8);
    const transactionSubtitle =
      type === "financial"
        ? transaction.paymentMode || transaction.transactionType || "cash"
        : formatDate(
            transaction.transactionDate ||
              transaction.createdAt ||
              transaction.orderDate,
          );
    const financialCounterparty =
      financialDirection === "credit"
        ? transaction.receiverName
        : transaction.senderName;
    const detailBase =
      type === "material"
        ? "/parties/partiesDigital/transaction/material"
        : "/parties/partiesDigital/transaction/financial";
    const detailRoute =
      `${detailBase}/${transaction.id}?partyId=${partyId}&returnTo=party` as any;

    return (
      <TouchableOpacity
        key={`${type}-${transaction.id}`}
        style={styles.transactionCard}
        activeOpacity={0.8}
        onPress={() => router.push(detailRoute)}
      >
        <div style={webStyle(styles.transactionTopRow)}>
          <div style={webStyle(styles.transactionTitleWrap)}>
            <div
              style={webStyle([
                styles.transactionIconWrap,
                { backgroundColor: transactionBg },
              ])}
            >
              <Ionicons
                name={type === "material" ? "cube" : "cash"}
                size={responsive.icon.md}
                color={transactionColor}
              />
            </div>
            <div style={webStyle(styles.transactionTextWrap)}>
              <span style={webStyle(styles.transactionTitle)}>
                {transactionTitle}
              </span>
              <span style={webStyle(styles.transactionDateText)}>
                {transactionSubtitle}
              </span>
            </div>
          </div>
          <div
            style={webStyle([
              styles.transactionTypeBadge,
              { backgroundColor: transactionBg },
            ])}
          >
            <span
              style={webStyle([styles.transactionTypeText, { color: transactionColor }])}
            >
              {type === "financial"
                ? financialDirection === "credit"
                  ? t("credit")
                  : t("debit")
                : String(
                    transaction.transactionType || transaction.status || type,
                  ).replace(/_/g, " ")}
            </span>
          </div>
        </div>
        {type === "financial" ? (
          <div style={webStyle(styles.transactionStatsRow)}>
            <div style={webStyle(styles.transactionStatChip)}>
              <span style={webStyle(styles.transactionStatLabel)}>
                {t("payment_mode")}
              </span>
              <span style={webStyle(styles.transactionStatValue)}>
                {transaction.paymentMode || "cash"}
              </span>
            </div>
            <div style={webStyle(styles.transactionStatChip)}>
              <span style={webStyle(styles.transactionStatLabel)}>
                {financialDirection === "credit" ? t("receiver") : t("sender")}
              </span>
              <span style={webStyle(styles.transactionStatValue)}>
                {financialCounterparty || t("not_available")}
              </span>
            </div>
            <div style={webStyle(styles.transactionStatChip)}>
              <span style={webStyle(styles.transactionStatLabel)}>{t("amount")}</span>
              <span
                style={webStyle([
                  styles.transactionStatValue,
                  financialDirection === "debit"
                    ? styles.debitAmount
                    : styles.creditAmount,
                ])}>
                {financialDirection === "debit" ? "-" : "+"}₹
                {totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        ) : (
          <div style={webStyle(styles.transactionStatsRow)}>
            <div style={webStyle(styles.transactionStatChip)}>
              <span style={webStyle(styles.transactionStatLabel)}>{t("items")}</span>
              <span style={webStyle(styles.transactionStatValue)}>
                {itemCount}
              </span>
            </div>
            <div style={webStyle(styles.transactionStatChip)}>
              <span style={webStyle(styles.transactionStatLabel)}>{t("weight")}</span>
              <span style={webStyle(styles.transactionStatValue)}>
                {totalWeight.toFixed(3)} kg
              </span>
            </div>
            <div style={webStyle(styles.transactionStatChip)}>
              <span style={webStyle(styles.transactionStatLabel)}>{t("amount")}</span>
              <span
                style={webStyle(styles.transactionStatValue)}>
                ₹{totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrderCard = (order: OrderItem, index: number) => {
    const isOrderCompleted = isCompletedOrderStatus(order.status);
    const isBeingDragged = draggingOrderId === order.id;
    const isDropTarget =
      dragTargetIndex === index &&
      !isOrderCompleted &&
      !isBeingDragged &&
      draggingOrderId !== null;
    const lastReorderableIndex = getLastReorderableIndex(orders);
    const canMoveUp = !isOrderCompleted && index > 0 && !updatingPriority;
    const canMoveDown =
      !isOrderCompleted && index < lastReorderableIndex && !updatingPriority;

    const handlePan = createPanHandlers(order, index, true); // handle icon
    const cardPan = createPanHandlers(order, index, false); // card body

    return (
      <div
        key={order.id}
        style={webStyle([
          styles.orderCard,
          isOrderCompleted && styles.orderCardDisabled,
          isBeingDragged && styles.orderCardDragging,
          isBeingDragged && {
            transform: [{ translateY: dragY }],
            zIndex: 999,
            elevation: 16,
          },
          isDropTarget && styles.orderDropTarget,
        ])}
      >
        <div
          style={webStyle([styles.leftStrip, isOrderCompleted && styles.disabledStrip])}
        >
          {editingOrderId === order.id ? (
            <TextInput
              style={styles.positionInput}
              value={positionInput}
              onChangeText={setPositionInput}
              keyboardType="number-pad"
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              maxLength={3}
              onSubmitEditing={() => commitOrderPosition(order)}
              onBlur={() => commitOrderPosition(order)}
            />
          ) : (
            <TouchableOpacity
              style={[
                styles.positionBadge,
                isOrderCompleted && styles.positionBadgeDisabled,
              ]}
              onPress={() => startEditingOrderPosition(order, index)}
              disabled={
                updatingPriority || !!draggingOrderId || isOrderCompleted
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <span
                style={webStyle([
                  styles.positionText,
                  isOrderCompleted && styles.positionTextDisabled,
                ])}
              >
                {index + 1}
              </span>
            </TouchableOpacity>
          )}

          {/* Arrow Buttons */}
          <div style={webStyle(styles.arrowGroup)}>
            <TouchableOpacity
              style={[styles.arrowBtn, !canMoveUp && styles.arrowBtnDisabled]}
              onPress={() => handleMoveOrder(index, index - 1)}
              disabled={!canMoveUp}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons
                name="chevron-up"
                size={responsive.icon.sm}
                color={canMoveUp ? colors.primary : colors.gray300}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowBtn, !canMoveDown && styles.arrowBtnDisabled]}
              onPress={() => handleMoveOrder(index, index + 1)}
              disabled={!canMoveDown}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons
                name="chevron-down"
                size={responsive.icon.sm}
                color={canMoveDown ? colors.primary : colors.gray300}
              />
            </TouchableOpacity>
          </div>
        </div>

        <TouchableOpacity
          style={[
            styles.orderMainContent,
            isOrderCompleted && styles.orderMainContentDisabled,
          ]}
          activeOpacity={0.75}
          delayLongPress={160}
          onLongPress={(event) =>
            !isOrderCompleted &&
            armOrderDrag(order, index, event.nativeEvent.pageY)
          }
          onPressOut={() => {
            if (
              !isOrderCompleted &&
              dragArmedOrderId.current === order.id &&
              !dragHasMoved.current
            ) {
              cancelDrag();
            }
          }}
          onPress={() => {
            if (isDragging.current || suppressOrderPress.current) {
              suppressOrderPress.current = false;
              return;
            }

            router.push(
              `/parties/partiesDigital/orderDigital/${order.id}?partyId=${partyId}&returnTo=party` as any,
            );
          }}
          {...(!isOrderCompleted ? cardPan.panHandlers : {})}
        >
          {/* Header row */}
          <div style={webStyle(styles.orderCardHeader)}>
            <div style={webStyle(styles.orderHeaderLeft)}>
              <div
                style={webStyle([
                  styles.orderTypeBadge,
                  {
                    backgroundColor:
                      getOrderTypeColor(order.orderType || "") + "20",
                  },
                ])}
              >
                <span
                  style={webStyle([
                    styles.orderTypeText,
                    { color: getOrderTypeColor(order.orderType || "") },
                  ])}
                >
                  {order.orderType || t("order")}
                </span>
              </div>
              <span style={webStyle(styles.orderNumber)}>
                #{order.orderNumber || order.id?.substring(0, 8)}
              </span>
            </div>
            <div
              style={webStyle([
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status || "") + "20" },
              ])}
            >
              <span
                style={webStyle([
                  styles.statusText,
                  { color: getStatusColor(order.status || "") },
                ])}
              >
                {order.status || "pending"}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div style={webStyle(styles.amountContainer)}>
            <span style={webStyle(styles.amountLabel)}>{t("total_amount")}</span>
            <span
              style={webStyle(styles.amountValue)}>
              ₹{getOrderTotal(order).toLocaleString("en-IN")}
            </span>
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <span style={webStyle(styles.itemsText)}>
              {getOrderItemsText(order)}
            </span>
          )}

          {/* Date */}
          {order.createdAt && (
            <div style={webStyle(styles.orderDateRow)}>
              <Ionicons
                name="calendar-outline"
                size={responsive.icon.sm}
                color={colors.gray400}
              />
              <span style={webStyle(styles.orderDate)}>
                {formatDate(order.createdAt)}
              </span>
            </div>
          )}
        </TouchableOpacity>

        {/* ── RIGHT DRAG BUTTON ── */}
        <div
          style={webStyle([
            styles.rightDragStrip,
            isOrderCompleted && styles.disabledStrip,
          ])}
        >
          <div
            style={webStyle([
              styles.dragHandle,
              isOrderCompleted && styles.dragHandleDisabled,
            ])}
            {...(!isOrderCompleted ? handlePan.panHandlers : {})}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="menu"
              size={responsive.icon.md + 2}
              color={
                isOrderCompleted
                  ? colors.gray300
                  : isBeingDragged
                    ? "#fff"
                    : colors.primary
              }
            />
          </div>
        </div>
      </div>
    );
  };

  if (loading && !party) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <span style={webStyle(styles.loadingText)}>{t("loading_party_details")}</span>
      </SafeAreaView>
    );
  }

  if (!party) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={responsive.icon.xl}
          color={colors.red}
        />
        <span style={webStyle(styles.loadingText)}>{t("party_not_found")}</span>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <span style={webStyle(styles.retryBtnText)}>{t("go_back")}</span>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pendingOrders = orders.filter(
    (o) => (o.status || "").toLowerCase() === "pending",
  );
  const inProgressOrders = orders.filter(
    (o) => (o.status || "").toLowerCase() === "in progress",
  );
  const completedOrders = orders.filter(
    (o) => (o.status || "").toLowerCase() === "completed",
  );
  const activeOrderCount = orders.length - completedOrders.length;
  const displayPartyName = party.name || partyUser?.name;
  const displayContactPerson =
    party.contactPerson || party.userName || partyUser?.name;
  const displayPartyPhone = party.mobile || partyUser?.phone;
  const displayPartyEmail = party.email || partyUser?.email;
  const bankInfo = bankDetails || {};
  const hasBankDetails = Boolean(
    bankInfo.accountHolderName ||
    bankInfo.accountNumber ||
    bankInfo.bankName ||
    bankInfo.branchName ||
    bankInfo.ifscCode ||
    bankInfo.accountType,
  );
  const balanceValue = Number(
    partyUser?.balance ??
      party.currentBalance ??
      party.balance ??
      party.openingBalance ??
      0,
  );
  const balanceType =
    party.balanceType || (balanceValue >= 0 ? "Credit" : "Debit");

  return (
    <div style={webStyle(styles.container)}>
      {/* Header */}
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={responsive.icon.md + 4}
            color="#fff"
          />
        </TouchableOpacity>
        <span style={webStyle(styles.headerTitle)}>
          {t("party_details")}
        </span>
        <TouchableOpacity
          onPress={() => router.push(`/parties/edit/${partyId}` as any)}
          style={styles.editHeaderBtn}
        >
          <Ionicons
            name="create-outline"
            size={responsive.icon.md + 2}
            color="#fff"
          />
        </TouchableOpacity>
      </div>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        scrollEnabled={!draggingOrderId}
        scrollEventThrottle={16}
        onLayout={(event) => {
          scrollViewHeight.current = event.nativeEvent.layout.height;
          measureScrollView();
        }}
        onScroll={(e) => {
          scrollOffset.current = e.nativeEvent.contentOffset.y;
        }}
        onContentSizeChange={(_width, height) => {
          contentHeight.current = height;
        }}
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
        {/* Party Info Card */}
        <div style={webStyle(styles.partyInfoCard)}>
          <div style={webStyle(styles.partyHeader)}>
            <div style={webStyle(styles.partyIconCircle)}>
              <Ionicons
                name="person"
                size={responsive.icon.lg}
                color={colors.primary}
              />
            </div>
            <div style={webStyle(styles.partyMainInfo)}>
              <span style={webStyle(styles.partyName)}>
                {displayPartyName}
              </span>
              <div style={webStyle(styles.partyMeta)}>
                <div style={webStyle(styles.partyTypeBadge)}>
                  <span style={webStyle(styles.partyTypeText)}>
                    {party.partyType || party.partyTypeId || t("party")}
                  </span>
                </div>
                <div
                  style={webStyle([
                    styles.activeBadge,
                    party.isActive === false && styles.inactiveBadge,
                  ])}
                >
                  <Ionicons
                    name="ellipse"
                    size={responsive.isXs ? 6 : 8}
                    color={party.isActive === false ? colors.red : colors.green}
                  />
                  <span
                    style={webStyle([
                      styles.activeText,
                      party.isActive === false && styles.inactiveText,
                    ])}
                  >
                    {party.isActive === false ? "Inactive" : t("active")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={webStyle(styles.infoColumns)}>
            {/* Contact Information */}
            <div
              style={webStyle([
                styles.contactInfo,
                {
                  flex: 1,
                },
              ])}
            >
              {displayContactPerson && (
                <div style={webStyle(styles.contactItem)}>
                  <Ionicons
                    name="person-outline"
                    size={responsive.icon.md}
                    color={colors.gray500}
                  />
                  <span style={webStyle(styles.contactText)}>
                    Contact: {displayContactPerson}
                  </span>
                </div>
              )}

              {displayPartyPhone && (
                <div style={webStyle(styles.contactItem)}>
                  <Ionicons
                    name="call-outline"
                    size={responsive.icon.md}
                    color={colors.gray500}
                  />
                  <span style={webStyle(styles.contactText)}>
                    {displayPartyPhone}
                  </span>
                </div>
              )}

              {displayPartyEmail && (
                <div style={webStyle(styles.contactItem)}>
                  <Ionicons
                    name="mail-outline"
                    size={responsive.icon.md}
                    color={colors.gray500}
                  />
                  <span style={webStyle(styles.contactText)}>
                    {displayPartyEmail}
                  </span>
                </div>
              )}

              {party.address && (
                <div style={webStyle(styles.contactItem)}>
                  <Ionicons
                    name="location-outline"
                    size={responsive.icon.md}
                    color={colors.gray500}
                  />
                  <span style={webStyle(styles.contactText)}>
                    {party.address}
                  </span>
                </div>
              )}

              {party.gstNumber && (
                <div style={webStyle(styles.contactItem)}>
                  <Ionicons
                    name="document-text-outline"
                    size={responsive.icon.md}
                    color={colors.gray500}
                  />
                  <span style={webStyle(styles.contactText)}>
                    {t("gst")}: {party.gstNumber}
                  </span>
                </div>
              )}

              {party.panNumber && (
                <div style={webStyle(styles.contactItem)}>
                  <Ionicons
                    name="card-outline"
                    size={responsive.icon.md}
                    color={colors.gray500}
                  />
                  <span style={webStyle(styles.contactText)}>
                    PAN: {party.panNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Bank Details */}
            {hasBankDetails && (
              <div
                style={webStyle([
                  styles.bankInfo,
                  {
                    flex: 1,
                  },
                ])}
              >
                <span style={webStyle(styles.detailSectionTitle)}>Bank Details</span>

                {bankInfo.accountHolderName && (
                  <div style={webStyle(styles.contactItem)}>
                    <Ionicons
                      name="person-circle-outline"
                      size={responsive.icon.md}
                      color={colors.gray500}
                    />
                    <span style={webStyle(styles.contactText)}>
                      {bankInfo.accountHolderName}
                    </span>
                  </div>
                )}

                {bankInfo.accountNumber && (
                  <div style={webStyle(styles.contactItem)}>
                    <Ionicons
                      name="card-outline"
                      size={responsive.icon.md}
                      color={colors.gray500}
                    />
                    <span style={webStyle(styles.contactText)}>
                      A/C: {bankInfo.accountNumber}
                    </span>
                  </div>
                )}

                {bankInfo.bankName && (
                  <div style={webStyle(styles.contactItem)}>
                    <Ionicons
                      name="business-outline"
                      size={responsive.icon.md}
                      color={colors.gray500}
                    />
                    <span style={webStyle(styles.contactText)}>
                      {bankInfo.bankName}
                    </span>
                  </div>
                )}

                {bankInfo.branchName && (
                  <div style={webStyle(styles.contactItem)}>
                    <Ionicons
                      name="git-branch-outline"
                      size={responsive.icon.md}
                      color={colors.gray500}
                    />
                    <span style={webStyle(styles.contactText)}>
                      {bankInfo.branchName}
                    </span>
                  </div>
                )}

                {(bankInfo.ifscCode || bankInfo.accountType) && (
                  <div style={webStyle(styles.contactItem)}>
                    <Ionicons
                      name="information-circle-outline"
                      size={responsive.icon.md}
                      color={colors.gray500}
                    />
                    <span style={webStyle(styles.contactText)}>
                      {[bankInfo.ifscCode, bankInfo.accountType]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={webStyle(styles.balanceCard)}>
            <div style={webStyle(styles.balanceInfo)}>
              <span style={webStyle(styles.balanceLabel)}>{t("current_balance")}</span>
              <span
                style={webStyle([
                  styles.balanceAmount,
                  balanceValue >= 0 ? styles.creditAmount : styles.debitAmount,
                ])}>
                {formatBalance(balanceValue, balanceType)}
              </span>
            </div>
            <div style={webStyle(styles.statsRow)}>
              <div style={webStyle(styles.statItem)}>
                <span style={webStyle(styles.statValue)}>
                  {orders.length}
                </span>
                <span style={webStyle(styles.statLabel)}>{t("orders")}</span>
              </div>
              <div style={webStyle(styles.statDivider)} />
              <div style={webStyle(styles.statItem)}>
                <span
                  style={webStyle(styles.statValue)}>
                  ₹
                  {orders
                    .reduce((s, o) => s + getOrderTotal(o), 0)
                    .toLocaleString("en-IN")}
                </span>
                <span style={webStyle(styles.statLabel)}>{t("total_value")}</span>
              </div>
              <div style={webStyle(styles.statDivider)} />
              <div style={webStyle(styles.statItem)}>
                <span style={webStyle(styles.statValue)}>
                  {pendingOrders.length}
                </span>
                <span style={webStyle(styles.statLabel)}>{t("pending")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={webStyle(styles.tabContainer)}>
          {(
            [
              {
                key: "orders" as TabType,
                label: `${t("orders")} (${orders.length})`,
                icon: "list" as const,
              },
              {
                key: "material" as TabType,
                label: `${t("material")} (${materialTransactions.length})`,
                icon: "cube" as const,
              },
              {
                key: "financial" as TabType,
                label: `${t("financial")} (${financialTransactions.length})`,
                icon: "cash" as const,
              },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={responsive.icon.md}
                color={activeTab === tab.key ? colors.primary : colors.gray500}
              />
              <span
                style={webStyle([
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ])}>
                {tab.label}
              </span>
            </TouchableOpacity>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <div style={webStyle(styles.tabContent)}>
            {updatingPriority && (
              <div style={webStyle(styles.priorityUpdateBanner)}>
                <ActivityIndicator size="small" color={colors.primary} />
                <span style={webStyle(styles.priorityUpdateText)}>
                  {t("updating_priority")}
                </span>
              </div>
            )}

            {ordersLoading ? (
              <div style={webStyle(styles.tabLoadingContainer)}>
                <ActivityIndicator size="small" color={colors.primary} />
                <span style={webStyle(styles.tabLoadingText)}>{t("loading_orders")}</span>
              </div>
            ) : orders.length === 0 ? (
              <div style={webStyle(styles.emptyTabContainer)}>
                <Ionicons
                  name="document-text-outline"
                  size={responsive.icon.xl}
                  color={colors.gray300}
                />
                <span style={webStyle(styles.emptyTabTitle)}>{t("no_orders_yet")}</span>
                <span style={webStyle(styles.emptyTabDescription)}>
                  {t("create_first_order_for", { partyName: party.name })}
                </span>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() =>
                    router.push(
                      `/orders/add?partyId=${partyId}&returnTo=party` as any,
                    )
                  }
                >
                  <Ionicons name="add" size={responsive.icon.md} color="#fff" />
                  <span style={webStyle(styles.createButtonText)}>
                    {t("create_order")}
                  </span>
                </TouchableOpacity>
              </div>
            ) : (
              <>
                {/* Status summary */}
                <div style={webStyle(styles.orderStatusSummary)}>
                  <div
                    style={webStyle([
                      styles.statusSummaryItem,
                      { backgroundColor: colors.gray100 },
                    ])}
                  >
                    <Ionicons
                      name="time"
                      size={responsive.icon.sm}
                      color={colors.gray500}
                    />
                    <span style={webStyle(styles.statusSummaryText)}>
                      {pendingOrders.length}
                    </span>
                    <span style={webStyle(styles.statusSummaryLabel)}>
                      {t("pending")}
                    </span>
                  </div>
                  <div
                    style={webStyle([
                      styles.statusSummaryItem,
                      { backgroundColor: colors.yellowLight },
                    ])}
                  >
                    <Ionicons
                      name="timer"
                      size={responsive.icon.sm}
                      color={colors.yellow}
                    />
                    <span style={webStyle(styles.statusSummaryText)}>
                      {inProgressOrders.length}
                    </span>
                    <span style={webStyle(styles.statusSummaryLabel)}>
                      {t("in_progress")}
                    </span>
                  </div>
                  <div
                    style={webStyle([
                      styles.statusSummaryItem,
                      { backgroundColor: colors.greenLight },
                    ])}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={responsive.icon.sm}
                      color={colors.green}
                    />
                    <span style={webStyle(styles.statusSummaryText)}>
                      {completedOrders.length}
                    </span>
                    <span style={webStyle(styles.statusSummaryLabel)}>
                      {t("completed")}
                    </span>
                  </div>
                </div>

                {/* Drag hint */}
                {activeOrderCount > 1 && (
                  <div style={webStyle(styles.dragHint)}>
                    <Ionicons
                      name="menu"
                      size={responsive.icon.sm}
                      color={colors.primary}
                    />
                    <span style={webStyle(styles.dragHintText)}>
                      {t("use_arrows_to_reorder_priority")}
                    </span>
                  </div>
                )}

                {orders.map((order, index) => renderOrderCard(order, index))}
              </>
            )}
          </div>
        )}

        {/* ── MATERIAL TAB ── */}
        {activeTab === "material" && (
          <div style={webStyle(styles.tabContent)}>
            {materialTransactions.length === 0 ? (
              <div style={webStyle(styles.emptyTabContainer)}>
                <Ionicons
                  name="cube-outline"
                  size={responsive.icon.xl}
                  color={colors.gray300}
                />
                <span style={webStyle(styles.emptyTabTitle)}>
                  {t("no_material_transactions")}
                </span>
                <span style={webStyle(styles.emptyTabDescription)}>
                  {t("material_transactions_empty_desc")}
                </span>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() =>
                    router.push(
                      `/material-transaction/add?partyId=${partyId}&returnTo=party` as any,
                    )
                  }
                >
                  <Ionicons name="add" size={responsive.icon.md} color="#fff" />
                  <span style={webStyle(styles.createButtonText)}>
                    {t("create_material_transaction")}
                  </span>
                </TouchableOpacity>
              </div>
            ) : (
              materialTransactions.map((t) =>
                renderTransactionCard(t, "material"),
              )
            )}
          </div>
        )}

        {/* ── FINANCIAL TAB ── */}
        {activeTab === "financial" && (
          <div style={webStyle(styles.tabContent)}>
            {financialTransactions.length === 0 ? (
              <div style={webStyle(styles.emptyTabContainer)}>
                <Ionicons
                  name="cash-outline"
                  size={responsive.icon.xl}
                  color={colors.gray300}
                />
                <span style={webStyle(styles.emptyTabTitle)}>
                  {t("no_financial_transactions")}
                </span>
                <span style={webStyle(styles.emptyTabDescription)}>
                  {t("financial_transactions_empty_desc")}
                </span>
              </div>
            ) : (
              financialTransactions.map((t) =>
                renderTransactionCard(t, "financial"),
              )
            )}
          </div>
        )}

        <div style={webStyle({ height: 100 })} />
      </ScrollView>

      {/* FAB */}
      <div style={webStyle(styles.fabRow)}>
        {activeTab === "orders" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() =>
              router.push(
                `/orders/add?partyId=${partyId}&returnTo=party` as any,
              )
            }
            disabled={updatingPriority}
          >
            <Ionicons name="add" size={responsive.icon.lg} color="#fff" />
          </TouchableOpacity>
        )}
        {activeTab === "material" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() =>
              router.push(
                `/material-transaction/add?partyId=${partyId}&returnTo=party` as any,
              )
            }
          >
            <Ionicons name="add" size={responsive.icon.lg} color="#fff" />
          </TouchableOpacity>
        )}
        {activeTab === "financial" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() =>
              router.push(
                `/financial-transaction/add?partyId=${partyId}&returnTo=party` as any,
              )
            }
          >
            <Ionicons name="add" size={responsive.icon.lg} color="#fff" />
          </TouchableOpacity>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const makeStyles = (r: ResponsiveMetrics) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    loadingText: {
      fontSize: r.font.lg,
      color: colors.gray500,
      marginTop: r.space,
    },
    retryBtn: {
      marginTop: r.cardPadding,
      backgroundColor: colors.primary,
      paddingHorizontal: r.isXs ? 18 : 24,
      paddingVertical: r.isXs ? 10 : 12,
      borderRadius: r.radius,
    },
    retryBtnText: {
      color: "#fff",
      fontWeight: "600" as const,
      fontSize: r.font.lg,
    },

    // Layout
    scrollContainer: { flex: 1 },

    // Header
    header: {
      backgroundColor: colors.primary,
      paddingTop: r.isMd ? 56 : r.isXs ? 38 : 46,
      paddingBottom: r.isXs ? 12 : 16,
      paddingHorizontal: r.space,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: r.isMd ? 28 : 22,
    },
    backButton: {
      padding: r.isXs ? 5 : 6,
      borderRadius: r.radius,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    editHeaderBtn: {
      padding: r.isXs ? 5 : 6,
      borderRadius: r.radius,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    headerTitle: {
      fontSize: r.isXs ? r.font.lg : r.font.xl,
      fontWeight: "bold" as const,
      color: "#fff",
      flex: 1,
      textAlign: "center",
      marginHorizontal: 8,
    },

    // Party Info
    partyInfoCard: {
      backgroundColor: "rgba(255,255,255,0.78)",
      margin: r.space,
      borderRadius: r.isMd ? 24 : 18,
      padding: r.cardPadding,
      borderWidth: 1,
      borderColor: "rgba(226,232,240,0.9)",
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.08,
      shadowRadius: 26,
      elevation: 5,
    },
    partyHeader: {
      flexDirection: r.isXs ? "column" : "row",
      alignItems: r.isXs ? "flex-start" : "center",
      marginBottom: r.cardPadding,
      gap: r.isXs ? 10 : 0,
    },
    partyIconCircle: {
      width: r.isXs ? 48 : r.isSm ? 54 : 60,
      height: r.isXs ? 48 : r.isSm ? 54 : 60,
      borderRadius: r.isXs ? 24 : r.isSm ? 27 : 30,
      backgroundColor: colors.purplePale,
      alignItems: "center",
      justifyContent: "center",
      marginRight: r.isXs ? 0 : r.cardPadding,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    partyMainInfo: { flex: 1 },
    partyName: {
      fontSize: r.isXs ? r.font.lg : r.font.xl,
      fontWeight: "bold" as const,
      color: colors.text,
      marginBottom: 6,
      lineHeight: r.isXs ? 22 : 26,
    },
    partyMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: r.isXs ? 6 : 8,
      flexWrap: "wrap",
    },
    infoColumns: {
      flexDirection: r.isMd ? "row" : "column",
      width: "100%",
      gap: r.isMd ? 16 : 0,
    },
    partyTypeBadge: {
      backgroundColor: colors.purplePale,
      paddingHorizontal: r.isXs ? 9 : 12,
      paddingVertical: 4,
      borderRadius: r.radius,
    },
    partyTypeText: {
      fontSize: r.font.sm,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.greenLight,
      paddingHorizontal: r.isXs ? 7 : 8,
      paddingVertical: 4,
      borderRadius: r.radius,
    },
    activeText: {
      fontSize: r.font.sm,
      fontWeight: "600" as const,
      color: colors.green,
    },
    inactiveBadge: {
      backgroundColor: colors.redLight,
    },
    inactiveText: {
      color: colors.red,
    },
    contactInfo: {
      gap: r.isXs ? 8 : 10,
      marginBottom: r.cardPadding,
      paddingBottom: r.cardPadding,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: r.isXs ? 8 : 12,
    },
    contactText: {
      fontSize: r.isXs ? r.font.sm : r.font.md,
      color: colors.gray600,
      flex: 1,
      lineHeight: r.isXs ? 17 : 20,
    },
    bankInfo: {
      gap: r.isXs ? 8 : 10,
      marginBottom: r.cardPadding,
      paddingBottom: r.cardPadding,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    detailSectionTitle: {
      fontSize: r.font.md,
      color: colors.text,
      fontWeight: "700" as const,
      marginBottom: 2,
    },

    // Balance
    balanceCard: {
      backgroundColor: "rgba(248,250,252,0.86)",
      borderRadius: r.isMd ? 20 : 16,
      padding: r.isXs ? 12 : 16,
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    balanceInfo: {
      flexDirection: r.isXs ? "column" : "row",
      justifyContent: "space-between",
      alignItems: r.isXs ? "flex-start" : "center",
      marginBottom: r.isXs ? 12 : 16,
      gap: r.isXs ? 4 : 0,
    },
    balanceLabel: {
      fontSize: r.font.md,
      color: colors.gray500,
      fontWeight: "500" as const,
    },
    balanceAmount: {
      fontSize: r.isXs ? r.font.xl : r.font.xxl,
      fontWeight: "bold" as const,
      maxWidth: "100%",
    },
    creditAmount: { color: colors.green },
    debitAmount: { color: colors.red },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.9)",
      borderRadius: 16,
      padding: r.isXs ? 6 : 8,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: r.isXs ? 6 : 8,
    },
    statValue: {
      fontSize: r.isXs ? r.font.md : r.font.lg,
      fontWeight: "bold" as const,
      color: colors.text,
      marginBottom: 4,
      maxWidth: "100%",
    },
    statLabel: {
      fontSize: r.isXs ? r.font.xs : r.font.sm,
      color: colors.gray500,
      textAlign: "center",
    },
    statDivider: {
      width: 1,
      height: r.isXs ? 26 : 32,
      backgroundColor: colors.gray200,
    },

    // Tabs
    tabContainer: {
      flexDirection: "row",
      backgroundColor: "#fff",
      marginHorizontal: r.space,
      marginBottom: r.space,
      borderRadius: r.radius,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.gray100,
    },
    tab: {
      flex: 1,
      flexDirection: r.isXs ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: r.isXs ? 2 : 4,
      paddingVertical: r.isXs ? 9 : 12,
      paddingHorizontal: r.isXs ? 3 : 6,
      borderRadius: 8,
    },
    activeTab: { backgroundColor: colors.purplePale },
    tabText: {
      fontSize: r.isXs ? 9 : 12,
      fontWeight: "600" as const,
      color: colors.gray500,
      textAlign: "center",
      maxWidth: "100%",
    },
    activeTabText: { color: colors.primary },
    tabContent: { paddingHorizontal: r.space, paddingBottom: r.cardPadding },
    tabLoadingContainer: {
      alignItems: "center",
      paddingVertical: r.isXs ? 28 : 40,
    },
    tabLoadingText: {
      fontSize: r.font.md,
      color: colors.gray500,
      marginTop: 8,
    },

    // Priority update banner
    priorityUpdateBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: r.isXs ? 6 : 8,
      padding: r.isXs ? 8 : 10,
      backgroundColor: colors.purplePale,
      borderRadius: 8,
      marginBottom: 12,
    },
    priorityUpdateText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "500" as const,
    },

    // Drag hint
    dragHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      marginBottom: 12,
      backgroundColor: colors.purplePale,
      borderRadius: 8,
    },
    dragHintText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "500" as const,
    },

    // Status summary
    orderStatusSummary: {
      flexDirection: "row",
      gap: r.isXs ? 6 : 8,
      marginBottom: r.space,
    },
    statusSummaryItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: r.isXs ? 4 : 6,
      paddingHorizontal: r.isXs ? 6 : 8,
      paddingVertical: r.isXs ? 8 : 10,
      borderRadius: 10,
    },
    statusSummaryText: {
      fontSize: r.font.lg,
      fontWeight: "700" as const,
      color: colors.text,
    },
    statusSummaryLabel: { fontSize: r.font.xs, color: colors.gray500 },

    // ── ORDER CARD ──────────────────────────────────────────────────────────
    orderCard: {
      backgroundColor: "#fff",
      borderRadius: r.radius,
      marginBottom: r.isXs ? 10 : 12,
      borderWidth: 1,
      borderColor: colors.gray100,
      overflow: "hidden",
      flexDirection: "row",
    },
    orderCardDisabled: {
      backgroundColor: colors.gray50,
    },
    orderCardDragging: {
      borderColor: colors.primary,
      borderWidth: 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 16,
    },
    orderDropTarget: {
      borderColor: colors.primary,
      borderWidth: 2,
      borderStyle: "dashed",
      backgroundColor: colors.purplePale + "30",
    },

    // Left strip (position editor + arrows)
    leftStrip: {
      width: r.isXs ? 46 : 54,
      backgroundColor: colors.gray50,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingVertical: r.isXs ? 10 : 12,
      borderRightWidth: 1,
      borderRightColor: colors.gray100,
      gap: 6,
    },

    rightDragStrip: {
      width: r.isXs ? 42 : 48,
      backgroundColor: colors.gray50,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingVertical: r.isXs ? 10 : 12,
      borderLeftWidth: 1,
      borderLeftColor: colors.gray100,
    },
    disabledStrip: {
      backgroundColor: colors.gray100,
    },

    // Drag handle — the primary drag trigger (right side)
    dragHandle: {
      width: r.isXs ? 34 : 38,
      height: r.isXs ? 34 : 38,
      borderRadius: 10,
      backgroundColor: colors.purplePale,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dragHandleDisabled: {
      backgroundColor: colors.gray100,
      borderColor: colors.gray200,
    },

    positionBadge: {
      backgroundColor: colors.primary,
      width: r.isXs ? 26 : 30,
      height: r.isXs ? 26 : 30,
      borderRadius: r.isXs ? 13 : 15,
      alignItems: "center",
      justifyContent: "center",
    },
    positionBadgeDisabled: {
      backgroundColor: colors.gray200,
    },
    positionText: {
      color: "#fff",
      fontSize: r.font.xs,
      fontWeight: "700" as const,
    },
    positionTextDisabled: { color: colors.gray500 },
    positionInput: {
      width: r.isXs ? 30 : 34,
      height: r.isXs ? 28 : 32,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.white,
      color: colors.primary,
      fontSize: r.font.sm,
      fontWeight: "700" as const,
      padding: 0,
      textAlign: "center",
    },

    arrowGroup: { gap: 4 },
    arrowBtn: {
      width: r.isXs ? 28 : 32,
      height: r.isXs ? 28 : 32,
      borderRadius: 8,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.gray200,
    },
    arrowBtnDisabled: {
      backgroundColor: colors.gray50,
      borderColor: colors.gray100,
    },

    // Main content (right side of card)
    orderMainContent: { flex: 1, padding: r.isXs ? 12 : 14 },
    orderMainContentDisabled: { backgroundColor: colors.gray50 },

    orderCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    orderHeaderLeft: { flex: 1, marginRight: 8 },
    orderTypeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 4,
    },
    orderTypeText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      textTransform: "capitalize" as const,
    },
    orderNumber: {
      fontSize: r.isXs ? r.font.lg : r.font.xl,
      fontWeight: "bold" as const,
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600" as const,
      textTransform: "capitalize" as const,
    },

    amountContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    amountLabel: { fontSize: 12, color: colors.gray500 },
    amountValue: {
      fontSize: r.isXs ? r.font.lg : r.font.xl,
      fontWeight: "bold" as const,
      color: colors.text,
      maxWidth: "55%",
      textAlign: "right",
    },
    itemsText: { fontSize: r.font.sm, color: colors.gray500, marginBottom: 8 },
    orderDateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    orderDate: { fontSize: 12, color: colors.gray400 },

    // Empty states
    emptyTabContainer: {
      alignItems: "center",
      paddingVertical: r.isXs ? 36 : 50,
    },
    emptyTabTitle: {
      fontSize: r.font.xl,
      fontWeight: "bold" as const,
      color: colors.gray500,
      marginTop: 16,
    },
    emptyTabDescription: {
      fontSize: r.font.md,
      color: colors.gray400,
      marginTop: 4,
      textAlign: "center",
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: r.isXs ? 16 : 20,
      paddingVertical: r.isXs ? 10 : 12,
      borderRadius: r.radius,
      marginTop: 20,
    },
    createButtonText: {
      color: "#fff",
      fontSize: r.font.md,
      fontWeight: "600" as const,
    },

    // Transaction cards
    transactionCard: {
      backgroundColor: colors.white,
      borderRadius: r.radius,
      borderWidth: 1,
      borderColor: colors.gray200,
      padding: r.isXs ? 12 : 14,
      marginBottom: r.isXs ? 10 : 12,
      gap: r.isXs ? 10 : 12,
    },
    transactionTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: r.isXs ? 8 : 12,
      flexWrap: "wrap",
    },
    transactionTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: r.isXs ? 8 : 12,
      flex: 1,
      minWidth: 0,
    },
    transactionIconWrap: {
      width: r.isXs ? 30 : 34,
      height: r.isXs ? 30 : 34,
      borderRadius: r.radius,
      alignItems: "center",
      justifyContent: "center",
    },
    transactionTitle: {
      fontSize: r.isXs ? r.font.sm : r.font.md,
      fontWeight: "700" as const,
      color: colors.gray900,
    },
    transactionTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    transactionDateText: {
      fontSize: r.isXs ? r.font.xs : r.font.sm,
      color: colors.gray500,
      marginTop: 2,
    },
    transactionTypeBadge: {
      paddingHorizontal: r.isXs ? 8 : 10,
      paddingVertical: r.isXs ? 5 : 7,
      borderRadius: 10,
      maxWidth: r.isXs ? 96 : 130,
    },
    transactionTypeText: {
      fontSize: r.isXs ? 10 : 11,
      fontWeight: "700" as const,
      textTransform: "capitalize",
    },
    transactionStatsRow: {
      flexDirection: r.isXs ? "column" : "row",
      gap: r.isXs ? 8 : 10,
    },
    transactionStatChip: {
      flex: 1,
      backgroundColor: colors.gray50,
      borderRadius: r.radius,
      padding: r.isXs ? 8 : 10,
    },
    transactionStatLabel: {
      fontSize: r.font.xs,
      color: colors.gray500,
      marginBottom: 4,
    },
    transactionStatValue: {
      fontSize: r.isXs ? r.font.xs : r.font.sm,
      fontWeight: "700" as const,
      color: colors.gray900,
      maxWidth: "100%",
    },

    // FAB
    fabRow: {
      position: "absolute",
      bottom: r.isXs ? 14 : 20,
      right: r.isXs ? 14 : 20,
      flexDirection: "row",
      gap: 12,
    },
    fab: {
      width: r.isXs ? 50 : 60,
      height: r.isXs ? 50 : 60,
      borderRadius: r.isXs ? 25 : 30,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  });
