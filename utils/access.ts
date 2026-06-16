export type AppRole = "admin" | "internal_user" | "party";

export const normalizeRole = (role?: string | null): AppRole | null => {
  const value = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!value) return null;

  if (["admin", "super_admin", "superadmin"].includes(value)) {
    return "admin";
  }

  if (["internal_user", "internal", "assistant"].includes(value)) {
    return "internal_user";
  }

  if (["party", "parties", "party_user", "user"].includes(value)) {
    return "party";
  }

  return null;
};

export const extractPartyId = (user?: any): string => {
  return String(
    user?.partyId ||
      user?.partyID ||
      user?.party_id ||
      user?.party?.id ||
      user?.party?._id ||
      user?.party?.partyId ||
      user?.party?.partyID ||
      "",
  );
};

export const extractUserId = (user?: any): string => {
  return String(user?.id || user?._id || user?.userId || "");
};

export const extractOrderOwnerUserId = (order?: any): string => {
  return String(
    order?.internalUserId ||
      order?.userId ||
      order?.createdById ||
      order?.assignedUserId ||
      order?.internalUser?.id ||
      order?.internalUser?._id ||
      order?.assignedUser?.id ||
      order?.assignedUser?._id ||
      order?.createdBy?.id ||
      order?.createdBy?._id ||
      "",
  );
};

export const getAccessFlags = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  const isAdmin = normalizedRole === "admin";
  const isInternalUser = normalizedRole === "internal_user";
  const isParty = normalizedRole === "party";

  return {
    role: normalizedRole,
    isAdmin,
    isInternalUser,
    isParty,
    canManageProducts: isAdmin || isInternalUser,
    canViewProducts: isAdmin || isInternalUser || isParty,
    canViewOrders: isAdmin || isInternalUser || isParty,
    canViewTransactions: isAdmin || isInternalUser || isParty,
    canViewActivities: isAdmin || isInternalUser,
    canManageUsers: isAdmin,
    canManageParties: isAdmin,
    canManageEmployees: isAdmin || isInternalUser,
    canViewSensitiveData: isAdmin || isParty,
  };
};
