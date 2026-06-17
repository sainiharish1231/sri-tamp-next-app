"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Toast } from "@/utils/toast";

import {
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Keyboard,
  webStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserService from "@/services/UserService";
import CountriesService from "@/services/CountriesService";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { colors } from "@/colors";
import Toast from "@/utils/Toast";
import RestoreConfirmModal from "@/components/RestoreConfirmModal";
import { getDeviceMetrics } from "@/utils/responsive";
import { extractArrayPayload, extractPagePayload } from "@/utils/response";
const { isXs: isSmallDevice, isMd: isTablet } = getDeviceMetrics();

const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; icon: string; label: string }
> = {
  admin: {
    bg: colors.primary + "10",
    text: colors.primary,
    icon: "👑",
    label: "Admin",
  },
  internal_user: {
    bg: colors.blue + "10",
    text: colors.blue,
    icon: "👤",
    label: "Internal",
  },
  party: {
    bg: colors.green + "10",
    text: colors.green,
    icon: "🤝",
    label: "Party",
  },
};

type TabType = "active" | "inactive";

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  
  const [searchMode, setSearchMode] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const pageSize = isTablet ? 10 : isSmallDevice ? 8 : 10;
  const flatListRef = useRef<FlatList>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response: any = await CountriesService.fetchAllCategory();
        setCountries(extractArrayPayload<any>(response));
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      }
    };
    fetchCountries();
  }, []);

  const fetchUsers = async (isLoadMore = false, searchQuery = "") => {
    if (isLoadMore && !hasMore) return;

    try {
      if (!isLoadMore) {
        setLoading(true);
        setSearchMode(!!searchQuery);
      } else {
        setLoadingMore(true);
      }

      const params: Record<string, any> = { limit: pageSize };

      if (isLoadMore && cursor) {
        params.cursor = cursor;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
        setSearchMode(true);
      }

      const res = await UserService.fetchAllUsers({ params });

      if (res.success) {
        const page = extractPagePayload<any>(res, ["users"]);
        const newUsers = page.data;
        const nextCursor = page.nextCursor;

        if (isLoadMore) {
          const existingIds = new Set(users.map((u) => u.id));
          const uniqueNewUsers = (newUsers as any[]).filter(
            (u: any) => !existingIds.has(u.id),
          );
          if (uniqueNewUsers.length > 0) {
            setUsers((prev) => [...prev, ...uniqueNewUsers]);
          }
        } else {
          setUsers(newUsers as any[]);
        }

        
        setHasMore(page.hasMore);
        setCursor(nextCursor);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load users",
        });
      }
    } catch (error: any) {
      console.error("Fetch users error:", error);
      if (!isLoadMore) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to load users",
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setCursor(null);
    setSearchMode(false);
    setSearchTerm("");
    await fetchUsers();
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading && !searchMode) {
      fetchUsers(true);
    }
  };

  const performSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (!query.trim()) {
      setSearchMode(false);
      setCursor(null);
      fetchUsers();
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await fetchUsers(false, query);
    }, 500);
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    performSearch(text);
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (searchTerm.trim()) {
      fetchUsers(false, searchTerm);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchMode(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    fetchUsers();
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchUsers();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const getCountry = (countryId?: string): any | undefined => {
    if (!countryId || !countries.length) return undefined;
    return countries.find((c) => c.id === countryId);
  };

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await UserService.deleteUser(deleteTarget.id);
      if (res.success) {
       
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        
        Toast.show({
          type: "success",
          text1: "Deleted",
          text2: res.message || "User deleted successfully",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to delete user",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to delete user",
      });
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setDeleteTarget(null);
    }
  };

  const openRestoreModal = (id: string, name: string) => {
    setRestoreTarget({ id, name });
    setRestoreModalVisible(true);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      setRestoring(true);
      const res = await UserService.deleteUser(restoreTarget.id);
      if (res.success) {
       
        setUsers((prev) =>
          prev.map((user) =>
            user.id === restoreTarget.id ? { ...user, isActive: true } : user,
          ),
        );
        Toast.show({
          type: "success",
          text1: "Restored",
          text2: `${restoreTarget.name} has been restored successfully`,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to restore user",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to restore user",
      });
    } finally {
      setRestoring(false);
      setRestoreModalVisible(false);
      setRestoreTarget(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUserKey = (item: any, index: number): string => {
    return `${item.id}_${index}`;
  };

 
  const getFilteredUsers = () => {
    if (activeTab === "active") {
      return users.filter((user) => user.isActive === true);
    } else {
      return users.filter((user) => user.isActive === false);
    }
  };

  const filteredUsers = getFilteredUsers();

  const renderUserItem = ({ item }: { item: any }) => {
    const country = getCountry(item.countryId);
    const roleStyle = ROLE_STYLES[item.role] || ROLE_STYLES.internal_user;
    const isActive = item.isActive === true;

    return (
      <TouchableOpacity
        style={[styles.userCard, !isActive && styles.inactiveUserCard]}
        onPress={() => router.push(`/users/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <div style={webStyle(styles.userContent)}>
          {country ? (
            <div style={webStyle(styles.cardCountryBadge)}>
              <span style={webStyle(styles.cardCountryText)}>
                {country.dialling_code}
              </span>
            </div>
          ) : null}

          {!isActive && (
            <div style={webStyle(styles.inactiveBadge)}>
              <span style={webStyle(styles.inactiveBadgeText)}>Inactive</span>
            </div>
          )}

          <div style={webStyle(styles.userHeader)}>
            <div style={webStyle(styles.userNameContainer)}>
              <div
                style={webStyle([
                  styles.userIconContainer,
                  { backgroundColor: roleStyle.bg },
                ])}
              >
                <span style={webStyle(styles.userIconText)}>
                  {getInitials(item.name)}
                </span>
              </div>
              <div style={webStyle(styles.userInfoContainer)}>
                <span style={webStyle(styles.userName)}>
                  {item.name}
                </span>
                <div style={webStyle(styles.userRoleBadge)}>
                  <span style={webStyle(styles.userRoleText)}>
                    {roleStyle.icon} {roleStyle.label}
                  </span>
                </div>
              </div>
            </div>
            <div style={webStyle(styles.balanceBadge)}>
              <Ionicons
                name={item.balance >= 0 ? "trending-up" : "trending-down"}
                size={isTablet ? 18 : isSmallDevice ? 14 : 16}
                color={item.balance >= 0 ? colors.green : colors.red}
              />
              <span
                style={webStyle([
                  styles.balanceText,
                  {
                    color: item.balance >= 0 ? colors.green : colors.red,
                  },
                ])}
              >
                {formatCurrency(Math.abs(item.balance))}
              </span>
            </div>
          </div>

          <div style={webStyle(styles.userDetails)}>
            {item.phone ? (
              <div style={webStyle(styles.userDetail)}>
                <Ionicons
                  name="call"
                  size={isTablet ? 18 : isSmallDevice ? 14 : 16}
                  color={colors.primary + "80"}
                />
                <span style={webStyle(styles.detailText)}>
                  {country ? `${country.flag} ` : ""}
                  {item.phone}
                </span>
              </div>
            ) : null}

            {item.email ? (
              <div style={webStyle(styles.userDetail)}>
                <Ionicons
                  name="mail"
                  size={isTablet ? 18 : isSmallDevice ? 14 : 16}
                  color={colors.primary + "80"}
                />
                <span style={webStyle(styles.detailText)}>
                  {item.email}
                </span>
              </div>
            ) : null}

            {item.partyId ? (
              <div style={webStyle(styles.userDetail)}>
                <Ionicons
                  name="business"
                  size={isTablet ? 18 : isSmallDevice ? 14 : 16}
                  color={colors.primary + "80"}
                />
                <span style={webStyle(styles.detailText)}>
                  Party ID: {item.partyId.slice(0, 8)}...
                </span>
              </div>
            ) : null}

            {item.address ? (
              <div style={webStyle(styles.userDetail)}>
                <Ionicons
                  name="location"
                  size={isTablet ? 18 : isSmallDevice ? 14 : 16}
                  color={colors.primary + "80"}
                />
                <span style={webStyle(styles.detailText)}>
                  {item.address}
                </span>
              </div>
            ) : null}
          </div>

          <div style={webStyle(styles.actionButtons)}>
            {isActive ? (
              <>
                <TouchableOpacity
                  onPress={() => router.push(`/users/edit/${item.id}` as any)}
                  style={[styles.actionButton, styles.editButton]}
                >
                  <Ionicons
                    name="create"
                    size={isTablet ? 20 : isSmallDevice ? 16 : 18}
                    color={colors.primary}
                  />
                  <span
                    style={webStyle([styles.actionButtonText, styles.editButtonText])}
                  >
                    Edit
                  </span>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openDeleteModal(item.id, item.name)}
                  style={[styles.actionButton, styles.deleteButtonStyle]}
                >
                  <Ionicons
                    name="trash"
                    size={isTablet ? 20 : isSmallDevice ? 16 : 18}
                    color={colors.red}
                  />
                  <span
                    style={webStyle([styles.actionButtonText, styles.deleteButtonText])}
                  >
                    Delete
                  </span>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => openRestoreModal(item.id, item.name)}
                style={[styles.actionButton, styles.restoreButton]}
              >
                <Ionicons
                  name="refresh-circle"
                  size={isTablet ? 20 : isSmallDevice ? 16 : 18}
                  color={colors.green}
                />
                <span
                  style={webStyle([styles.actionButtonText, styles.restoreButtonText])}
                >
                  Restore
                </span>
              </TouchableOpacity>
            )}
          </div>
        </div>
      </TouchableOpacity>
    );
  };

  const StatsCard = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div style={webStyle(styles.statCard)}>
      <span style={webStyle(styles.statLabel)}>{label}</span>
      <span style={webStyle(styles.statValue)}>{value}</span>
    </div>
  );

  const ListFooter = () => {
    if (searchMode || !hasMore || users.length === 0) return null;

    return (
      <div style={webStyle(styles.footerLoader)}>
        {loadingMore ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <span style={webStyle(styles.loadingMoreText)}>Loading more users...</span>
          </>
        ) : null}
      </div>
    );
  };

  const ListEmptyComponent = () => {
    if (loading) return null;

    return (
      <div style={webStyle(styles.emptyContainer)}>
        <Ionicons
          name="people-outline"
          size={isTablet ? 80 : isSmallDevice ? 48 : 64}
          color={colors.primary + "40"}
        />
        <span style={webStyle(styles.emptyTitle)}>
          {searchMode
            ? "No users found"
            : activeTab === "active"
              ? "No active users"
              : "No inactive users"}
        </span>
        <span style={webStyle(styles.emptySubtitle)}>
          {searchMode
            ? "Try adjusting your search terms"
            : activeTab === "active"
              ? "Get started by adding your first user"
              : "No inactive users at the moment"}
        </span>
        {!searchMode && activeTab === "active" ? (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/users/add" as any)}
          >
            <Ionicons name="add" size={20} color="white" />
            <span style={webStyle(styles.emptyButtonText)}>Add New User</span>
          </TouchableOpacity>
        ) : null}
      </div>
    );
  };

  const renderTabs = () => (
    <div style={webStyle(styles.tabsContainer)}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "active" && styles.activeTab]}
        onPress={() => setActiveTab("active")}
      >
        <Ionicons
          name="people"
          size={isTablet ? 22 : isSmallDevice ? 16 : 20}
          color={activeTab === "active" ? colors.primary : colors.gray500}
        />
        <span
          style={webStyle([
            styles.tabText,
            activeTab === "active" && styles.activeTabText,
          ])}
        >
          Active Users
        </span>
        <div style={webStyle(styles.tabBadge)}>
          <span style={webStyle(styles.tabBadgeText)}>
            {users.filter((u) => u.isActive === true).length}
          </span>
        </div>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "inactive" && styles.activeTab]}
        onPress={() => setActiveTab("inactive")}
      >
        <Ionicons
          name="people-outline"
          size={isTablet ? 22 : isSmallDevice ? 16 : 20}
          color={activeTab === "inactive" ? colors.primary : colors.gray500}
        />
        <span
          style={webStyle([
            styles.tabText,
            activeTab === "inactive" && styles.activeTabText,
          ])}
        >
          Inactive Users
        </span>
        <div style={webStyle([styles.tabBadge, styles.inactiveTabBadge])}>
          <span style={webStyle(styles.tabBadgeText)}>
            {users.filter((u) => u.isActive === false).length}
          </span>
        </div>
      </TouchableOpacity>
    </div>
  );

  return (
    <div style={webStyle(styles.container)}>
      <div style={webStyle(styles.header)}>
        <div style={webStyle(styles.headerContent)}>
          <div style={webStyle(styles.headerIcon)}>
            <Ionicons
              name="people"
              size={isTablet ? 32 : isSmallDevice ? 24 : 28}
              color="white"
            />
          </div>
          <div style={webStyle(styles.headerText)}>
            <span style={webStyle(styles.title)}>Users</span>
            <span style={webStyle(styles.subtitle)}>Manage your users and accounts</span>
          </div>
        </div>

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
              size={isTablet ? 28 : isSmallDevice ? 20 : 24}
              color="white"
            />
          )}
        </TouchableOpacity>
      </div>

      <div style={webStyle(styles.content)}>
        <div style={webStyle(styles.searchContainer)}>
          <div style={webStyle(styles.searchWrapper)}>
            <Ionicons
              name="search"
              size={isTablet ? 22 : isSmallDevice ? 16 : 20}
              color={colors.inactiveTabLabel}
              style={styles.searchIconStyle}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, or email..."
              placeholderTextColor={colors.inactiveTabLabel}
              value={searchTerm}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
            />
            {searchTerm.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={isTablet ? 22 : isSmallDevice ? 16 : 20}
                  color={colors.inactiveTabLabel}
                />
              </TouchableOpacity>
            ) : null}
          </div>
        </div>

        {renderTabs()}

        <div style={webStyle(styles.statsContainer)}>
          <StatsCard
            label={activeTab === "active" ? "Active Users" : "Inactive Users"}
            value={filteredUsers.length}
          />
          <StatsCard label="Total Users" value={users.length} />
          {searchMode ? (
            <div style={webStyle(styles.searchBadge)}>
              <Ionicons name="search" size={16} color={colors.primary} />
              <span style={webStyle(styles.searchBadgeText)}>Search</span>
            </div>
          ) : null}
        </div>

        <div style={webStyle(styles.actionContainer)}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/users/add" as any)}
          >
            <Ionicons
              name="add"
              size={isTablet ? 24 : isSmallDevice ? 18 : 22}
              color="white"
            />
            <span style={webStyle(styles.primaryButtonText)}>New User</span>
          </TouchableOpacity>
        </div>

        {loading && !refreshing ? (
          <div style={webStyle(styles.centerLoader)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>Loading users...</span>
          </div>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={getUserKey}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={[
              styles.listContent,
              filteredUsers.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={pageSize}
            maxToRenderPerBatch={pageSize}
            windowSize={21}
            removeClippedSubviews={true}
          />
        )}
      </div>

      
      <DeleteConfirmModal
        visible={deleteModalVisible}
        message="Are you sure you want to delete this user? This action cannot be undone."
        itemName={deleteTarget?.name}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeleteTarget(null);
        }}
      />

      <RestoreConfirmModal
        visible={restoreModalVisible}
        message="Are you sure you want to restore this user?"
        itemName={restoreTarget?.name}
        loading={restoring}
        onConfirm={confirmRestore}
        onCancel={() => {
          setRestoreModalVisible(false);
          setRestoreTarget(null);
        }}
      />
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 16 : 20,
    paddingTop: isTablet ? 40 : isSmallDevice ? 45 : 36,
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
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 16 : isSmallDevice ? 12 : 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
    fontWeight: "800" as const,
    color: "white",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: "white",
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
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 16 : 20,
  },
  searchContainer: {
    marginTop: isTablet ? 24 : isSmallDevice ? 16 : 20,
    marginBottom: isTablet ? 20 : isSmallDevice ? 12 : 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: isTablet ? 16 : 12,
    paddingHorizontal: isTablet ? 20 : isSmallDevice ? 12 : 16,
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
    height: isTablet ? 56 : isSmallDevice ? 44 : 52,
  },
  searchIconStyle: {
    marginRight: isTablet ? 16 : isSmallDevice ? 8 : 12,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.text,
    fontWeight: "500" as const,
    height: "100%",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: isTablet ? 16 : isSmallDevice ? 8 : 12,
    marginBottom: isTablet ? 20 : isSmallDevice ? 12 : 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isTablet ? 12 : isSmallDevice ? 6 : 8,
    backgroundColor: colors.white,
    paddingVertical: isTablet ? 14 : isSmallDevice ? 10 : 12,
    paddingHorizontal: isTablet ? 20 : isSmallDevice ? 12 : 16,
    borderRadius: isTablet ? 16 : 12,
    borderWidth: 2,
    borderColor: colors.primary + "20",
  },
  activeTab: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  tabText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    fontWeight: "600" as const,
    color: colors.gray500,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: isTablet ? 10 : isSmallDevice ? 6 : 8,
    paddingVertical: isTablet ? 4 : isSmallDevice ? 2 : 3,
    borderRadius: 12,
    minWidth: isTablet ? 28 : isSmallDevice ? 20 : 24,
    alignItems: "center",
  },
  inactiveTabBadge: {
    backgroundColor: colors.red + "20",
  },
  tabBadgeText: {
    fontSize: isTablet ? 12 : isSmallDevice ? 10 : 11,
    fontWeight: "700" as const,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 16 : isSmallDevice ? 8 : 12,
    marginBottom: isTablet ? 20 : isSmallDevice ? 12 : 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 20 : isSmallDevice ? 12 : 16,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: colors.gray500,
    fontWeight: "600" as const,
    marginBottom: isTablet ? 8 : isSmallDevice ? 4 : 6,
    opacity: 0.9,
  },
  statValue: {
    fontSize: isTablet ? 32 : isSmallDevice ? 20 : 28,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  searchBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    paddingHorizontal: isTablet ? 16 : isSmallDevice ? 10 : 12,
    paddingVertical: isTablet ? 10 : isSmallDevice ? 6 : 8,
    borderRadius: 20,
    gap: isTablet ? 8 : isSmallDevice ? 4 : 6,
  },
  searchBadgeText: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: colors.primary,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  actionContainer: {
    flexDirection: "row",
    gap: isTablet ? 16 : isSmallDevice ? 8 : 12,
    marginBottom: isTablet ? 24 : isSmallDevice ? 16 : 20,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isTablet ? 10 : isSmallDevice ? 6 : 8,
    backgroundColor: colors.primary,
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 16 : 20,
    paddingVertical: isTablet ? 18 : isSmallDevice ? 14 : 16,
    borderRadius: isTablet ? 16 : 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "white",
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray500,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingBottom: isTablet ? 40 : isSmallDevice ? 20 : 30,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  userCard: {
    backgroundColor: colors.white,
    borderRadius: isTablet ? 20 : 16,
    marginBottom: isTablet ? 16 : isSmallDevice ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveUserCard: {
    opacity: 0.85,
    backgroundColor: colors.gray100,
  },
  userContent: {
    padding: isTablet ? 24 : isSmallDevice ? 16 : 20,
  },
  cardCountryBadge: {
    position: "absolute",
    top: isTablet ? 12 : 8,
    right: isTablet ? 12 : 8,
    backgroundColor: colors.primary + "10",
    paddingHorizontal: isTablet ? 10 : 8,
    paddingVertical: isTablet ? 6 : 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  cardCountryText: {
    fontSize: isTablet ? 12 : isSmallDevice ? 8 : 10,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  inactiveBadge: {
    position: "absolute",
    top: isTablet ? 12 : 8,
    left: isTablet ? 12 : 8,
    backgroundColor: colors.red,
    paddingHorizontal: isTablet ? 10 : 8,
    paddingVertical: isTablet ? 6 : 4,
    borderRadius: 16,
  },
  inactiveBadgeText: {
    fontSize: isTablet ? 10 : isSmallDevice ? 8 : 9,
    color: colors.white,
    fontWeight: "700" as const,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: isTablet ? 16 : isSmallDevice ? 12 : 14,
  },
  userNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: isTablet ? 16 : isSmallDevice ? 12 : 14,
  },
  userIconContainer: {
    width: isTablet ? 48 : isSmallDevice ? 36 : 44,
    height: isTablet ? 48 : isSmallDevice ? 36 : 44,
    borderRadius: isTablet ? 16 : 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 16 : isSmallDevice ? 12 : 14,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    backgroundColor: colors.white,
  },
  userIconText: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: isTablet ? 20 : isSmallDevice ? 16 : 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: isTablet ? 6 : isSmallDevice ? 4 : 5,
  },
  userRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    paddingHorizontal: isTablet ? 12 : isSmallDevice ? 8 : 10,
    paddingVertical: isTablet ? 6 : isSmallDevice ? 4 : 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  userRoleText: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  balanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isTablet ? 16 : isSmallDevice ? 10 : 12,
    paddingVertical: isTablet ? 10 : isSmallDevice ? 6 : 8,
    borderRadius: isTablet ? 16 : 12,
    gap: isTablet ? 8 : isSmallDevice ? 4 : 6,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    backgroundColor: colors.white,
  },
  balanceText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    fontWeight: "800" as const,
    letterSpacing: 0.3,
  },
  userDetails: {
    gap: isTablet ? 12 : isSmallDevice ? 8 : 10,
    marginBottom: isTablet ? 20 : isSmallDevice ? 14 : 16,
  },
  userDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: colors.gray600,
    marginLeft: isTablet ? 12 : isSmallDevice ? 8 : 10,
    flex: 1,
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: isTablet ? 16 : isSmallDevice ? 8 : 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isTablet ? 10 : isSmallDevice ? 4 : 6,
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 12 : 16,
    paddingVertical: isTablet ? 14 : isSmallDevice ? 10 : 12,
    borderRadius: isTablet ? 12 : 8,
  },
  editButton: {
    backgroundColor: colors.primary + "10",
  },
  deleteButtonStyle: {
    backgroundColor: colors.red + "10",
  },
  restoreButton: {
    backgroundColor: colors.green + "10",
  },
  actionButtonText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    fontWeight: "600" as const,
  },
  editButtonText: {
    color: colors.primary,
  },
  deleteButtonText: {
    color: colors.red,
  },
  restoreButtonText: {
    color: colors.green,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: isTablet ? 80 : isSmallDevice ? 60 : 70,
    backgroundColor: colors.white,
    borderRadius: isTablet ? 20 : 16,
    marginTop: isTablet ? 40 : isSmallDevice ? 20 : 30,
    borderWidth: 2,
    borderColor: colors.primary + "20",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: isTablet ? 24 : isSmallDevice ? 18 : 22,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: isTablet ? 24 : isSmallDevice ? 16 : 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.gray500,
    marginTop: isTablet ? 8 : isSmallDevice ? 6 : 7,
    textAlign: "center",
    opacity: 0.8,
    paddingHorizontal: isTablet ? 40 : isSmallDevice ? 20 : 30,
  },
  emptyButton: {
    marginTop: isTablet ? 32 : isSmallDevice ? 20 : 24,
    backgroundColor: colors.primary,
    paddingHorizontal: isTablet ? 32 : isSmallDevice ? 20 : 24,
    paddingVertical: isTablet ? 18 : isSmallDevice ? 14 : 16,
    borderRadius: isTablet ? 16 : 12,
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 10 : isSmallDevice ? 6 : 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    color: "white",
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  footerLoader: {
    padding: isTablet ? 28 : isSmallDevice ? 16 : 20,
    alignItems: "center",
  },
  loadingMoreText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: colors.gray500,
    fontWeight: "500" as const,
    marginTop: isTablet ? 16 : isSmallDevice ? 8 : 12,
  },
});
