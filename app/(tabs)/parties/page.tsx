"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Keyboard,
  ScrollView,
  webStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import PartyService from "@/services/PartyService";
import { Party } from "@/types/party";
import { colors } from "@/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice, isMd: isTablet } = getDeviceMetrics();

export default function PartiesScreen() {
  const router = useRouter();
  const [activeParties, setActiveParties] = useState<Party[]>([]);
  const [inactiveParties, setInactiveParties] = useState<Party[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingInactive, setLoadingInactive] = useState(true);
  const [errorActive, setErrorActive] = useState<string | null>(null);
  const [errorInactive, setErrorInactive] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const searchTimeoutRef = useRef<any>(null);

  const fetchActiveParties = async () => {
    try {
      setLoadingActive(true);
      setErrorActive(null);
      const res = await PartyService.fetchAllParty();
      setActiveParties(
        PartyService.extractPartyList<Party>(res).filter(
          (party) => party.isActive !== false,
        ),
      );
    } catch (error: any) {
      console.error("Failed to fetch active parties:", error);
      setErrorActive(error.message || "Failed to load active parties.");
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchInactiveParties = async () => {
    try {
      setLoadingInactive(true);
      setErrorInactive(null);
      const res = await PartyService.fetchAllInActiveParties();
      setInactiveParties(
        PartyService.extractPartyList<Party>(res).filter(
          (party) => party.isActive === false,
        ),
      );
    } catch (error: any) {
      console.error("Failed to fetch inactive parties:", error);
      setErrorInactive(error.message || "Failed to load inactive parties.");
    } finally {
      setLoadingInactive(false);
    }
  };

  const fetchAllParties = async () => {
    await Promise.all([fetchActiveParties(), fetchInactiveParties()]);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllParties();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setSearchTerm("");
    await fetchAllParties();
    setRefreshing(false);
  };

  const togglePartyStatus = async (
    id: string,
    name: string,
    currentStatus: boolean,
  ) => {
    const action = currentStatus ? "deactivate" : "activate";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Party`,
      `Are you sure you want to ${action} "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: currentStatus ? "destructive" : "default",
          onPress: async () => {
            try {
              setIsToggling(id);
              const res: any = await PartyService.deleteParty(id);

              if (res.success) {
                if (currentStatus) {
                  const party = activeParties.find((p) => p.id === id);
                  if (party) {
                    setActiveParties((prev) => prev.filter((p) => p.id !== id));
                    setInactiveParties((prev) => [
                      ...prev,
                      { ...party, isActive: false },
                    ]);
                  }
                  Alert.alert(
                    "Success",
                    res.message || "Party deactivated successfully",
                  );
                } else {
                  const party = inactiveParties.find((p) => p.id === id);
                  if (party) {
                    setInactiveParties((prev) =>
                      prev.filter((p) => p.id !== id),
                    );
                    setActiveParties((prev) => [
                      ...prev,
                      { ...party, isActive: true },
                    ]);
                  }
                  Alert.alert(
                    "Success",
                    res.message || "Party activated successfully",
                  );
                }
              } else {
                Alert.alert(
                  "Error",
                  res.message || `Failed to ${action} party`,
                );
              }
            } catch (error: any) {
              console.error(`${action} error:`, error);
              Alert.alert(
                "Error",
                `Failed to ${action} party. Please try again.`,
              );
            } finally {
              setIsToggling(null);
            }
          },
        },
      ],
    );
  };

  const filterParties = (parties: Party[]) => {
    if (!searchTerm) return parties;
    const term = searchTerm.toLowerCase();
    return parties.filter(
      (party) =>
        party.name.toLowerCase().includes(term) ||
        party.mobile?.includes(term) ||
        party.gstNumber?.toLowerCase().includes(term),
    );
  };

  const filteredActive = filterParties(activeParties);
  const filteredInactive = filterParties(inactiveParties);

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    Keyboard.dismiss();
  };

  const LoadingSkeleton = () => (
    <div style={webStyle(styles.skeletonContainer)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={webStyle(styles.skeletonCard)}>
          <div style={webStyle(styles.skeletonHeader)}>
            <div style={webStyle(styles.skeletonIcon)} />
            <div style={webStyle(styles.skeletonTextContainer)}>
              <div style={webStyle(styles.skeletonTitle)} />
              <div style={webStyle(styles.skeletonSubtitle)} />
            </div>
          </div>
          <div style={webStyle(styles.skeletonActions)}>
            <div style={webStyle(styles.skeletonButton)} />
            <div style={webStyle(styles.skeletonButton)} />
          </div>
        </div>
      ))}
    </div>
  );

  const ErrorDisplay = ({
    error,
    onRetry,
  }: {
    error: string;
    onRetry: () => void;
  }) => (
    <div style={webStyle(styles.errorContainer)}>
      <div style={webStyle(styles.errorIconContainer)}>
        <Ionicons
          name="alert-circle"
          size={isTablet ? 48 : 40}
          color={colors.red}
        />
      </div>
      <span style={webStyle(styles.errorTitle)}>Unable to Load</span>
      <span style={webStyle(styles.errorMessage)}>{error}</span>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color="white" />
        <span style={webStyle(styles.retryButtonText)}>Try Again</span>
      </TouchableOpacity>
    </div>
  );

  const EmptyState = ({
    message,
    showAddButton = false,
  }: {
    message: string;
    showAddButton?: boolean;
  }) => (
    <div style={webStyle(styles.emptyContainer)}>
      <Ionicons
        name="search"
        size={isTablet ? 64 : 48}
        color={colors.inactiveTabLabel}
      />
      <span style={webStyle(styles.emptyTitle)}>{message}</span>
      {showAddButton && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push("/parties/add")}
        >
          <Ionicons name="add" size={20} color="white" />
          <span style={webStyle(styles.emptyButtonText)}>Add New Parties</span>
        </TouchableOpacity>
      )}
    </div>
  );

  const TableHeader = () => (
    <div style={webStyle(styles.tableHeader)}>
      <div style={webStyle([styles.headerCell, styles.headerCellName])}>
        <span style={webStyle(styles.headerText)}>Party Name</span>
      </div>
      <div style={webStyle([styles.headerCell, styles.headerCellMobile])}>
        <span style={webStyle(styles.headerText)}>Mobile</span>
      </div>
      <div style={webStyle([styles.headerCell, styles.headerCellActions])}>
        <span style={webStyle(styles.headerText)}>Actions</span>
      </div>
    </div>
  );

  const PartyCard = ({
    party,
    actionType,
    onToggle,
    isLoading,
  }: {
    party: Party;
    actionType: "delete" | "activate";
    onToggle: (id: string, name: string, currentStatus: boolean) => void;
    isLoading: boolean;
  }) => (
    <TouchableOpacity
      style={styles.partyCard}
      onPress={() => router.push(`/parties/partiesDigital/${party.id}`)}
      activeOpacity={0.7}
    >
      <div style={webStyle(styles.partyContent)}>
        <div style={webStyle(styles.partyRow)}>
          <div style={webStyle(styles.partyNameSection)}>
            <div style={webStyle(styles.partyIconContainer)}>
              <Ionicons name="business" size={20} color={colors.primary} />
            </div>
            <div style={webStyle(styles.partyInfo)}>
              <span style={webStyle(styles.partyName)}>{party.name}</span>
              {party.address && (
                <span style={webStyle(styles.partyAddress)}>
                  {party.address}
                </span>
              )}
            </div>
          </div>

          <div style={webStyle(styles.partyMobileSection)}>
            <span style={webStyle(styles.partyMobile)}>
              {party.mobile || "Not provided"}
            </span>
          </div>

          <div style={webStyle(styles.partyActionsSection)}>
            <div style={webStyle(styles.actionButtons)}>
              {party.isActive && (
                <TouchableOpacity
                  onPress={() => router.push(`/parties/edit/${party.id}`)}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() =>
                  onToggle(party.id, party.name, party.isActive ?? false)
                }
                disabled={isLoading}
                style={styles.iconButton}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={actionType === "delete" ? colors.red : colors.green}
                  />
                ) : (
                  <Ionicons
                    name={
                      actionType === "delete"
                        ? "trash-outline"
                        : "refresh-outline"
                    }
                    size={20}
                    color={actionType === "delete" ? colors.red : colors.green}
                  />
                )}
              </TouchableOpacity>
            </div>
          </div>
        </div>
      </div>
    </TouchableOpacity>
  );

  const renderPartyItem = ({ item }: { item: Party }) => (
    <PartyCard
      party={item}
      actionType={activeTab === "active" ? "delete" : "activate"}
      onToggle={togglePartyStatus}
      isLoading={isToggling === item.id}
    />
  );

  const StatsCard = ({
    label,
    value,
    loading,
  }: {
    label: string;
    value: number;
    loading: boolean;
  }) => (
    <div style={webStyle(styles.statCard)}>
      <span style={webStyle(styles.statLabel)}>{label}</span>
      {loading ? (
        <div style={webStyle(styles.statSkeleton)} />
      ) : (
        <span style={webStyle(styles.statValue)}>{value}</span>
      )}
    </div>
  );

  const getKey = (item: Party, index: number) => `${item.id}_${index}`;

  const renderContent = () => {
    const isLoading = activeTab === "active" ? loadingActive : loadingInactive;
    const error = activeTab === "active" ? errorActive : errorInactive;
    const parties = activeTab === "active" ? filteredActive : filteredInactive;
    const isSearchActive = searchTerm.length > 0;

    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return (
        <ErrorDisplay
          error={error}
          onRetry={
            activeTab === "active" ? fetchActiveParties : fetchInactiveParties
          }
        />
      );
    }

    if (parties.length === 0) {
      return (
        <EmptyState
          message={
            isSearchActive
              ? "No matching parties found"
              : `No ${activeTab === "active" ? "active" : "inactive"} parties yet`
          }
          showAddButton={activeTab === "active" && !isSearchActive}
        />
      );
    }

    return (
      <>
        <TableHeader />
        <FlatList
          data={parties}
          renderItem={renderPartyItem}
          keyExtractor={getKey}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <div style={webStyle(styles.header)}>
        <div style={webStyle(styles.headerContent)}>
          <div style={webStyle(styles.headerIcon)}>
            <Ionicons name="people" size={isTablet ? 32 : 28} color="white" />
          </div>
          <div style={webStyle(styles.headerText)}>
            <span style={webStyle(styles.title)}>Parties</span>
            <span style={webStyle(styles.subtitle)}>
              Manage your customer and supplier parties
            </span>
          </div>
        </div>

        <TouchableOpacity
          onPress={onRefresh}
          disabled={refreshing || loadingActive || loadingInactive}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={isTablet ? 28 : 24} color="white" />
          )}
        </TouchableOpacity>
      </div>

      <div style={webStyle(styles.content)}>
        <div style={webStyle(styles.searchContainer)}>
          <div style={webStyle(styles.searchWrapper)}>
            <Ionicons
              name="search"
              size={20}
              color={colors.inactiveTabLabel}
              style={styles.searchIcon}
            />
            <TextInput
              className="rn-search-input"
              style={styles.searchInput}
              placeholder="Search parties by name, mobile, or GST..."
              placeholderTextColor={colors.inactiveTabLabel}
              value={searchTerm}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.inactiveTabLabel}
                />
              </TouchableOpacity>
            )}
          </div>
        </div>

        <div style={webStyle(styles.statsContainer)}>
          <StatsCard
            label="Active Parties"
            value={activeParties.length}
            loading={loadingActive}
          />
          <StatsCard
            label="Inactive Parties"
            value={inactiveParties.length}
            loading={loadingInactive}
          />
        </div>

        <div style={webStyle(styles.tabsContainer)}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "active" && styles.activeTab]}
            onPress={() => setActiveTab("active")}
          >
            <span
              style={webStyle([
                styles.tabText,
                activeTab === "active" && styles.activeTabText,
              ])}
            >
              Active Parties
            </span>
            {!loadingActive && activeParties.length > 0 && (
              <div style={webStyle(styles.tabBadge)}>
                <span style={webStyle(styles.tabBadgeText)}>
                  {activeParties.length}
                </span>
              </div>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "inactive" && styles.activeTab]}
            onPress={() => setActiveTab("inactive")}
          >
            <span
              style={webStyle([
                styles.tabText,
                activeTab === "inactive" && styles.activeTabText,
              ])}
            >
              Inactive Parties
            </span>
            {!loadingInactive && inactiveParties.length > 0 && (
              <div style={webStyle(styles.tabBadge)}>
                <span style={webStyle(styles.tabBadgeText)}>
                  {inactiveParties.length}
                </span>
              </div>
            )}
          </TouchableOpacity>
        </div>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/parties/add")}
        >
          <Ionicons name="add" size={22} color="white" />
          <span style={webStyle(styles.addButtonText)}>Add New Parties</span>
        </TouchableOpacity>

        {/* Main List */}
        <ScrollView
          style={styles.mainList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          <div style={webStyle(styles.partyListContainer)}>
            {renderContent()}
          </div>
        </ScrollView>
      </div>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 12 : 20,
    paddingVertical: isTablet ? 20 : isSmallDevice ? 12 : 16,
    backgroundColor: colors.primary,
    borderRadius: isTablet ? 28 : 22,
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
    width: isTablet ? 56 : isSmallDevice ? 42 : 52,
    height: isTablet ? 56 : isSmallDevice ? 42 : 52,
    borderRadius: isTablet ? 16 : 12,
    backgroundColor: colors.primary + "80",
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 16 : isSmallDevice ? 10 : 14,
  },

  title: {
    fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
    fontWeight: "800",
    color: colors.secondary,
  },
  subtitle: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: colors.secondary,
    opacity: 0.9,
    marginTop: 2,
  },
  refreshButton: {
    padding: isTablet ? 12 : isSmallDevice ? 8 : 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  content: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 0 : 2,
  },
  searchContainer: {
    marginTop: isTablet ? 24 : isSmallDevice ? 12 : 20,
    marginBottom: isTablet ? 20 : isSmallDevice ? 10 : 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: isTablet ? 18 : 14,
    paddingHorizontal: isTablet ? 20 : isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    height: isTablet ? 52 : isSmallDevice ? 42 : 48,
  },
  searchIcon: {
    marginRight: isTablet ? 16 : isSmallDevice ? 8 : 12,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.text,
    fontWeight: "500",
    height: "100%",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isTablet ? 14 : isSmallDevice ? 8 : 12,
    marginBottom: isTablet ? 24 : isSmallDevice ? 12 : 20,
  },
  statCard: {
    flex: 1,
    minWidth: isSmallDevice ? "45%" : 180,
    backgroundColor: colors.white,
    borderRadius: isTablet ? 18 : 14,
    padding: isTablet ? 18 : isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: "center",
  },
  statLabel: {
    fontSize: isTablet ? 13 : 12,
    color: colors.gray600,
    fontWeight: "600",
    marginBottom: isTablet ? 8 : 6,
    textAlign: "center",
  },
  statValue: {
    fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
    fontWeight: "800",
    color: colors.primary,
  },
  statTime: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: "600",
    color: colors.primary,
  },
  statSkeleton: {
    width: 50,
    height: isTablet ? 32 : 28,
    backgroundColor: colors.primary + "20",
    borderRadius: 6,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + "20",
    marginBottom: isTablet ? 20 : isSmallDevice ? 10 : 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isTablet ? 14 : isSmallDevice ? 9 : 12,
    paddingHorizontal: isSmallDevice ? 8 : 16,
    gap: isSmallDevice ? 5 : 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: "600",
    color: colors.gray600,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: isTablet ? 16 : isSmallDevice ? 11 : 14,
    borderRadius: isTablet ? 18 : 14,
    marginBottom: isTablet ? 20 : isSmallDevice ? 10 : 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: "white",
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700",
  },
  mainList: {
    flex: 1,
  },
  partyListContainer: {
    backgroundColor: colors.white,
    borderRadius: isTablet ? 20 : isSmallDevice ? 14 : 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.primary + "20",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 10 : 16,
    paddingVertical: isTablet ? 14 : isSmallDevice ? 9 : 12,
    backgroundColor: colors.primaryFaint,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + "20",
  },
  headerCell: {
    justifyContent: "center",
  },
  headerCellName: {
    flex: 2,
  },
  headerCellMobile: {
    flex: 1.5,
  },
  headerCellActions: {
    width: isSmallDevice ? 58 : 80,
    alignItems: "flex-end",
  },
  headerText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: "600",
    color: colors.gray600,
    opacity: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  partyCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + "10",
  },
  partyContent: {
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 10 : 16,
    paddingVertical: isTablet ? 14 : isSmallDevice ? 9 : 12,
  },
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  partyNameSection: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 12 : isSmallDevice ? 7 : 10,
  },
  partyIconContainer: {
    width: isSmallDevice ? 32 : 40,
    height: isSmallDevice ? 32 : 40,
    borderRadius: isSmallDevice ? 8 : 10,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: isTablet ? 16 : isSmallDevice ? 13 : 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  partyAddress: {
    fontSize: isTablet ? 12 : 11,
    color: colors.gray500,
  },
  partyMobileSection: {
    flex: 1.5,
  },
  partyMobile: {
    fontSize: isTablet ? 14 : isSmallDevice ? 12 : 13,
    color: colors.text,
  },
  partyActionsSection: {
    width: isSmallDevice ? 58 : 80,
    alignItems: "flex-end",
  },
  actionButtons: {
    flexDirection: "row",
    gap: isTablet ? 16 : isSmallDevice ? 8 : 12,
  },
  iconButton: {
    width: isSmallDevice ? 32 : 36,
    height: isSmallDevice ? 32 : 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray50,
  },
  skeletonContainer: {
    padding: isTablet ? 24 : 16,
  },
  skeletonCard: {
    marginBottom: isTablet ? 16 : 12,
    padding: isTablet ? 20 : 16,
    backgroundColor: colors.secondary,
    borderRadius: isTablet ? 16 : 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary + "20",
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    width: "70%",
    backgroundColor: colors.primary + "20",
    borderRadius: 6,
    marginBottom: 6,
  },
  skeletonSubtitle: {
    height: 12,
    width: "50%",
    backgroundColor: colors.primary + "15",
    borderRadius: 6,
  },
  skeletonActions: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
  },
  errorContainer: {
    padding: isTablet ? 48 : isSmallDevice ? 24 : 32,
    alignItems: "center",
  },
  errorIconContainer: {
    width: isTablet ? 80 : 64,
    height: isTablet ? 80 : 64,
    borderRadius: 40,
    backgroundColor: colors.red + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: isTablet ? 16 : 14,
    color: colors.primarytext,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: isTablet ? 48 : 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyButtonText: {
    color: "white",
    fontSize: isTablet ? 16 : 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: isTablet ? "row" : "column",
    justifyContent: "space-between",
    alignItems: isTablet ? "center" : "flex-start",
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.primary + "20",
    marginTop: 8,
  },
  footerText: {
    fontSize: isTablet ? 13 : 12,
    color: colors.primarytext,
  },
  legendContainer: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: isTablet ? 12 : 11,
    color: colors.primarytext,
  },
});
