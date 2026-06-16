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
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  X,
  Clock,
  Eye,
  RefreshCw,
  XCircle,
  Trash2,
} from "lucide-react-native";
import { useRouter } from "next/navigation";
import { colors } from "@/colors";
import EnquiryService from "@/services/EnquiryService";
import { EnquiryTypes } from "@/types/enquiry.types";
import { extractArrayPayload } from "@/utils/response";
import { formatDateValue } from "@/utils/date";

type EnquiryTab = "all" | "pending" | "reviewing" | "approve" | "rejected";

const normalizeEnquiry = (item: any): EnquiryTypes => ({
  ...item,
  id: String(item?.id || item?._id || ""),
  productId: Array.isArray(item?.productIds)
    ? item.productIds
    : Array.isArray(item?.productId)
      ? item.productId
      : item?.productId
        ? [item.productId]
        : [],
  name: item?.name || "Unknown",
  email: item?.email || "",
  mobile: item?.mobile || "",
  message: item?.message || "",
  status: item?.status || "pending",
  countryCode: item?.countryCode || "",
  diallingCode: item?.diallingCode || "",
  trackingId: item?.trackingId || "",
  timeline: item?.timeline || [],
});

const getProductNames = (enquiry: EnquiryTypes) => {
  if (Array.isArray(enquiry.products) && enquiry.products.length > 0) {
    return enquiry.products
      .map((product: any) => product?.name || product?.title)
      .filter(Boolean)
      .join(", ");
  }

  return null;
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
        color: colors.error,
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

export default function EnquiryListScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [enquiries, setEnquiries] = useState<EnquiryTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<EnquiryTab>("all");

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await EnquiryService.fetchAllEnquiry({
        params: { limit: 100 },
      });
      if (res.success) {
        const list = extractArrayPayload<any>(res, ["enquiries", "enquiry"]);
        setEnquiries(list.map(normalizeEnquiry).filter((item) => item.id));
      } else {
        setEnquiries([]);
      }
    } catch (error) {
      console.log("[EnquiryList] Error:", error);
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEnquiries();
    setRefreshing(false);
  }, [fetchEnquiries]);

  const handleDelete = useCallback(async (enquiry: EnquiryTypes) => {
    if (enquiry.status === "approve") {
      Alert.alert("Cannot Delete", "Approved enquiries cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Enquiry",
      `Are you sure you want to delete enquiry from ${enquiry.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(enquiry.id || "");
              const res = await EnquiryService.deleteEnquiry(enquiry.id || "");
              if (res.success) {
                setEnquiries((prev) =>
                  prev.filter((item) => item.id !== enquiry.id),
                );
                Alert.alert("Success", "Enquiry deleted successfully.");
              } else {
                Alert.alert(
                  "Error",
                  res.message || "Failed to delete enquiry.",
                );
              }
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Failed to delete enquiry.",
              );
            } finally {
              setDeletingId("");
            }
          },
        },
      ],
    );
  }, []);

  const stats = useMemo(
    () => ({
      total: enquiries.length,
      pending: enquiries.filter((item) => item.status === "pending").length,
      reviewing: enquiries.filter((item) => item.status === "reviewing").length,
      approve: enquiries.filter((item) => item.status === "approve").length,
      rejected: enquiries.filter((item) => item.status === "rejected").length,
    }),
    [enquiries],
  );

  const filteredEnquiries = useMemo(() => {
    let filtered = enquiries;

    if (activeTab !== "all") {
      filtered = filtered.filter((item) => item.status === activeTab);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((item) =>
        [
          item.name,
          item.email,
          item.mobile,
          item.message,
          item.status,
          item.trackingId,
          getProductNames(item),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [activeTab, enquiries, search]);

  const tabs: { key: EnquiryTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "reviewing", label: "Reviewing", count: stats.reviewing },
    { key: "approve", label: "Approved", count: stats.approve },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

  const formatDate = (value?: any) =>
    formatDateValue(value, "dd MMM yyyy, hh:mm a", "");

  const handlePress = (enquiry: EnquiryTypes) => {
    router.push(`/enquiry/${enquiry.id}` as any);
  };

  const renderCard = (enquiry: EnquiryTypes) => {
    const statusConfig = getStatusConfig(enquiry.status);
    const StatusIcon = statusConfig.icon;
    const productNames = getProductNames(enquiry);
    const phone =
      `${enquiry.diallingCode || ""} ${enquiry.mobile || ""}`.trim();
    const isApproved = enquiry.status === "approve";
    const isDeleting = deletingId === enquiry.id;

    return (
      <TouchableOpacity
        key={enquiry.id}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handlePress(enquiry)}
      >
        <div style={webStyle(styles.cardTopRow)}>
          <div style={webStyle(styles.avatar)}>
            <span style={webStyle(styles.avatarText)}>
              {enquiry.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={webStyle(styles.cardTitleBlock)}>
            <span style={webStyle(styles.nameText)}>{enquiry.name}</span>
            {productNames && (
              <span style={webStyle(styles.productText)}>{productNames}</span>
            )}
          </div>
          <div
            style={webStyle([
              styles.statusBadge,
              { backgroundColor: statusConfig.bgColor },
            ])}
          >
            <StatusIcon size={12} color={statusConfig.color} />
            <span
              style={webStyle([
                styles.statusText,
                { color: statusConfig.color },
              ])}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        <span style={webStyle(styles.messageText)}>{enquiry.message}</span>

        <div style={webStyle(styles.contactRow)}>
          <div style={webStyle(styles.contactItem)}>
            <Mail size={13} color={colors.gray500} />
            <span style={webStyle(styles.contactText)}>
              {enquiry.email || "No email"}
            </span>
          </div>
          <div style={webStyle(styles.contactItem)}>
            <Phone size={13} color={colors.gray500} />
            <span style={webStyle(styles.contactText)}>
              {phone || "No mobile"}
            </span>
          </div>
        </div>

        {enquiry.trackingId && (
          <div style={webStyle(styles.trackingRow)}>
            <span style={webStyle(styles.trackingLabel)}>Tracking ID:</span>
            <span style={webStyle(styles.trackingValue)}>
              {enquiry.trackingId}
            </span>
          </div>
        )}

        <div style={webStyle(styles.cardFooter)}>
          <div>
            <span style={webStyle(styles.dateText)}>
              {formatDate(enquiry.createdAt)}
            </span>
            {enquiry.timeline && enquiry.timeline.length > 0 && (
              <span style={webStyle(styles.timelineHint)}>
                Last: {enquiry.timeline[enquiry.timeline.length - 1]?.status}
              </span>
            )}
          </div>
          <div style={webStyle(styles.actionButtons)}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={(event) => {
                event.stopPropagation();
                handlePress(enquiry);
              }}
            >
              <Eye size={16} color={colors.primary} />
              <span style={webStyle(styles.viewButtonText)}>View</span>
            </TouchableOpacity>
            {!isApproved && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(event) => {
                  event.stopPropagation();
                  handleDelete(enquiry);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Trash2 size={16} color={colors.error} />
                )}
              </TouchableOpacity>
            )}
          </div>
        </div>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
        <div style={webStyle(styles.header)}>
          <div style={webStyle(styles.headerIcon)}>
            <MessageSquareText size={24} color="#fff" />
          </div>
          <div>
            <span style={webStyle(styles.title)}>Enquiry</span>
            <span style={webStyle(styles.subtitle)}>
              Customer enquiry requests
            </span>
          </div>
        </div>

        <div style={webStyle(styles.searchWrap)}>
          <Search size={18} color={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, tracking ID..."
            placeholderTextColor={colors.gray400}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={18} color={colors.gray500} />
            </TouchableOpacity>
          ) : null}
        </div>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsRow}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabChip, active && styles.activeTabChip]}
                onPress={() => setActiveTab(tab.key)}
              >
                <span
                  style={webStyle([
                    styles.tabText,
                    active && styles.activeTabText,
                  ])}
                >
                  {tab.label}
                </span>
                <span
                  style={webStyle([
                    styles.tabCount,
                    active && styles.activeTabText,
                  ])}
                >
                  {tab.count}
                </span>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <div style={webStyle(styles.centerState)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.stateText)}>Loading enquiries...</span>
          </div>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredEnquiries.length === 0 ? (
              <div style={webStyle(styles.emptyState)}>
                <MessageSquareText size={28} color={colors.gray400} />
                <span style={webStyle(styles.emptyTitle)}>
                  No enquiries found
                </span>
                <span style={webStyle(styles.emptyText)}>
                  {search || activeTab !== "all"
                    ? "Try changing your search or filters"
                    : "New customer enquiries will show here."}
                </span>
              </div>
            ) : (
              filteredEnquiries.map(renderCard)
            )}
          </ScrollView>
        )}
      </div>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: colors.primary,
    borderRadius: 28,
    gap: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 8,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.white },
  subtitle: { fontSize: 13, color: colors.white, opacity: 0.86, marginTop: 3 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.gray900,
  },
  tabsScroll: { maxHeight: 48, flexGrow: 0, marginTop: 14 },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  activeTabChip: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.primaryLight,
  },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  tabCount: { fontSize: 13, fontWeight: "700", color: colors.gray500 },
  activeTabText: { color: colors.primaryDark },
  list: { flex: 1 },
  listContent: { paddingTop: 18, paddingBottom: 28 },
  centerState: { flex: 1, justifyContent: "center", alignItems: "center" },
  stateText: { marginTop: 10, color: colors.gray500, fontWeight: "600" },
  card: {
    backgroundColor: "#FDFCFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + "18",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primaryPale,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: colors.primaryDark },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  nameText: { fontSize: 16, fontWeight: "800", color: colors.gray900 },
  productText: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  messageText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray600,
  },
  contactRow: { marginTop: 10, gap: 5 },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { flex: 1, fontSize: 12, color: colors.gray500 },
  trackingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: colors.gray100,
  },
  trackingLabel: { fontSize: 11, fontWeight: "600", color: colors.gray500 },
  trackingValue: {
    fontSize: 11,
    color: colors.gray600,
    fontFamily: "monospace",
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { fontSize: 11, color: colors.gray400, fontWeight: "600" },
  timelineHint: { fontSize: 10, color: colors.gray400, marginTop: 2 },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primaryPale,
  },
  viewButtonText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 360,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray800,
  },
  emptyText: { marginTop: 6, color: colors.gray500, fontSize: 13 },
});
