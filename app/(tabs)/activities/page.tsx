"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity, ArrowRight, RefreshCw } from "lucide-react";
import { colors } from "@/colors";
import ActivityService from "@/services/ActivityService";
import type { ActivityLog, ActivityModule } from "@/types/activity.types";
import { extractArrayPayload } from "@/utils/response";
import { formatDateValue } from "@/utils/date";

type ModuleFilter = "all" | ActivityModule;

const MODULE_TABS: { key: ModuleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expense", label: "Expense" },
  { key: "order", label: "Order" },
  { key: "transaction", label: "Transaction" },
  { key: "material_transaction", label: "Material" },
  { key: "financial_transaction", label: "Financial" },
  { key: "employee_transaction", label: "Employee Txn" },
  { key: "employee_attendance", label: "Attendance" },
  { key: "product", label: "Product" },
  { key: "party", label: "Party" },
  { key: "user", label: "User" },
];

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

function activityTone(action?: string) {
  const normalized = action?.toLowerCase();
  if (normalized === "delete" || normalized === "cancel") return "danger";
  if (normalized === "create" || normalized === "bulk_create") return "success";
  if (normalized === "update" || normalized === "status_update") return "warning";
  return "neutral";
}

function moduleLabel(module?: string) {
  return module
    ? module.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Activity";
}

export default function ActivitiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<ModuleFilter>("all");

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ActivityService.fetchRecentActivities({
        params: { limit: 50 },
      });
      if (res.success) {
        const data = extractArrayPayload<ActivityLog>(res, ["activities"]);
        setActivities(Array.isArray(data) ? data : []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error("[Activities] Error fetching:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  }, [fetchActivities]);

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return activities;
    return activities.filter((activity) => activity.module === activeFilter);
  }, [activities, activeFilter]);

  const formatDate = (value?: any) => formatDateValue(value, "dd MMM yyyy, hh:mm a");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <div style={webStyle(styles.page)}>
        <section style={webStyle(styles.hero)}>
          <div>
            <div style={webStyle(styles.kicker)}>Workspace feed</div>
            <h2 style={webStyle(styles.title)}>Activities</h2>
            <p style={webStyle(styles.subtitle)}>
              Track new orders, expenses, product updates, and employee changes in one place.
            </p>
          </div>
          <div style={webStyle(styles.heroActions)}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowRight size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing || loading}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <RefreshCw size={16} color="#fff" />
              )}
              <span style={webStyle(styles.refreshText)}>Refresh</span>
            </TouchableOpacity>
          </div>
        </section>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {MODULE_TABS.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <span style={webStyle([styles.tabText, active && styles.tabTextActive])}>
                  {tab.label}
                </span>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <div style={webStyle(styles.loadingWrap)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>Loading activities...</span>
          </div>
        ) : (
          <ScrollView
            style={styles.feedScroll}
            contentContainerStyle={styles.feedContent}
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
            {filteredActivities.length === 0 ? (
              <div style={webStyle(styles.empty)}>
                <Activity size={28} color={colors.gray300} />
                <strong style={webStyle(styles.emptyStrong)}>No activities found</strong>
                <span style={webStyle(styles.emptyText)}>
                  {activities.length === 0
                    ? "New edits, orders, expenses, and attendance changes will appear here."
                    : "Try a different filter."}
                </span>
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const tone = activityTone(activity.action);
                const badgeStyle =
                  tone === "success"
                    ? styles.badgeSuccess
                    : tone === "warning"
                      ? styles.badgeWarning
                      : tone === "danger"
                        ? styles.badgeDanger
                        : styles.badgeNeutral;
                const badgeTextColor =
                  tone === "success"
                    ? "#047857"
                    : tone === "warning"
                      ? "#B45309"
                      : tone === "danger"
                        ? "#B91C1C"
                        : colors.gray600;
                return (
                  <div key={activity.id} style={webStyle(styles.card)}>
                    <div style={webStyle(styles.cardHead)}>
                      <div style={webStyle([styles.badge, badgeStyle])}>
                        <span style={webStyle({ color: badgeTextColor, fontSize: 12, fontWeight: "800" })}>
                          {moduleLabel(activity.module).slice(0, 1)}
                        </span>
                      </div>
                      <div style={webStyle(styles.cardCopy)}>
                        <strong style={webStyle(styles.cardCopyText)}>
                          {activity.entityName || moduleLabel(activity.module)}
                        </strong>
                        <span style={webStyle(styles.cardCopySub)}>
                          {activityActionLabel(activity.action)}
                          {activity.description ? ` • ${activity.description}` : ""}
                        </span>
                      </div>
                      <div style={webStyle(styles.cardTime)}>
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>

                    <div style={webStyle(styles.cardMeta)}>
                      <div style={webStyle(styles.metaChip)}>
                        <span>{moduleLabel(activity.module)}</span>
                      </div>
                      <div style={webStyle([styles.metaChip, styles.metaChipMuted])}>
                        <span>{String(activity.status || "success").toUpperCase()}</span>
                      </div>
                      {typeof activity.amount === "number" && Number.isFinite(activity.amount) ? (
                        <div style={webStyle([styles.metaChip, styles.metaChipMoney])}>
                          <span>₹{Number(activity.amount).toLocaleString("en-IN")}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 14,
  },
  hero: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    margin: 0,
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 640,
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 19,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  refreshText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  tabsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  tab: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray700,
  },
  tabTextActive: {
    color: "#fff",
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    minHeight: 260,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray500,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: 24,
    gap: 12,
  },
  empty: {
    minHeight: 260,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    padding: 14,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray100,
  },
  badgeSuccess: {
    backgroundColor: "#D1FAE5",
  },
  badgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
  },
  badgeNeutral: {
    backgroundColor: colors.gray100,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardCopyText: {
    color: colors.gray900,
    fontSize: 14,
    fontWeight: "700",
  },
  cardCopySub: {
    color: colors.gray500,
    fontSize: 12,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
    textAlign: "right",
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryPale,
  },
  metaChipMuted: {
    backgroundColor: colors.gray100,
  },
  metaChipMoney: {
    backgroundColor: "#EDE9FE",
  },
  emptyStrong: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 19,
    maxWidth: 460,
  },
});
