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
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Package,
  Phone,
  Clock,
  RefreshCw,
  XCircle,
  History,
} from "lucide-react-native";
import { colors } from "@/colors";
import EnquiryService from "@/services/EnquiryService";
import ProductService from "@/services/ProductService";
import { EnquiryTypes, TimelineEntry } from "@/types/enquiry.types";
import { getProductRateInfo } from "@/utils/productPricing";

const extractEntity = (response: any) =>
  response?.data?.data ?? response?.data?.enquiry ?? response?.data ?? response;

const normalizeId = (value: any) =>
  value === undefined || value === null ? "" : String(value);

const normalizeText = (value: any, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return fallback;
};

const normalizeEnquiry = (item: any): EnquiryTypes => ({
  ...item,
  id: normalizeId(item?.id || item?._id),
  productId: Array.isArray(item?.productIds)
    ? item.productIds
    : Array.isArray(item?.productId)
      ? item.productId
      : item?.productId
        ? [item.productId]
        : [],
  name: normalizeText(item?.name, "Unknown"),
  email: normalizeText(item?.email),
  mobile: normalizeText(item?.mobile),
  message: normalizeText(item?.message),
  status: item?.status || "pending",
  countryCode: normalizeText(item?.countryCode),
  diallingCode: normalizeText(item?.diallingCode),
  trackingId: normalizeText(item?.trackingId),
  timeline: Array.isArray(item?.timeline) ? item.timeline : [],
  products: Array.isArray(item?.products) ? item.products : [],
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const normalizeProduct = (product: any) => ({
  ...product,
  id: normalizeId(product?.id || product?._id),
  name: normalizeText(product?.name || product?.title, "Unnamed product"),
  designCode: normalizeText(product?.designCode || product?.sku),
  description: normalizeText(
    product?.description || product?.productDetail?.description,
  ),
  price: getProductRateInfo(product).amount,
  priceUnit: getProductRateInfo(product).unit,
  stock: Number(product?.stock ?? product?.quantity ?? 0) || 0,
  images: Array.isArray(product?.images) ? product.images : [],
  productDetail: product?.productDetail || {},
});

const toDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value._seconds === "number")
      return new Date(value._seconds * 1000);
    if (typeof value.seconds === "number")
      return new Date(value.seconds * 1000);
  }
  return new Date(value);
};

const formatDate = (value?: any) => {
  const date = toDate(value);
  if (!date || isNaN(date.getTime())) return "Not available";
  try {
    return format(date, "dd MMM yyyy, hh:mm a");
  } catch {
    return "Not available";
  }
};

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "N/A";
  if (typeof timestamp === "object" && "_seconds" in timestamp) {
    const date = new Date(timestamp._seconds * 1000);
    return format(date, "dd MMM yyyy, hh:mm a");
  }
  return formatDate(timestamp);
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approve":
      return {
        label: "Approved",
        color: colors.green,
        bgColor: colors.greenLight,
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        label: "Rejected",
        color: "#DC2626",
        bgColor: "#FEE2E2",
        icon: XCircle,
      };
    case "reviewing":
      return {
        label: "Reviewing",
        color: colors.primary,
        bgColor: "#DBEAFE",
        icon: RefreshCw,
      };
    default:
      return {
        label: "Pending",
        color: "#D97706",
        bgColor: colors.yellowLight,
        icon: Clock,
      };
  }
};

const formatCurrency = (value: number) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function EnquiryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const enquiryId = normalizeId(params.id);
  const [enquiry, setEnquiry] = useState<EnquiryTypes | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [comment, setComment] = useState("");
  const [autoUpdating, setAutoUpdating] = useState(false);
  const autoUpdateTriggered = useRef(false);
  const commentInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const phone = useMemo(
    () =>
      `${enquiry?.diallingCode || ""} ${enquiry?.mobile || ""}`.trim() ||
      "No mobile",
    [enquiry],
  );

  const statusConfig = useMemo(
    () => getStatusConfig(enquiry?.status || "pending"),
    [enquiry?.status],
  );

  const isFinalStatus =
    enquiry?.status === "approve" || enquiry?.status === "rejected";
  const isReviewing = enquiry?.status === "reviewing";

  const loadEnquiry = useCallback(async () => {
    if (!enquiryId) return;

    try {
      setLoading(true);
      const res = await EnquiryService.fetchEnquiryById(enquiryId);
      const detail = normalizeEnquiry(extractEntity(res));
      setEnquiry(detail);

      const populatedProducts = Array.isArray(detail.products)
        ? detail.products.filter(
            (product: any) => product && typeof product === "object",
          )
        : [];
      const productIds = detail.productId
        .map((item: any) =>
          typeof item === "object"
            ? normalizeId(item.id || item._id)
            : normalizeId(item),
        )
        .filter(Boolean);

      const missingProductIds = productIds.filter(
        (productId) =>
          !populatedProducts.some(
            (product: any) =>
              normalizeId(product.id || product._id) === productId,
          ),
      );
      const fetchedProducts = await Promise.all(
        missingProductIds.map(async (productId) => {
          try {
            const productRes = await ProductService.fetchProductById(productId);
            return extractEntity(productRes);
          } catch (error) {
            return null;
          }
        }),
      );

      const objectProductIds = detail.productId.filter(
        (item: any) => item && typeof item === "object",
      );
      setProducts(
        [...populatedProducts, ...objectProductIds, ...fetchedProducts]
          .filter(Boolean)
          .map(normalizeProduct),
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load enquiry details.");
      setEnquiry(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [enquiryId]);

  useEffect(() => {
    loadEnquiry();
  }, [loadEnquiry]);

  useEffect(() => {
    if (!enquiry || autoUpdateTriggered.current || autoUpdating) return;
    if (enquiry.status === "pending") {
      autoUpdateTriggered.current = true;
      updateStatusAutomatically("reviewing", "Admin started review");
    }
  }, [enquiry]);

  const updateStatusAutomatically = async (
    newStatus: string,
    commentText: string,
  ) => {
    setAutoUpdating(true);
    try {
      const res = await EnquiryService.updateEnquiryStatus(enquiryId, {
        status: newStatus,
        comment: commentText,
      });
      if (res.success) {
        await loadEnquiry();
      }
    } catch (error: any) {
      console.log("[Auto update] Error:", error);
    } finally {
      setAutoUpdating(false);
    }
  };

  const handleCommentFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const updateStatus = async (newStatus: "approve" | "rejected") => {
    if (!enquiry || isFinalStatus) return;

    const actionText = newStatus === "approve" ? "approve" : "reject";
    const confirmMessage =
      newStatus === "approve"
        ? "Are you sure you want to approve this enquiry?"
        : "Are you sure you want to reject this enquiry?";

    Alert.alert(`Confirm ${actionText}`, confirmMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: actionText,
        style: newStatus === "rejected" ? "destructive" : "default",
        onPress: async () => {
          try {
            if (newStatus === "approve") {
              setLoadingApprove(true);
            } else {
              setLoadingReject(true);
            }

            const enquiryId = enquiry.id;
            if (!enquiryId) {
              throw new Error("Enquiry ID not found");
            }

            const res = await EnquiryService.updateEnquiryStatus(enquiryId, {
              status: newStatus,
              comment:
                comment.trim() ||
                (newStatus === "approve"
                  ? "Enquiry approved"
                  : "Enquiry rejected"),
            });

            if (res.success) {
              Alert.alert("Success", `Enquiry ${actionText}d successfully.`);
              setTimeout(() => {
                router.back();
              }, 500);
            } else {
              throw new Error(res.message || "Failed to update.");
            }
          } catch (error: any) {
            Alert.alert(
              "Error",
              error?.message || "Failed to update enquiry status.",
            );
          } finally {
            if (newStatus === "approve") {
              setLoadingApprove(false);
            } else {
              setLoadingReject(false);
            }
          }
        },
      },
    ]);
  };

  const renderTimeline = () => {
    const timeline = enquiry?.timeline || [];
    if (timeline.length === 0) {
      return (
        <div style={webStyle(styles.emptyTimeline)}>
          <History size={32} color={colors.gray400} />
          <span style={webStyle(styles.emptyTimelineText)}>No timeline updates yet</span>
        </div>
      );
    }

    const sortedTimeline = [...timeline].sort((a, b) => {
      const aSec = a.updatedAt?._seconds || 0;
      const bSec = b.updatedAt?._seconds || 0;
      return aSec - bSec;
    });

    return (
      <div style={webStyle(styles.timelineContainer)}>
        {sortedTimeline.map((item: TimelineEntry, idx: number, arr: any[]) => {
          const isLatest = idx === arr.length - 1;
          const itemConfig = getStatusConfig(item.status);
          const ItemIcon = itemConfig.icon;
          let dotColor = itemConfig.color;
          if (item.status === "pending") dotColor = "#D97706";
          else if (item.status === "reviewing") dotColor = colors.primary;
          else if (item.status === "approve") dotColor = colors.green;
          else if (item.status === "rejected") dotColor = "#DC2626";

          return (
            <div key={idx} style={webStyle(styles.timelineItem)}>
              <div style={webStyle(styles.timelineLeft)}>
                <div
                  style={webStyle([
                    styles.timelineDot,
                    { backgroundColor: dotColor },
                    isLatest && styles.timelineDotLatest,
                  ])}
                />
                {idx < arr.length - 1 && (
                  <div
                    style={webStyle([styles.timelineLine, { backgroundColor: dotColor }])}
                  />
                )}
              </div>
              <div style={webStyle(styles.timelineRight)}>
                <div style={webStyle(styles.timelineHeader)}>
                  <div style={webStyle(styles.timelineStatusWrap)}>
                    <ItemIcon size={12} color={dotColor} />
                    <span style={webStyle([styles.timelineStatus, { color: dotColor }])}>
                      {itemConfig.label}
                    </span>
                  </div>
                  <span style={webStyle(styles.timelineDate)}>
                    {formatTimestamp(item.updatedAt)}
                  </span>
                </div>
                <span style={webStyle(styles.timelineComment)}>{item.comment}</span>
                <span style={webStyle(styles.timelineBy)}>
                  by {item.updatedBy || "system"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerState} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <span style={webStyle(styles.stateText)}>Loading enquiry details...</span>
      </SafeAreaView>
    );
  }

  if (!enquiry) {
    return (
      <SafeAreaView style={styles.centerState} edges={["top"]}>
        <MessageSquareText size={28} color={colors.gray400} />
        <span style={webStyle(styles.emptyTitle)}>Enquiry not found</span>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <span style={webStyle(styles.backButtonText)}>Go Back</span>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.gray800} />
        </TouchableOpacity>
        <div style={webStyle(styles.headerTextWrap)}>
          <span style={webStyle(styles.headerTitle)}>Enquiry Detail</span>
          <span style={webStyle(styles.headerSubtitle)}>
            {enquiry.trackingId
              ? `ID: ${enquiry.trackingId}`
              : formatDate(enquiry.createdAt)}
          </span>
        </div>
        <div
          style={webStyle([
            styles.statusBadge,
            { backgroundColor: statusConfig.bgColor },
          ])}
        >
          <statusConfig.icon size={12} color={statusConfig.color} />
          <span style={webStyle([styles.statusText, { color: statusConfig.color }])}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <ScrollView
        ref={scrollViewRef}
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <div style={webStyle(styles.section)}>
          <span style={webStyle(styles.sectionTitle)}>Customer</span>
          <span style={webStyle(styles.customerName)}>{enquiry.name}</span>
          <div style={webStyle(styles.infoRow)}>
            <Mail size={15} color={colors.gray500} />
            <span style={webStyle(styles.infoText)}>{enquiry.email || "No email"}</span>
          </div>
          <div style={webStyle(styles.infoRow)}>
            <Phone size={15} color={colors.gray500} />
            <span style={webStyle(styles.infoText)}>{phone}</span>
          </div>
        </div>

        <div style={webStyle(styles.section)}>
          <span style={webStyle(styles.sectionTitle)}>Message</span>
          <span style={webStyle(styles.messageText)}>
            {enquiry.message || "No message added."}
          </span>
        </div>

        <div style={webStyle(styles.section)}>
          <div style={webStyle(styles.sectionHeader)}>
            <History size={16} color={colors.primary} />
            <span style={webStyle(styles.sectionTitle)}>Timeline</span>
          </div>
          {renderTimeline()}
        </div>

        <div style={webStyle(styles.section)}>
          <div style={webStyle(styles.sectionHeader)}>
            <Package size={16} color={colors.primary} />
            <span style={webStyle(styles.sectionTitle)}>Products</span>
            <span style={webStyle(styles.productCount)}>{products.length}</span>
          </div>

          {products.length === 0 ? (
            <div style={webStyle(styles.emptyProducts)}>
              <Package size={24} color={colors.gray400} />
              <span style={webStyle(styles.emptyProductText)}>
                Product details are not available for this enquiry.
              </span>
            </div>
          ) : (
            products.map((product, index) => {
              const imageUri =
                product.images?.[0]?.url ||
                product.images?.[0]?.uri ||
                product.images?.[0];
              const details = product.productDetail || {};
              const weight = normalizeText(details.weight);
              const rateUnit = product.priceUnit || product.rateUnit || "kg";

              return (
                <div style={webStyle(styles.productCard)} key={product.id || index}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.productImage}
                    />
                  ) : (
                    <div style={webStyle(styles.productImagePlaceholder)}>
                      <Package size={22} color={colors.gray400} />
                    </div>
                  )}
                  <div style={webStyle(styles.productInfo)}>
                    <span style={webStyle(styles.productName)}>{product.name}</span>
                    {product.designCode ? (
                      <span style={webStyle(styles.productMeta)}>
                        Code: {product.designCode}
                      </span>
                    ) : null}
                    {product.description ? (
                      <span style={webStyle(styles.productDescription)}>
                        {product.description}
                      </span>
                    ) : null}
                    <div style={webStyle(styles.productFacts)}>
                      <span style={webStyle(styles.factText)}>
                        {product.price > 0
                          ? `${formatCurrency(product.price)}/${rateUnit}`
                          : "Price on enquiry"}
                      </span>
                      <span style={webStyle(styles.factText)}>Stock {product.stock}</span>
                    </div>
                    {weight ? (
                      <span style={webStyle(styles.productMeta)}>Weight: {weight}</span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollView>

      {!isFinalStatus && isReviewing && (
        <div style={webStyle(styles.footer)}>
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="Optional comment (reason for approve/reject)..."
            placeholderTextColor={colors.gray400}
            value={comment}
            onChangeText={setComment}
            onFocus={handleCommentFocus}
            multiline
          />
          <div style={webStyle(styles.footerButtons)}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => updateStatus("rejected")}
              disabled={loadingReject}
            >
              {loadingReject ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <XCircle size={18} color="#fff" />
                  <span style={webStyle(styles.actionButtonText)}>Reject</span>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => updateStatus("approve")}
              disabled={loadingApprove}
            >
              {loadingApprove ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#fff" />
                  <span style={webStyle(styles.actionButtonText)}>Approve</span>
                </>
              )}
            </TouchableOpacity>
          </div>
        </div>
      )}

      {autoUpdating && (
        <div style={webStyle(styles.autoUpdateOverlay)}>
          <ActivityIndicator size="small" color={colors.primary} />
          <span style={webStyle(styles.autoUpdateText)}>
            Updating status to Reviewing...
          </span>
        </div>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  stateText: { marginTop: 10, color: colors.gray500, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.gray900 },
  headerSubtitle: { marginTop: 2, fontSize: 11, color: colors.gray500 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "800" },
  body: { flex: 1 },
  content: { padding: 16, paddingBottom: 200, gap: 12 },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.gray900,
    flex: 1,
  },
  customerName: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "800",
    color: colors.gray900,
  },
  infoRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 14, color: colors.gray700 },
  messageText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray700,
  },
  productCount: {
    minWidth: 28,
    textAlign: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryPale,
    color: colors.primaryDark,
    fontWeight: "800",
  },
  emptyProducts: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyProductText: { color: colors.gray500, textAlign: "center" },
  productCard: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  productImage: {
    width: 82,
    height: 82,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  productImagePlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 15, fontWeight: "800", color: colors.gray900 },
  productMeta: { marginTop: 4, fontSize: 12, color: colors.gray500 },
  productDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray700,
  },
  productFacts: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  factText: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray900,
    minHeight: 50,
    textAlignVertical: "top",
  },
  footerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  approveButton: { backgroundColor: colors.green },
  rejectButton: { backgroundColor: "#DC2626" },
  actionButtonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray800,
  },
  backButton: {
    marginTop: 16,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: colors.white, fontWeight: "800" },
  timelineContainer: { marginTop: 4 },
  timelineItem: { flexDirection: "row", marginBottom: 16 },
  timelineLeft: { width: 24, alignItems: "center", position: "relative" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineDotLatest: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "white",
  },
  timelineLine: { width: 2, flex: 1, marginTop: 6, marginBottom: -16 },
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 8 },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  timelineStatusWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  timelineStatus: { fontSize: 12, fontWeight: "700" },
  timelineDate: { fontSize: 10, color: colors.gray400 },
  timelineComment: { fontSize: 13, color: colors.gray700, marginTop: 4 },
  timelineBy: { fontSize: 10, color: colors.gray400, marginTop: 2 },
  emptyTimeline: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyTimelineText: { color: colors.gray500, fontSize: 13 },
  autoUpdateOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  autoUpdateText: { color: colors.white, fontSize: 14, fontWeight: "600" },
});
