import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  webStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  ChevronLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Scale,
  Banknote,
  Layers,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Droplets,
  Package2,
  Download,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { colors } from "@/colors";
import SkeletonLoader from "@/components/SkeletonLoader";
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
import { formatDateValue } from "@/utils/date";
import { getDeviceMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";
import { downloadTransactionPdf } from "@/utils/transactionPdf";
import { extractArrayPayload, extractEntityPayload } from "@/utils/response";

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
  deliveredQty?: number;
  pendingQty?: number;
  quantity?: number;
  metalId?: string;
  kg?: number;
  gram?: number;
}

interface GstData {
  includeGst: boolean;
  gstType: "cgst_sgst" | "igst";
  gstRate: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

interface Order {
  id: string;
  orderType: string;
  orderId?: string;
  orderNumber?: string;
  priority?: string;
  rateMode?: "fixed" | "unfixed";
  globalRate?: number;
  partyId?: string;
  partyName?: string;
  orderDate: string;
  items: OrderItem[];
  totalWeight: number;
  totalAmount: number;
  gst?: GstData;
  grandTotal?: number;
  status?: string;
  note?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Party {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  partyType?: string;
  partyTypeName?: string;
  address?: string;
  gstNumber?: string;
  contactPerson?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; label: string; icon: string }
> = {
  completed: {
    bg: "#DCFCE7",
    text: "#15803D",
    dot: "#22C55E",
    label: "Completed",
    icon: "checkmark-circle",
  },
  pending: {
    bg: "#FEF9C3",
    text: "#A16207",
    dot: "#EAB308",
    label: "Pending",
    icon: "time",
  },
  cancelled: {
    bg: "#FEE2E2",
    text: "#DC2626",
    dot: "#EF4444",
    label: "Cancelled",
    icon: "close-circle",
  },
  processing: {
    bg: colors.primaryPale,
    text: colors.primaryDark,
    dot: colors.primary,
    label: "Processing",
    icon: "sync",
  },
  "in progress": {
    bg: colors.primaryPale,
    text: colors.primaryDark,
    dot: colors.primary,
    label: "In Progress",
    icon: "sync",
  },
};

const getStatusTheme = (status?: string) => {
  return (
    STATUS_CONFIG[status?.toLowerCase() || ""] || {
      bg: colors.gray100,
      text: colors.gray600,
      dot: colors.gray400,
      label: status || "Pending",
      icon: "time",
    }
  );
};

const responsive = getDeviceMetrics();
const headerIconSize = responsive.icon.md;
const badgeIconSize = responsive.icon.sm;
const rowIconSize = responsive.icon.sm;
const itemIconSize = responsive.icon.sm;
const statusBannerIconSize = responsive.isXs ? 18 : 20;

export default function OrderDetailPage() {
  const router = useRouter();
  const { id, partyId, returnTo } = useLocalSearchParams<{
    id: string;
    partyId?: string;
    returnTo?: string;
  }>();
  const { t } = useLanguage();
  const sessionUser = useAuthStore((state) => state.session?.user);
  const { isAdmin, isInternalUser, isParty } = getAccessFlags(
    sessionUser?.role,
  );
  const sessionPartyId = extractPartyId(sessionUser);
  const sessionUserId = extractUserId(sessionUser);

  const [order, setOrder] = useState<Order | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [metalTypes, setMetalTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const returnPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : returnTo === "transaction"
        ? ("/transaction" as any)
        : ("/orders" as any);
  const editQuery =
    returnTo === "party" && partyId
      ? `?partyId=${partyId}&returnTo=party`
      : returnTo
        ? `?returnTo=${returnTo}`
        : "";

  const fetchParty = useCallback(async (partyId: string) => {
    try {
      const res = await PartyService.fetchPartyWithBankDetails(partyId);
      if (res?.success && res.data) {
        setParty(PartyService.extractParty(res));
      }
    } catch (error) {
      console.error("[OrderDetail] Party fetch error:", error);
    }
  }, []);

  const fetchMetals = useCallback(async () => {
    try {
      const res = await MaterialService.fetchAllMaterial({
        params: { limit: 100 },
      });
      if (res?.success) {
        const data = extractArrayPayload<any>(res, ["materials"]);
        setMetalTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("[OrderDetail] Metals fetch error:", error);
    }
  }, []);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await OrderService.fetchOrderById(id);
      const orderData = extractEntityPayload<Order>(res);
      console.log("[OrderDetail] Fetched order:", orderData?.id);
      if (res?.success && orderData) {
        const ownerUserId = extractOrderOwnerUserId(orderData);
        const canAccessOrder =
          isAdmin ||
          (isParty &&
            !!sessionPartyId &&
            orderData.partyId === sessionPartyId) ||
          (isInternalUser &&
            !!sessionUserId &&
            (!ownerUserId || ownerUserId === sessionUserId));

        if (!canAccessOrder) {
          Toast.show({
            type: "error",
            text1: "Access denied",
            text2: "You can only view allowed orders",
          });
          router.replace("/orders");
          return;
        }

        setOrder(orderData);
        if (orderData.partyId) {
          fetchParty(orderData.partyId);
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Order not found",
          text2: res?.message || "Please try again",
        });
      }
    } catch (error: any) {
      console.error("[OrderDetail] Error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load order",
        text2: error?.message || "Check your connection",
      });
    } finally {
      setLoading(false);
    }
  }, [
    id,
    isAdmin,
    isInternalUser,
    isParty,
    fetchParty,
    router,
    sessionPartyId,
    sessionUserId,
  ]);

  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchMetals();
    }
  }, [id, fetchMetals, fetchOrder]);

  const getMetalName = useCallback(
    (metalId?: string) => {
      if (!metalId) return "Unknown Metal";
      return (
        metalTypes.find((m: any) => m.id === metalId)?.name || "Unknown Metal"
      );
    },
    [metalTypes],
  );

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (value?: any) =>
    formatDateValue(value, "dd MMM yyyy, hh:mm a", "N/A");

  const formatShortDate = (value?: any) =>
    formatDateValue(value, "dd MMM yyyy", "N/A");

  const formatPriority = (priority?: string) => {
    if (!priority) return "High";
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getRateModeLabel = (rateMode?: string) => {
    return rateMode === "unfixed" ? "Unfixed" : "Fixed";
  };

  const isCompleted =
    (order?.status || "").toLowerCase() === "completed" ||
    (order?.status || "").toLowerCase() === "cancelled";

  const handleDownloadPdf = useCallback(async () => {
    if (!order) return;

    try {
      setGeneratingPdf(true);
      await downloadTransactionPdf({
        kind: "order",
        record: order,
        party,
        user: sessionUser,
      });
    } catch (error) {
      console.error("[OrderDetail] PDF error:", error);
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: t("failed_to_generate_pdf"),
      });
    } finally {
      setGeneratingPdf(false);
    }
  }, [order, party, sessionUser, t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace(returnPath)}
          >
            <ChevronLeft size={headerIconSize} color={colors.white} />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>{t("order_details")}</span>
          <div style={webStyle(styles.headerRight)} />
        </div>
        <SkeletonLoader rows={5} style={styles.loadingSkeleton} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace(returnPath)}
          >
            <ChevronLeft size={headerIconSize} color={colors.white} />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>{t("order_details")}</span>
          <div style={webStyle(styles.headerRight)} />
        </div>
        <div style={webStyle(styles.errorWrap)}>
          <div style={webStyle(styles.errorIconCircle)}>
            <Ionicons name="receipt-outline" size={40} color={colors.gray300} />
          </div>
          <span style={webStyle(styles.errorTitle)}>
            {t("order_not_found")}
          </span>
          <span style={webStyle(styles.errorSub)}>
            This order may have been removed or does not exist.
          </span>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => router.replace(returnPath)}
          >
            <span style={webStyle(styles.errorBtnText)}>{t("go_back")}</span>
          </TouchableOpacity>
        </div>
        <Toast />
      </SafeAreaView>
    );
  }

  const isPurchase = order.orderType === "purchase";
  const statusTheme = getStatusTheme(order.status);
  const partyName = party?.name || order.partyName || "Unknown Party";
  const partyInitial = partyName.charAt(0).toUpperCase();
  const subtotal = Number(order.totalAmount || 0);
  const grandTotal = Number(order.grandTotal || order.totalAmount || 0);
  const hasGst = !!order.gst?.includeGst;
  const rateModeLabel = getRateModeLabel(order.rateMode);

  return (
    <SafeAreaView style={styles.container}>
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace(returnPath)}
          testID="order-detail-back"
        >
          <ChevronLeft size={headerIconSize} color={colors.white} />
        </TouchableOpacity>
        <span style={webStyle(styles.headerTitle)}>{t("order_details")}</span>
        <div style={webStyle(styles.headerActions)}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleDownloadPdf}
            disabled={generatingPdf}
            accessibilityLabel={t("download_pdf")}
          >
            {generatingPdf ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Download size={responsive.icon.md} color={colors.white} />
            )}
          </TouchableOpacity>
          {!isCompleted ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() =>
                router.push(`/orders/edit/${id}${editQuery}` as any)
              }
            >
              <Ionicons
                name="create-outline"
                size={responsive.icon.md}
                color={colors.white}
              />
            </TouchableOpacity>
          ) : null}
        </div>
      </div>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <div style={webStyle(styles.topCard)}>
          <div style={webStyle(styles.topCardRow)}>
            <div
              style={webStyle([
                styles.typeBadge,
                {
                  backgroundColor: isPurchase
                    ? colors.primaryPale
                    : colors.greenLight,
                },
              ])}
            >
              {isPurchase ? (
                <ArrowDownCircle size={badgeIconSize} color={colors.primary} />
              ) : (
                <ArrowUpCircle size={badgeIconSize} color={colors.green} />
              )}
              <span
                style={webStyle([
                  styles.typeBadgeText,
                  { color: isPurchase ? colors.primary : colors.green },
                ])}
              >
                {isPurchase ? "Purchase" : "Sale"}
              </span>
            </div>
            <div
              style={webStyle([
                styles.statusBadge,
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
                  styles.statusBadgeText,
                  { color: statusTheme.text },
                ])}
              >
                {statusTheme.label}
              </span>
            </div>
          </div>

          <span style={webStyle(styles.orderId)}>
            #
            {(order.orderId || order.orderNumber || order.id)?.substring(0, 12)}
          </span>

          <div style={webStyle(styles.amountSection)}>
            <span style={webStyle(styles.amountLabel)}>
              {t("total_amount")}
            </span>
            <span style={webStyle(styles.amountValue)}>
              {formatCurrency(order.totalAmount)}
            </span>
          </div>

          <div style={webStyle(styles.dateRow)}>
            <Clock size={rowIconSize} color={colors.gray400} />
            <span style={webStyle(styles.dateText)}>
              {formatShortDate(order.orderDate)}
            </span>
          </div>
        </div>

        <div style={webStyle(styles.partyCard)}>
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
              {partyInitial}
            </span>
          </div>
          <div style={webStyle(styles.partyInfo)}>
            <span style={webStyle(styles.partyName)}>{partyName}</span>
            {party?.mobile && (
              <span style={webStyle(styles.partyMeta)}>{party.mobile}</span>
            )}
            {party?.email && (
              <span style={webStyle(styles.partyMeta)}>{party.email}</span>
            )}
            {party?.contactPerson && (
              <span style={webStyle(styles.partyMeta)}>
                Contact: {party.contactPerson}
              </span>
            )}
            {party?.address && (
              <span style={webStyle(styles.partyMeta)}>{party.address}</span>
            )}
            {party?.gstNumber && (
              <span style={webStyle(styles.partyMeta)}>
                GST: {party.gstNumber}
              </span>
            )}
            {party?.partyTypeName && (
              <div style={webStyle(styles.partyTypePill)}>
                <span style={webStyle(styles.partyTypeText)}>
                  {party.partyTypeName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={webStyle(styles.statsGrid)}>
          <div style={webStyle(styles.statItem)}>
            <Layers size={responsive.icon.md} color={colors.primary} />
            <span style={webStyle(styles.statNum)}>
              {order.items?.length || 0}
            </span>
            <span style={webStyle(styles.statLabel)}>{t("items")}</span>
          </div>
          <div style={webStyle(styles.statDivider)} />
          <div style={webStyle(styles.statItem)}>
            <Scale size={responsive.icon.md} color={colors.primary} />
            <span style={webStyle(styles.statNum)}>
              {Number(order.totalWeight || 0).toFixed(3)}
            </span>
            <span style={webStyle(styles.statLabel)}>{t("weight_kg")}</span>
          </div>
          <div style={webStyle(styles.statDivider)} />
          <div style={webStyle(styles.statItem)}>
            <Banknote size={responsive.icon.md} color={colors.green} />
            <span style={webStyle([styles.statNum, { color: colors.green }])}>
              {formatCurrency(grandTotal)}
            </span>
            <span style={webStyle(styles.statLabel)}>{t("grand_total")}</span>
          </div>
        </div>

        <div style={webStyle(styles.detailsCard)}>
          <div style={webStyle(styles.sectionHeaderCompact)}>
            <FileText size={responsive.icon.md} color={colors.gray600} />
            <span style={webStyle(styles.sectionTitle)}>
              {t("order_summary")}
            </span>
          </div>
          <div style={webStyle(styles.infoGrid)}>
            <div style={webStyle(styles.infoChip)}>
              <span style={webStyle(styles.infoLabel)}>{t("priority")}</span>
              <span style={webStyle(styles.infoValue)}>
                {formatPriority(order.priority)}
              </span>
            </div>
            <div style={webStyle(styles.infoChip)}>
              <span style={webStyle(styles.infoLabel)}>{t("rate_mode")}</span>
              <span style={webStyle(styles.infoValue)}>{rateModeLabel}</span>
            </div>
            <div style={webStyle(styles.infoChip)}>
              <span style={webStyle(styles.infoLabel)}>{t("global_rate")}</span>
              <span style={webStyle(styles.infoValue)}>
                {formatCurrency(order.globalRate || 0)}
              </span>
            </div>
            <div style={webStyle(styles.infoChip)}>
              <span style={webStyle(styles.infoLabel)}>{t("created")}</span>
              <span style={webStyle(styles.infoValue)}>
                {order.createdAt ? formatDate(order.createdAt) : "N/A"}
              </span>
            </div>
            <div style={webStyle(styles.infoChip)}>
              <span style={webStyle(styles.infoLabel)}>{t("updated")}</span>
              <span style={webStyle(styles.infoValue)}>
                {order.updatedAt ? formatDate(order.updatedAt) : "N/A"}
              </span>
            </div>
            <div style={webStyle(styles.infoChip)}>
              <span style={webStyle(styles.infoLabel)}>{t("order_ref")}</span>
              <span style={webStyle(styles.infoValue)}>
                {order.orderId || order.orderNumber || order.id}
              </span>
            </div>
          </div>
        </div>

        <div style={webStyle(styles.detailsCard)}>
          <div style={webStyle(styles.sectionHeaderCompact)}>
            <Banknote size={responsive.icon.md} color={colors.gray600} />
            <span style={webStyle(styles.sectionTitle)}>
              {t("amount_breakdown")}
            </span>
          </div>
          <div style={webStyle(styles.breakdownRow)}>
            <span style={webStyle(styles.breakdownLabel)}>{t("subtotal")}</span>
            <span style={webStyle(styles.breakdownValue)}>
              {formatCurrency(subtotal)}
            </span>
          </div>
          {hasGst && order.gst?.gstType === "cgst_sgst" ? (
            <>
              <div style={webStyle(styles.breakdownRow)}>
                <span style={webStyle(styles.breakdownLabel)}>
                  CGST @ {(order.gst.gstRate || 0) / 2}%
                </span>
                <span style={webStyle(styles.breakdownValue)}>
                  {formatCurrency(order.gst.cgstAmount || 0)}
                </span>
              </div>
              <div style={webStyle(styles.breakdownRow)}>
                <span style={webStyle(styles.breakdownLabel)}>
                  SGST @ {(order.gst.gstRate || 0) / 2}%
                </span>
                <span style={webStyle(styles.breakdownValue)}>
                  {formatCurrency(order.gst.sgstAmount || 0)}
                </span>
              </div>
            </>
          ) : null}
          {hasGst && order.gst?.gstType === "igst" ? (
            <div style={webStyle(styles.breakdownRow)}>
              <span style={webStyle(styles.breakdownLabel)}>
                IGST @ {order.gst.gstRate || 0}%
              </span>
              <span style={webStyle(styles.breakdownValue)}>
                {formatCurrency(order.gst.igstAmount || 0)}
              </span>
            </div>
          ) : null}
          {hasGst ? (
            <div style={webStyle(styles.breakdownRow)}>
              <span style={webStyle(styles.breakdownLabel)}>
                {t("total_gst")}
              </span>
              <span style={webStyle(styles.breakdownValue)}>
                {formatCurrency(order.gst?.gstAmount || 0)}
              </span>
            </div>
          ) : (
            <div style={webStyle(styles.breakdownRow)}>
              <span style={webStyle(styles.breakdownLabel)}>{t("gst")}</span>
              <span style={webStyle(styles.breakdownValue)}>
                {t("not_applied")}
              </span>
            </div>
          )}
          <div style={webStyle(styles.breakdownDivider)} />
          <div style={webStyle(styles.breakdownRow)}>
            <span style={webStyle(styles.breakdownTotalLabel)}>
              {t("grand_total")}
            </span>
            <span style={webStyle(styles.breakdownTotalValue)}>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        <div style={webStyle(styles.sectionHeader)}>
          <Package2 size={responsive.icon.md} color={colors.gray600} />
          <span style={webStyle(styles.sectionTitle)}>{t("order_items")}</span>
        </div>

        {order.items?.map((item, idx) => {
          const isMetal = item.itemType === "metal";
          return (
            <div key={item.id} style={webStyle(styles.itemCard)}>
              <div style={webStyle(styles.itemTop)}>
                <div
                  style={webStyle([
                    styles.itemIconWrap,
                    {
                      backgroundColor: isMetal
                        ? colors.primaryPale
                        : colors.greenLight,
                    },
                  ])}
                >
                  {isMetal ? (
                    <Droplets size={itemIconSize} color={colors.primary} />
                  ) : (
                    <Package size={itemIconSize} color={colors.green} />
                  )}
                </div>
                <div style={webStyle(styles.itemInfo)}>
                  <span style={webStyle(styles.itemName)}>
                    {isMetal
                      ? getMetalName(item.metalId)
                      : item.name || "Product"}
                  </span>
                  <span style={webStyle(styles.itemType)}>
                    {isMetal ? "Metal" : "Product"}
                  </span>
                </div>
                <span style={webStyle(styles.itemTotal)}>
                  {formatCurrency(item.totalAmount)}
                </span>
              </div>
              <div style={webStyle(styles.itemMetaRow)}>
                <div style={webStyle(styles.itemMetaChip)}>
                  <span style={webStyle(styles.itemMetaLabel)}>
                    {t("weight")}
                  </span>
                  <span style={webStyle(styles.itemMetaValue)}>
                    {Number(item.weightKg || 0).toFixed(3)} kg
                  </span>
                </div>
                <div style={webStyle(styles.itemMetaChip)}>
                  <span style={webStyle(styles.itemMetaLabel)}>
                    {t("rate")}
                  </span>
                  <span style={webStyle(styles.itemMetaValue)}>
                    ₹{Number(item.ratePerKg || 0).toFixed(2)}/kg
                  </span>
                </div>
                {!isMetal && (
                  <div style={webStyle(styles.itemMetaChip)}>
                    <span style={webStyle(styles.itemMetaLabel)}>
                      {t("qty")}
                    </span>
                    <span style={webStyle(styles.itemMetaValue)}>
                      {item.orderedQty || item.quantity || 1}
                    </span>
                  </div>
                )}
                {isMetal && (
                  <div style={webStyle(styles.itemMetaChip)}>
                    <span style={webStyle(styles.itemMetaLabel)}>
                      {t("measure")}
                    </span>
                    <span style={webStyle(styles.itemMetaValue)}>
                      {item.kg || 0}kg {item.gram || 0}g
                    </span>
                  </div>
                )}
                <div style={webStyle(styles.itemMetaChip)}>
                  <span style={webStyle(styles.itemMetaLabel)}>
                    {t("delivered")}
                  </span>
                  <span style={webStyle(styles.itemMetaValue)}>
                    {Number(item.deliveredQty || 0)}
                  </span>
                </div>
                <div style={webStyle(styles.itemMetaChip)}>
                  <span style={webStyle(styles.itemMetaLabel)}>
                    {t("pending")}
                  </span>
                  <span style={webStyle(styles.itemMetaValue)}>
                    {Number(
                      item.pendingQty ??
                        Math.max(
                          Number(item.orderedQty || item.quantity || 0) -
                            Number(item.deliveredQty || 0),
                          0,
                        ),
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {order.note ? (
          <div style={webStyle(styles.noteCard)}>
            <FileText size={responsive.icon.md} color={colors.yellow} />
            <span style={webStyle(styles.noteText)}>{order.note}</span>
          </div>
        ) : null}

        {/* {order.createdAt && (
          <div style={webStyle(styles.timestampsCard)}>
            <div style={webStyle(styles.timestampRow)}>
              <span style={webStyle(styles.timestampLabel)}>Created</span>
              <span style={webStyle(styles.timestampValue)}>
                {formatDate(order.createdAt)}
              </span>
            </div>
            {order.updatedAt && (
              <div style={webStyle(styles.timestampRow)}>
                <span style={webStyle(styles.timestampLabel)}>Updated</span>
                <span style={webStyle(styles.timestampValue)}>
                  {formatDate(order.updatedAt)}
                </span>
              </div>
            )}
          </div>
        )} */}

        {isCompleted && (
          <div
            style={webStyle([
              styles.statusBanner,
              {
                backgroundColor:
                  (order.status || "").toLowerCase() === "completed"
                    ? "#DCFCE7"
                    : "#FEE2E2",
              },
            ])}
          >
            {(order.status || "").toLowerCase() === "completed" ? (
              <CheckCircle size={statusBannerIconSize} color="#15803D" />
            ) : (
              <XCircle size={statusBannerIconSize} color="#DC2626" />
            )}
            <span
              style={webStyle([
                styles.statusBannerText,
                {
                  color:
                    (order.status || "").toLowerCase() === "completed"
                      ? "#15803D"
                      : "#DC2626",
                },
              ])}
            >
              This order has been {(order.status || "").toLowerCase()}
            </span>
          </div>
        )}

        <div style={webStyle({ height: 120 })} />
      </ScrollView>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: responsive.space,
    paddingVertical: responsive.isXs ? 10 : 14,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: responsive.isXs ? 16 : 20,
    borderBottomRightRadius: responsive.isXs ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  backBtn: { padding: responsive.isXs ? 4 : 6 },
  headerTitle: {
    fontSize: responsive.font.lg,
    fontWeight: "700" as const,
    color: colors.white,
    flex: 1,
    textAlign: "center" as const,
  },
  headerRight: {
    width: responsive.isXs ? 28 : 36,
    alignItems: "flex-end" as const,
  },
  headerActions: {
    minWidth: responsive.isXs ? 76 : 86,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: responsive.isXs ? 6 : 8,
  },
  headerIconBtn: {
    width: responsive.isXs ? 30 : 36,
    height: responsive.isXs ? 30 : 36,
    borderRadius: responsive.isXs ? 9 : 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEditBtn: { padding: responsive.isXs ? 4 : 6 },
  scrollContent: {
    paddingHorizontal: responsive.space,
    paddingTop: responsive.space,
  },
  loadingSkeleton: {
    paddingHorizontal: responsive.space,
    paddingTop: responsive.space,
  },

  topCard: {
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 12 : 16,
    padding: responsive.cardPadding,
    marginBottom: responsive.isXs ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  topCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: responsive.isXs ? 10 : 12,
    gap: responsive.isXs ? 8 : 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 4 : 6,
    paddingHorizontal: responsive.isXs ? 8 : 12,
    paddingVertical: responsive.isXs ? 4 : 6,
    borderRadius: 20,
  },
  typeBadgeText: { fontSize: responsive.font.sm, fontWeight: "600" as const },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 4 : 5,
    paddingHorizontal: responsive.isXs ? 8 : 10,
    paddingVertical: responsive.isXs ? 4 : 5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: {
    fontSize: responsive.font.xs,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  orderId: {
    fontSize: responsive.font.md,
    color: colors.gray400,
    fontWeight: "500" as const,
    marginBottom: responsive.space,
  },
  amountSection: { marginBottom: responsive.isXs ? 10 : 12 },
  amountLabel: {
    fontSize: responsive.font.sm,
    color: colors.gray400,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: responsive.isXs ? 24 : responsive.isSm ? 28 : 32,
    fontWeight: "800" as const,
    color: colors.gray900,
    letterSpacing: 0,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 4 : 6,
  },
  dateText: {
    fontSize: responsive.font.sm,
    color: colors.gray500,
    fontWeight: "500" as const,
  },

  partyCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 12 : 14,
    padding: responsive.cardPadding,
    marginBottom: responsive.isXs ? 10 : 12,
    gap: responsive.isXs ? 10 : 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  partyAvatar: {
    width: responsive.isXs ? 42 : 50,
    height: responsive.isXs ? 42 : 50,
    borderRadius: responsive.isXs ? 12 : 14,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  partyAvatarText: { fontSize: responsive.font.xl, fontWeight: "700" as const },
  partyInfo: { flex: 1, minWidth: 0 },
  partyName: {
    fontSize: responsive.font.lg,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  partyMeta: {
    fontSize: responsive.font.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  partyTypePill: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start" as const,
    marginTop: 6,
  },
  partyTypeText: {
    fontSize: responsive.font.xs,
    fontWeight: "600" as const,
    color: colors.gray500,
  },

  statsGrid: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 12 : 14,
    padding: responsive.cardPadding,
    marginBottom: responsive.space,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center" as const,
    gap: responsive.isXs ? 4 : 6,
  },
  statDivider: { width: 1, backgroundColor: colors.gray200 },
  statNum: {
    fontSize: responsive.font.md,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  statLabel: {
    fontSize: responsive.font.xs,
    fontWeight: "500" as const,
    color: colors.gray400,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 6 : 8,
    marginBottom: responsive.isXs ? 10 : 12,
  },
  sectionTitle: {
    fontSize: responsive.font.md,
    fontWeight: "700" as const,
    color: colors.gray600,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  sectionHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 6 : 8,
    marginBottom: responsive.isXs ? 10 : 14,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 12 : 14,
    padding: responsive.cardPadding,
    marginBottom: responsive.space,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive.isXs ? 8 : 10,
  },
  infoChip: {
    width: "48%",
    backgroundColor: colors.gray50,
    borderRadius: responsive.isXs ? 8 : 10,
    padding: responsive.isXs ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  infoLabel: {
    fontSize: responsive.font.xs,
    color: colors.gray400,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    marginBottom: 4,
    fontWeight: "600" as const,
  },
  infoValue: {
    fontSize: responsive.font.sm,
    color: colors.gray800,
    fontWeight: "600" as const,
    flexShrink: 1,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: responsive.isXs ? 6 : 8,
    gap: responsive.isXs ? 8 : 12,
  },
  breakdownLabel: {
    fontSize: responsive.font.md,
    color: colors.gray500,
    flex: 1,
  },
  breakdownValue: {
    fontSize: responsive.font.md,
    color: colors.gray800,
    fontWeight: "600" as const,
    textAlign: "right" as const,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 6,
  },
  breakdownTotalLabel: {
    fontSize: responsive.font.lg,
    color: colors.gray900,
    fontWeight: "700" as const,
  },
  breakdownTotalValue: {
    fontSize: responsive.font.xl,
    color: colors.green,
    fontWeight: "800" as const,
  },

  itemCard: {
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 12 : 14,
    padding: responsive.isXs ? 12 : 14,
    marginBottom: responsive.isXs ? 8 : 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 12,
    marginBottom: responsive.isXs ? 8 : 10,
  },
  itemIconWrap: {
    width: responsive.isXs ? 30 : 36,
    height: responsive.isXs ? 30 : 36,
    borderRadius: responsive.isXs ? 8 : 10,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: {
    fontSize: responsive.font.md,
    fontWeight: "600" as const,
    color: colors.gray800,
  },
  itemType: {
    fontSize: responsive.font.xs,
    color: colors.gray400,
    marginTop: 2,
  },
  itemTotal: {
    maxWidth: responsive.isXs ? 100 : 132,
    fontSize: responsive.font.lg,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  itemMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive.isXs ? 6 : 8,
  },
  itemMetaChip: {
    backgroundColor: colors.gray50,
    paddingHorizontal: responsive.isXs ? 8 : 10,
    paddingVertical: responsive.isXs ? 5 : 6,
    borderRadius: responsive.isXs ? 7 : 8,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  itemMetaLabel: {
    fontSize: responsive.font.xs,
    fontWeight: "600" as const,
    color: colors.gray400,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  itemMetaValue: {
    fontSize: responsive.font.sm,
    fontWeight: "600" as const,
    color: colors.gray700,
    marginTop: 2,
  },

  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: responsive.isXs ? 8 : 10,
    backgroundColor: colors.yellowLight,
    padding: responsive.isXs ? 12 : 14,
    borderRadius: responsive.radius,
    marginTop: 8,
    marginBottom: 12,
  },
  noteText: {
    flex: 1,
    fontSize: responsive.font.md,
    color: colors.gray700,
    lineHeight: responsive.isXs ? 18 : 20,
  },

  timestampsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  timestampRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  timestampLabel: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500" as const,
  },
  timestampValue: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: "500" as const,
  },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 10,
    padding: responsive.cardPadding,
    borderRadius: responsive.radius,
    marginTop: responsive.space,
  },
  statusBannerText: {
    fontSize: responsive.font.md,
    fontWeight: "600" as const,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    flexDirection: "row",
    padding: 14,
    paddingBottom: Platform.OS === "ios" ? 30 : 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  materialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryPale,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  materialBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.green,
  },
  statusBtnText: { fontSize: 13, fontWeight: "600" as const, color: "#fff" },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.redLight,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteFullBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.red,
  },
  deleteFullBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#fff",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center" as const,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.redLight,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.gray900,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: "center" as const,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.gray600,
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.red,
  },
  modalDeleteText: { fontSize: 15, fontWeight: "600" as const, color: "#fff" },

  statusOptions: { width: "100%", gap: 8, marginBottom: 16 },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.gray50,
  },
  statusOptionActive: { backgroundColor: colors.white, borderWidth: 2 },
  statusOptionDot: { width: 8, height: 8, borderRadius: 4 },
  statusOptionText: { fontSize: 15, fontWeight: "600" as const, flex: 1 },
  currentLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.gray400,
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalCloseBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.gray600,
  },

  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { fontSize: 14, color: colors.gray400, marginTop: 12 },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.gray800,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: "center" as const,
    marginBottom: 24,
  },
  errorBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" as const },
});
