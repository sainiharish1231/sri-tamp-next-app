"use client";

import { colors } from "@/colors";
import PartyService from "@/services/PartyService";
import UserService from "@/services/UserService";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId, extractUserId, getAccessFlags } from "@/utils/access";
import { useLocalSearchParams } from "@/compat/expo-router";
import {
  Activity,
  Box,
  Building2,
  ChevronRight,
  IdCard,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MessageSquareText,
  Package,
  PencilLine,
  Phone,
  RefreshCw,
  ShoppingBag,
  UserCog,
  Users,
  WalletMinimal,
  } from "lucide-react";
import { useCallback,
  useMemo,
  useState } from "react";
import {
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuItem = {
  title: string;
  description: string;
  href: Href;
  icon: ({ color, size }: { color: string; size: number }) => any;
  order?: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;

const formatRole = (role?: string | null) => {
  const { isAdmin, isInternalUser, isParty } = getAccessFlags(role);
  if (isAdmin) return "Administrator";
  if (isInternalUser) return "Internal User";
  if (isParty) return "Party User";
  return "User";
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "Not set";
};

const mergeDefinedUser = (base: any, incoming: any) => {
  const next = { ...(base || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      next[key] = value;
    }
  });
  return next;
};

const extractUserPayload = (response: any) => {
  const candidates = [
    response?.data?.data,
    response?.data?.user,
    response?.data,
    response?.user,
    response,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate[0] || null;
    if (!candidate || typeof candidate !== "object") continue;
    if (candidate.user && typeof candidate.user === "object") {
      return candidate.user;
    }
    return candidate;
  }

  return null;
};

const buildPartyBackedUser = (
  user: any,
  party: any,
  fallbackPartyId: string,
) => {
  if (!party) return user;

  const partyId = String(
    party?.id || party?._id || extractPartyId(party) || fallbackPartyId || "",
  );

  return mergeDefinedUser(user, {
    party,
    partyId,
    partyName: party?.name,
    phone: user?.phone || party?.mobile || party?.phone,
    email: user?.email || party?.email,
    address: user?.address || party?.address,
    currentBalance:
      party?.currentBalance ??
      user?.currentBalance ??
      party?.balance ??
      party?.openingBalance,
    balance: party?.currentBalance ?? user?.balance ?? party?.balance,
    openingBalance: user?.openingBalance ?? party?.openingBalance,
    balanceType: user?.balanceType ?? party?.balanceType,
  });
};

export default function MenuScreen() {
  const router = useRouter();
  const { session, clearSession } = useAuthStore();
  const sessionUser = session?.user;
  const sessionUserId = extractUserId(sessionUser);
  const sessionPartyId = extractPartyId(sessionUser);
  const [profileUser, setProfileUser] = useState<any>(sessionUser || null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const displayUser = profileUser || sessionUser || {};
  const roleLabel = formatRole(displayUser?.role || sessionUser?.role);
  const {
    isAdmin,
    isParty,
    canManageParties,
    canManageEmployees,
    canManageUsers,
    canViewOrders,
    canViewProducts,
    canViewTransactions,
    canViewActivities,
  } = getAccessFlags(displayUser?.role || sessionUser?.role);

  const balanceValue = toNumber(
    displayUser?.currentBalance ??
      displayUser?.balance ??
      displayUser?.openingBalance,
  );
  const userInitial = firstText(displayUser?.name, displayUser?.phone, "User")
    .charAt(0)
    .toUpperCase();

  const loadProfile = useCallback(
    async (showRefresh = false) => {
      if (!sessionUser) {
        setProfileUser(null);
        return;
      }

      setProfileError("");
      setProfileLoading(!showRefresh);
      setRefreshing(showRefresh);

      try {
        let fetchedUser: any = null;
        let fetchedParty: any = null;

        if (sessionUserId) {
          const response = await UserService.fetchUserById(sessionUserId);
          fetchedUser = extractUserPayload(response);
        }

        if (!fetchedUser && sessionPartyId) {
          const response = await UserService.fetchUserByPartyId(sessionPartyId);
          fetchedUser = extractUserPayload(response);
        }

        if (sessionPartyId) {
          try {
            const response =
              await PartyService.fetchPartyWithBankDetails(sessionPartyId);
            fetchedParty = PartyService.extractParty(response);
          } catch (error) {
            console.log("[Menu] Failed to fetch party profile:", error);
          }
        }

        const mergedUser = mergeDefinedUser(sessionUser, fetchedUser);
        const partyBackedUser = buildPartyBackedUser(
          mergedUser,
          fetchedParty,
          sessionPartyId,
        );
        const mergedPartyId = extractPartyId(partyBackedUser) || sessionPartyId;

        setProfileUser({
          ...partyBackedUser,
          partyId: mergedPartyId,
        });
      } catch (error) {
        console.log("[Menu] Failed to fetch profile user:", error);
        setProfileUser(sessionUser);
        setProfileError("Showing saved profile data");
      } finally {
        setProfileLoading(false);
        setRefreshing(false);
      }
    },
    [sessionPartyId, sessionUser, sessionUserId],
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const menuItems = useMemo(() => {
    const items: MenuItem[] = [
      {
        title: "Dashboard",
        description: "Overview and latest activity",
        href: "/" as Href,
        icon: ({ color, size }) => (
          <LayoutDashboard color={color} size={size} />
        ),
        order: 1,
      },
    ];

    if (canViewProducts) {
      items.push({
        title: "Products",
        description: "Catalogue, rates and stock",
        href: "/products" as Href,
        icon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        order: 2,
      });
    }

    if (canManageParties) {
      items.push({
        title: "Parties",
        description: "Customers and party accounts",
        href: "/parties" as Href,
        icon: ({ color, size }) => <Users color={color} size={size} />,
        order: 3,
      });
    }

    if (canViewOrders) {
      items.push({
        title: "Orders",
        description: "Create and track orders",
        href: "/orders" as Href,
        icon: ({ color, size }) => <Box color={color} size={size} />,
        order: 4,
      });
    }

    if (canViewTransactions) {
      items.push(
        {
          title: "Material Transaction",
          description: "Issue and receive metal",
          href: "/material-transaction" as Href,
          icon: ({ color, size }) => <Package color={color} size={size} />,
          order: 5,
        },
        {
          title: "Financial Transaction",
          description: "Payments and balances",
          href: "/financial-transaction" as Href,
          icon: ({ color, size }) => (
            <WalletMinimal color={color} size={size} />
          ),
          order: 6,
        },
      );
    }

    if (canViewActivities) {
      items.push({
        title: "Activities",
        description: "Latest workspace changes",
        href: "/activities" as Href,
        icon: ({ color, size }) => <Activity color={color} size={size} />,
        order: 7,
      });
    }

    if (isAdmin) {
      items.push(
        {
          title: "Expenses",
          description: "Business expense entries",
          href: "/expense" as Href,
          icon: ({ color, size }) => <IndianRupee color={color} size={size} />,
          order: 8,
        },
        {
          title: "Enquiry",
          description: "Incoming customer enquiries",
          href: "/enquiry" as Href,
          icon: ({ color, size }) => (
            <MessageSquareText color={color} size={size} />
          ),
          order: 10,
        },
      );
    }

    if (canManageEmployees) {
      items.push({
        title: "Employees",
        description: "Attendance and salary tracking",
        href: "/employees" as Href,
        icon: ({ color, size }) => <UserCog color={color} size={size} />,
        order: 9,
      });
    }

    if (canManageUsers) {
      items.push({
        title: "Users",
        description: "Staff and login access",
        href: "/users" as Href,
        icon: ({ color, size }) => <UserCog color={color} size={size} />,
        order: 11,
      });
    }

    return items.sort((a, b) => (a.order || 99) - (b.order || 99));
  }, [
    canManageParties,
    canManageEmployees,
    canManageUsers,
    canViewOrders,
    canViewProducts,
    canViewTransactions,
    canViewActivities,
    isAdmin,
  ]);

  const handleRefresh = useCallback(() => {
    loadProfile(true);
  }, [loadProfile]);

  const logoutUser = useCallback(async () => {
    await clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.confirm("Are you sure you want to logout?")) {
        void logoutUser();
      }
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          void logoutUser();
        },
      },
    ]);
  }, [logoutUser]);

  const phone = firstText(displayUser?.phone, displayUser?.mobile);
  const email = firstText(displayUser?.email);
  const address = firstText(displayUser?.address, displayUser?.party?.address);
  const userId = firstText(extractUserId(displayUser));
  const partyId = extractPartyId(displayUser);
  const linkedParty = displayUser?.party || (partyId ? displayUser : null);
  const linkedPartyId = partyId || extractPartyId(linkedParty);
  const linkedPartyBalance = toNumber(
    linkedParty?.currentBalance ??
      linkedParty?.balance ??
      displayUser?.currentBalance ??
      displayUser?.balance,
  );

  const infoTiles = [
    { icon: Phone, label: "Phone", value: phone },
    { icon: Mail, label: "Email", value: email },
    { icon: MapPin, label: "Address", value: address },
    { icon: IdCard, label: "User ID", value: userId },
    ...(partyId
      ? [{ icon: Building2, label: "Party ID", value: partyId }]
      : []),
  ];

  return (
    <SafeAreaView className="account-page">
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="account-hero"
        style={{
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <div className="account-hero-row">
          <div className="account-hero-copy">
            <span className="account-hero-title">
              Menu
            </span>
            <span className="account-hero-subtitle">
              {isParty ? "Orders, payments & profile" : "Workspace & account"}
            </span>
          </div>

          <TouchableOpacity
            className="account-refresh-button"
            activeOpacity={0.7}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <RefreshCw color="#ffffff" size={20} />
            )}
          </TouchableOpacity>
        </div>
      </LinearGradient>

      <ScrollView
        className="account-scroll"
        contentContainerStyle={{ paddingHorizontal: 2, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={20}
          />
        }
      >
        {/* Profile Card */}
        <div
          className="account-card account-profile-card"
          style={webStyle({
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 5,
          })}
        >
          {/* Profile Header */}
          <div className="account-profile-head">
            <LinearGradient
              colors={[colors.primary, colors.purple]}
              className="account-avatar"
            >
              {profileLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <span className="account-avatar-text">
                  {userInitial}
                </span>
              )}
            </LinearGradient>

            <div className="account-profile-copy">
              <span className="account-profile-name">
                {firstText(displayUser?.name, "User")}
              </span>
              <div className="account-badge-row">
                <div className="account-role-badge">
                  <span>
                    {roleLabel}
                  </span>
                </div>
                <div className="account-status-pill">
                  <div
                    className={`account-status-dot ${
                      profileError ? "bg-yellow-500" : "bg-green-500"
                    }`}
                  />
                  <span
                    className={`account-status-text ${
                      profileError ? "text-yellow-600" : "text-green-600"
                    }`}
                  >
                    {profileError || "Active"}
                  </span>
                </div>
              </div>
            </div>
            <TouchableOpacity
              className="account-edit-button"
              activeOpacity={0.75}
              onPress={() => router.push("/menu/profile-edit" as Href)}
            >
              <PencilLine color={colors.primary} size={18} />
            </TouchableOpacity>
          </div>

          {/* Balance Section */}
          <div className="account-balance-row">
            <div className="account-balance-item">
              <span className="account-section-kicker">
                Current Balance
              </span>
              <span
                className={`account-balance-value ${
                  balanceValue < 0 ? "text-red-500" : "text-green-700"
                }`}>
                {formatCurrency(balanceValue)}
              </span>
            </div>
            <div className="account-balance-divider" />
            <div className="account-balance-item">
              <span className="account-section-kicker">
                Account Status
              </span>
              <div className="account-status-row">
                <div className="account-small-icon">
                  <Activity
                    color={balanceValue >= 0 ? "#059669" : "#DC2626"}
                    size={16}
                  />
                </div>
                <span
                  className={`account-status-label ${
                    balanceValue >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {balanceValue >= 0 ? "Active" : "Overdue"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="account-info-section">
            <span className="account-section-kicker">
              Contact Details
            </span>
            <div className="account-info-grid">
              {infoTiles.map((tile, index) => (
                <div key={index} className="account-info-tile">
                  <div className="account-info-icon">
                      <tile.icon color={colors.primary} size={16} />
                  </div>
                  <div className="account-info-copy">
                      <span className="account-info-label">
                        {tile.label}
                      </span>
                      <span className="account-info-value">
                        {tile.value}
                      </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="account-card account-action-panel"
          style={webStyle({
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.06,
            shadowRadius: 20,
            elevation: 4,
          })}
        >
          <div className="account-card-header">
            <span className="account-card-title">
              Quick Actions
            </span>
            <span className="account-card-subtitle">
              Frequently used features
            </span>
          </div>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              className={`account-action-row ${
                index !== menuItems.length - 1 ? "is-separated" : ""
              } hover:bg-purple-50/60 active:bg-purple-50`}
              activeOpacity={0.7}
              onPress={() => router.push(item.href)}
            >
              <div className="account-action-icon">
                {item.icon({
                  color: colors.primary,
                  size: 22,
                })}
              </div>
              <div className="account-action-copy">
                <span className="account-action-title">
                  {item.title}
                </span>
                <span className="account-action-description">
                  {item.description}
                </span>
              </div>
              <ChevronRight color="#9CA3AF" size={20} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </div>

        {/* Logout Button */}
        <TouchableOpacity
          className="account-logout-button"
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <div className="account-logout-icon">
            <LogOut color="#DC2626" size={18} />
          </div>
          <span className="account-logout-text">Logout</span>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
