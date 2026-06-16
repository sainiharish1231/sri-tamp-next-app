"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  webStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import UserService from "@/services/UserService";
import CountriesService from "@/services/CountriesService";
import PartyService from "@/services/PartyService";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { colors } from "@/colors";
import Toast from "@/utils/Toast";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDeviceMetrics } from "@/utils/responsive";
import { extractArrayPayload, extractEntityPayload } from "@/utils/response";

const { isXs: isSmallDevice, isMd: isTablet } = getDeviceMetrics();

const ROLE_DETAILS: Record<
  string,
  {
    icon: string;
    label: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  admin: {
    icon: "shield",
    label: "Admin",
    color: colors.primary,
    bgColor: colors.primary + "15",
    description: "Full system access and control",
  },
  internal_user: {
    icon: "person",
    label: "Internal User",
    color: colors.blue,
    bgColor: colors.blue + "15",
    description: "Can manage users and view reports",
  },
  user: {
    icon: "person-circle",
    label: "User",
    color: colors.primary,
    bgColor: colors.primary + "15",
    description: "Standard user account",
  },
  party: {
    icon: "people",
    label: "Party",
    color: colors.green,
    bgColor: colors.green + "15",
    description: "Regular customer/party account",
  },
};

export default function UserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [showFullId, setShowFullId] = useState(false);
  const [linkedParty, setLinkedParty] = useState<any | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response: any = await CountriesService.fetchAllCategory();
        setCountries(extractArrayPayload<any>(response));
      } catch (error) {
        console.error("[UserDetail] Failed to fetch countries:", error);
      }
    };
    fetchCountries();
  }, []);

  const getLinkedPartyId = (userData?: any) =>
    String(
      userData?.partyId ||
        userData?.party?.id ||
        userData?.party?._id ||
        userData?.party?.partyId ||
        "",
    );

  const fetchLinkedParty = async (userData: any) => {
    const directParty =
      userData?.party && typeof userData.party === "object"
        ? userData.party
        : null;
    const directPartyId = getLinkedPartyId(userData);

    if (directPartyId) {
      try {
        const partyRes =
          await PartyService.fetchPartyWithBankDetails(directPartyId);
        setLinkedParty(
          PartyService.extractParty<any>(partyRes) || directParty || null,
        );
        return;
      } catch (error) {
        console.log("[UserDetail] Failed to fetch linked party:", error);
        setLinkedParty(directParty);
        return;
      }
    }

    const userId = String(userData?.id || userData?._id || id || "");
    if (!userId) {
      setLinkedParty(directParty);
      return;
    }

    try {
      const partyListRes = await PartyService.fetchAllParty({
        params: { userId, limit: 100 },
      });
      const parties = PartyService.extractPartyList<any>(partyListRes);
      const matchedParty = parties.find(
        (party) => String(party?.userId || party?.user?.id || "") === userId,
      );

      if (matchedParty?.id) {
        const partyRes = await PartyService.fetchPartyWithBankDetails(
          matchedParty.id,
        );
        setLinkedParty(
          PartyService.extractParty<any>(partyRes) || matchedParty,
        );
      } else {
        setLinkedParty(matchedParty || directParty);
      }
    } catch (error) {
      console.log("[UserDetail] Failed to resolve linked party:", error);
      setLinkedParty(directParty);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await UserService.fetchUserById(id!);
      console.log("[UserDetail] Fetch response:", JSON.stringify(response));
      const userData = extractEntityPayload<any>(response);
      if (response.success && userData) {
        setUser(userData);
        await fetchLinkedParty(userData);
      } else {
        setLinkedParty(null);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load user",
        });
        router.back();
      }
    } catch (error: any) {
      setLinkedParty(null);
      console.error("[UserDetail] Fetch user error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load user",
      });
      router.back();
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchUserData();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const getCountry = (userData?: any): any | undefined => {
    if (!userData || !countries.length) return undefined;
    return countries.find(
      (c) =>
        c.id === userData.countryId ||
        c.code === userData.countryCode ||
        c.dialling_code === userData.diallingCode,
    );
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    try {
      const seconds = timestamp?._seconds ?? timestamp?.seconds;
      const date =
        typeof seconds === "number"
          ? new Date(seconds * 1000)
          : new Date(timestamp);
      if (Number.isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = () => {
    router.push(`/users/edit/${id}` as any);
  };

  const confirmDelete = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      const res = await UserService.deleteUser(id!);
      if (res.success) {
        Toast.show({
          type: "success",
          text1: "Deleted",
          text2: res.message || "User deleted successfully",
        });
        setDeleteModalVisible(false);
        setTimeout(() => router.back(), 500);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: res.message || "Failed to delete user",
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
    }
  };

  const InfoRow = ({
    icon,
    label,
    value,
    color: iconColor = colors.primary,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <div style={webStyle(styles.infoRow)}>
      <div
        style={webStyle([
          styles.infoIconContainer,
          { backgroundColor: iconColor + "10" },
        ])}
      >
        <Ionicons name={icon} size={isTablet ? 22 : 18} color={iconColor} />
      </div>
      <div style={webStyle(styles.infoContent)}>
        <span style={webStyle(styles.infoLabel)}>{label}</span>
        <span style={webStyle(styles.infoValue)}>{value}</span>
      </div>
    </div>
  );

  const StatCard = ({
    title,
    value,
    icon,
    color: cardColor = colors.primary,
  }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
  }) => (
    <div style={webStyle([styles.quickStatCard, { borderLeftColor: cardColor }])}>
      <div style={webStyle(styles.statHeader)}>
        <Ionicons name={icon} size={isTablet ? 24 : 20} color={cardColor} />
        <span style={webStyle(styles.statTitle)}>{title}</span>
      </div>
      <span style={webStyle(styles.quickStatValue)}>
        {value}
      </span>
    </div>
  );

  const DetailSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div style={webStyle(styles.section)}>
      <span style={webStyle(styles.sectionTitle)}>{title}</span>
      <div style={webStyle(styles.sectionContent)}>{children}</div>
    </div>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>User Profile</span>
          <div style={webStyle(styles.headerPlaceholder)} />
        </div>
        <div style={webStyle(styles.loadingContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>Loading user details...</span>
        </div>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>User Profile</span>
          <div style={webStyle(styles.headerPlaceholder)} />
        </div>
        <div style={webStyle(styles.errorContainer)}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.red} />
          <span style={webStyle(styles.errorTitle)}>User Not Found</span>
          <span style={webStyle(styles.errorText)}>
            The user {"you're"} looking for {"doesn't"} exist or has been deleted.
          </span>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <span style={webStyle(styles.errorButtonText)}>Go Back</span>
          </TouchableOpacity>
        </div>
      </SafeAreaView>
    );
  }

  const country = getCountry(user);
  const roleDetail = ROLE_DETAILS[user.role] || ROLE_DETAILS.internal_user;
  const linkedPartyId = String(
    linkedParty?.id || linkedParty?._id || getLinkedPartyId(user),
  );
  const balance = Number(
    linkedParty?.currentBalance ??
      linkedParty?.balance ??
      user.balance ??
      user.currentBalance ??
      0,
  );
  const userIdText = String(user.id || user._id || id || "");
  const businessGst = linkedParty?.gstNumber || user.gstNumber;
  const businessPan = linkedParty?.panNumber || user.panNumber;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <span style={webStyle(styles.headerTitle)}>User Profile</span>
        <TouchableOpacity onPress={handleEdit} style={styles.editHeaderButton}>
          <Ionicons name="create" size={22} color="white" />
        </TouchableOpacity>
      </div>

      <ScrollView
        style={styles.contentScroll}
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
        {country ? (
          <div style={webStyle(styles.countryBadge)}>
            <span style={webStyle(styles.countryBadgeText)}>
              {country.flag} {country.name} {country.dialling_code}
            </span>
          </div>
        ) : null}

        <div style={webStyle(styles.profileHeader)}>
          <div
            style={webStyle([
              styles.avatarContainer,
              { backgroundColor: roleDetail.bgColor },
            ])}
          >
            <span style={webStyle(styles.avatarText)}>{getInitials(user.name || "User")}</span>
          </div>
          <div style={webStyle(styles.profileInfo)}>
            <span style={webStyle(styles.profileUserName)}>{user.name || "User"}</span>
            <div
              style={webStyle([
                styles.roleBadge,
                { backgroundColor: roleDetail.bgColor },
              ])}
            >
              <Ionicons
                name={roleDetail.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={roleDetail.color}
              />
              <span style={webStyle([styles.roleText, { color: roleDetail.color }])}>
                {roleDetail.label}
              </span>
            </div>
          </div>
        </div>

        <div style={webStyle(styles.balanceCard)}>
          <div style={webStyle(styles.balanceHeader)}>
            <span style={webStyle(styles.balanceLabel)}>Current Balance</span>
            <Ionicons
              name={balance >= 0 ? "trending-up" : "trending-down"}
              size={24}
              color={balance >= 0 ? colors.green : colors.red}
            />
          </div>
          <span
            style={webStyle([
              styles.balanceAmount,
              { color: balance >= 0 ? colors.green : colors.red },
            ])}
          >
            {formatCurrency(balance)}
          </span>
          <span style={webStyle(styles.balanceSubtext)}>
            {balance >= 0 ? "Receivable" : "Payable"}
          </span>
        </div>

        <div style={webStyle(styles.statsGrid)}>
          <StatCard
            title="User ID"
            value={showFullId ? userIdText : `${userIdText.slice(0, 8)}...`}
            icon="finger-print"
            color={colors.blue}
          />
          {user.partyId ? (
            <StatCard
              title="Party ID"
              value={
                showFullId ? user.partyId : `${user.partyId.slice(0, 8)}...`
              }
              icon="business"
              color={colors.primary}
            />
          ) : null}
          <TouchableOpacity
            style={styles.showIdButton}
            onPress={() => setShowFullId(!showFullId)}
          >
            <Ionicons
              name={showFullId ? "eye-off" : "eye"}
              size={20}
              color={colors.primary}
            />
            <span style={webStyle(styles.showIdText)}>
              {showFullId ? "Hide Full IDs" : "Show Full IDs"}
            </span>
          </TouchableOpacity>
        </div>

        <DetailSection title="Contact Information">
          <InfoRow
            icon="call"
            label="Phone Number"
            value={
              country
                ? `${country.flag} ${user.diallingCode || country.dialling_code} ${user.phone}`
                : `${user.diallingCode || ""} ${user.phone || ""}`.trim()
            }
            color={colors.green}
          />
          {user.email ? (
            <InfoRow
              icon="mail"
              label="Email"
              value={user.email}
              color={colors.blue}
            />
          ) : null}
          {user.address ? (
            <InfoRow
              icon="location"
              label="Address"
              value={user.address}
              color={colors.red}
            />
          ) : null}
        </DetailSection>

        <DetailSection title="Business Information">
          {businessGst || businessPan ? (
            <>
              {businessGst ? (
                <InfoRow
                  icon="document-text"
                  label="GST Number"
                  value={businessGst}
                  color={colors.red}
                />
              ) : null}
              {businessPan ? (
                <InfoRow
                  icon="card"
                  label="PAN Number"
                  value={businessPan}
                  color={colors.blue}
                />
              ) : null}
            </>
          ) : (
            <span style={webStyle(styles.noDataText)}>No business information</span>
          )}
        </DetailSection>

        {linkedParty ? (
          <DetailSection title="Linked Party Details">
            <InfoRow
              icon="business"
              label="Party Name"
              value={linkedParty.name || user.partyName || "N/A"}
              color={colors.primary}
            />
            {linkedParty.contactPerson || linkedParty.userName ? (
              <InfoRow
                icon="person"
                label="Contact Person"
                value={linkedParty.contactPerson || linkedParty.userName}
                color={colors.blue}
              />
            ) : null}
            <InfoRow
              icon="call"
              label="Party Mobile"
              value={`${linkedParty.diallingCode || user.diallingCode || ""} ${
                linkedParty.mobile || linkedParty.phone || user.phone || ""
              }`.trim()}
              color={colors.green}
            />
            <InfoRow
              icon="wallet"
              label="Party Balance"
              value={formatCurrency(
                Number(linkedParty.currentBalance ?? linkedParty.balance ?? 0),
              )}
              color={
                Number(linkedParty.currentBalance ?? linkedParty.balance ?? 0) < 0
                  ? colors.red
                  : colors.green
              }
            />
            {linkedParty.bankName || linkedParty.accountNumber ? (
              <InfoRow
                icon="card"
                label="Bank Account"
                value={[
                  linkedParty.bankName,
                  linkedParty.accountNumber,
                  linkedParty.ifscCode,
                ]
                  .filter(Boolean)
                  .join(" • ")}
                color={colors.primary}
              />
            ) : null}
            {linkedPartyId ? (
              <TouchableOpacity
                style={[
                  styles.fullActionButton,
                  styles.editFullButton,
                  styles.partyEditButton,
                ]}
                onPress={() => router.push(`/parties/edit/${linkedPartyId}` as any)}
              >
                <Ionicons name="create" size={20} color="white" />
                <span style={webStyle(styles.fullActionButtonText)}>Edit Party</span>
              </TouchableOpacity>
            ) : null}
          </DetailSection>
        ) : null}

        <DetailSection title="Account Details">
          <InfoRow
            icon={user.isActive === false ? "close-circle" : "checkmark-circle"}
            label="Status"
            value={user.isActive === false ? "Inactive" : "Active"}
            color={user.isActive === false ? colors.red : colors.green}
          />
          <InfoRow
            icon="calendar"
            label="Created On"
            value={formatDate(user.createdAt)}
            color={colors.primary}
          />
          {user.updatedAt ? (
            <InfoRow
              icon="refresh"
              label="Last Updated"
              value={formatDate(user.updatedAt)}
              color={colors.primary}
            />
          ) : null}
          <InfoRow
            icon="key"
            label="User Role"
            value={roleDetail.description}
            color={roleDetail.color}
          />
        </DetailSection>

        <div style={webStyle(styles.actionButtonsContainer)}>
          <TouchableOpacity
            style={[styles.fullActionButton, styles.editFullButton]}
            onPress={handleEdit}
          >
            <Ionicons name="create" size={20} color="white" />
            <span style={webStyle(styles.fullActionButtonText)}>Edit User</span>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fullActionButton, styles.deleteFullButton]}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash" size={20} color="white" />
            <span style={webStyle(styles.fullActionButtonText)}>Delete User</span>
          </TouchableOpacity>
        </div>

        <div style={webStyle({ height: 40 })} />
      </ScrollView>

      <DeleteConfirmModal
        visible={deleteModalVisible}
        message="Are you sure you want to delete this user? This action cannot be undone."
        itemName={user.name}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </SafeAreaView>
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
    paddingVertical: isTablet ? 20 : isSmallDevice ? 12 : 16,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  editHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    fontSize: isTablet ? 24 : isSmallDevice ? 18 : 20,
    fontWeight: "700" as const,
    color: "white",
  },
  headerPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.gray500,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: isTablet ? 40 : 20,
  },
  errorTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: isTablet ? 16 : 14,
    color: colors.gray500,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.8,
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 16 : 20,
  },
  countryBadge: {
    backgroundColor: colors.primary + "10",
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 10 : 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: isTablet ? 20 : 16,
    marginBottom: isTablet ? 16 : 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  countryBadgeText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isTablet ? 24 : 20,
  },
  avatarContainer: {
    width: isTablet ? 80 : isSmallDevice ? 60 : 70,
    height: isTablet ? 80 : isSmallDevice ? 60 : 70,
    borderRadius: isTablet ? 40 : isSmallDevice ? 30 : 35,
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 20 : 16,
    borderWidth: 3,
    borderColor: colors.primary + "30",
  },
  avatarText: {
    fontSize: isTablet ? 32 : isSmallDevice ? 24 : 28,
    fontWeight: "700" as const,
    color: colors.text,
  },
  profileInfo: {
    flex: 1,
  },
  profileUserName: {
    fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
    fontWeight: "800" as const,
    color: colors.text,
    marginBottom: isTablet ? 8 : 4,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    fontWeight: "600" as const,
  },
  balanceCard: {
    backgroundColor: colors.white,
    borderRadius: isTablet ? 24 : 20,
    padding: isTablet ? 24 : 20,
    marginBottom: isTablet ? 24 : 20,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isTablet ? 12 : 8,
  },
  balanceLabel: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: colors.gray500,
    fontWeight: "600" as const,
  },
  balanceAmount: {
    fontSize: isTablet ? 40 : isSmallDevice ? 28 : 36,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  balanceSubtext: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: colors.gray500,
    marginTop: isTablet ? 4 : 2,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isTablet ? 16 : 12,
    marginBottom: isTablet ? 24 : 20,
  },
  quickStatCard: {
    flex: 1,
    minWidth: isTablet ? 200 : isSmallDevice ? 140 : 160,
    backgroundColor: colors.white,
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 20 : 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 10 : 8,
    marginBottom: isTablet ? 12 : 8,
  },
  statTitle: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: colors.gray500,
    fontWeight: "600" as const,
    opacity: 0.8,
  },
  quickStatValue: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  showIdButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary + "10",
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 12 : 10,
    borderRadius: isTablet ? 16 : 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    width: "100%",
    marginTop: isTablet ? 8 : 4,
  },
  showIdText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  section: {
    marginBottom: isTablet ? 28 : 24,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : isSmallDevice ? 16 : 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: isTablet ? 16 : 12,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 20 : 16,
    borderWidth: 1,
    borderColor: colors.primary + "20",
    gap: isTablet ? 16 : 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: isTablet ? 48 : 40,
    height: isTablet ? 48 : 40,
    borderRadius: isTablet ? 16 : 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: isTablet ? 16 : 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: colors.gray500,
    fontWeight: "600" as const,
    marginBottom: 4,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.text,
    fontWeight: "500" as const,
  },
  noDataText: {
    fontSize: isTablet ? 16 : 14,
    color: colors.gray400,
    fontStyle: "italic",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: isTablet ? 16 : 12,
    marginVertical: isTablet ? 24 : 20,
  },
  fullActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isTablet ? 10 : 8,
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: isTablet ? 16 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editFullButton: {
    backgroundColor: colors.primary,
  },
  deleteFullButton: {
    backgroundColor: colors.red,
  },
  partyEditButton: {
    flex: 0,
    marginTop: isTablet ? 4 : 2,
  },
  fullActionButtonText: {
    color: "white",
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
});
